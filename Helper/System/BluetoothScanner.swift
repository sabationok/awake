import CoreBluetooth
import Foundation

/// Bluetooth-пристрої поруч для модуля «Поруч». Помічник лише бачить і згладжує сигнал; сканувати чи ні і коли
/// блокувати, вирішує сервер (запит `bluetoothScan`). CBCentralManager створюється на першому ввімкненні:
/// саме він показує системний запит доступу до Bluetooth (один раз, поки дозвіл не визначено).
/// Працює на main-черзі, як і решта помічника.
final class BluetoothScanner: NSObject, CBCentralManagerDelegate {
    struct Device: Equatable {
        let id: String
        let name: String
        let rssi: Double
    }

    struct Report {
        let bluetooth: String
        let devices: [Device]

        var json: [String: Any] {
            ["bluetooth": bluetooth, "devices": devices.map { ["id": $0.id, "name": $0.name, "rssi": $0.rssi] }]
        }
    }

    private struct Sighting {
        var name: String?
        var samples: [Double]
        var lastSeen: Date
    }

    /// Пристрій, якого не чули стільки секунд, зникає зі звіту: сервер рахує його «не видно».
    private static let forgetAfter: TimeInterval = 10
    private static let reportEvery: TimeInterval = 2
    /// Середнє з останніх вимірів: один провал сигналу не робить пристрій «далеким».
    private static let smoothing = 5
    private static let maxDevices = 25

    private var central: CBCentralManager?
    private var sightings: [UUID: Sighting] = [:]
    private var timer: DispatchSourceTimer?
    private(set) var isEnabled = false
    /// Id вибраного пристрою (`proximity.device`): потрапляє у звіт, навіть якщо в нього немає назви.
    private var target: String?
    var onReport: ((Report) -> Void)?

    /// Увімкнути або вимкнути сканування. `target` — id вибраного пристрою, nil — не вибрано.
    func set(enabled: Bool, target: String?) {
        self.target = target
        guard enabled != isEnabled else { return }
        isEnabled = enabled
        if enabled {
            if central == nil { central = CBCentralManager(delegate: self, queue: .main) }
            startScanning()
            let timer = DispatchSource.makeTimerSource(queue: .main)
            timer.schedule(deadline: .now() + Self.reportEvery, repeating: Self.reportEvery)
            timer.setEventHandler { [weak self] in self?.report() }
            timer.resume()
            self.timer = timer
            report()
        } else {
            central?.stopScan()
            timer?.cancel()
            timer = nil
            sightings = [:]
        }
    }

    private func startScanning() {
        guard isEnabled, let central, central.state == .poweredOn, !central.isScanning else { return }
        // Дублікати потрібні: кожна реклама пристрою — новий вимір сигналу.
        central.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
    }

    private var bluetoothState: String {
        guard let central else { return CBManager.authorization == .allowedAlways ? "unknown" : "unauthorized" }
        return switch central.state {
        case .poweredOn: "on"
        case .poweredOff: "off"
        case .unauthorized: "unauthorized"
        case .unsupported: "unsupported"
        default: "unknown"
        }
    }

    private func report() {
        let now = Date()
        sightings = sightings.filter { now.timeIntervalSince($0.value.lastSeen) < Self.forgetAfter }
        let devices = sightings.compactMap { id, sighting -> Device? in
            let key = id.uuidString
            guard let name = sighting.name ?? (key == target ? "Пристрій" : nil), !sighting.samples.isEmpty else { return nil }
            let rssi = sighting.samples.reduce(0, +) / Double(sighting.samples.count)
            return Device(id: key, name: name, rssi: rssi.rounded())
        }
        .sorted { $0.rssi > $1.rssi }
        // Вибраний пристрій лишається у звіті, навіть коли поруч багато сильніших.
        var limited = Array(devices.prefix(Self.maxDevices))
        if let target, !limited.contains(where: { $0.id == target }), let chosen = devices.first(where: { $0.id == target }) {
            limited.append(chosen)
        }
        onReport?(Report(bluetooth: bluetoothState, devices: limited))
    }

    private func record(id: UUID, name: String?, rssi: Double) {
        var sighting = sightings[id] ?? Sighting(name: nil, samples: [], lastSeen: .now)
        if let name, !name.isEmpty { sighting.name = name }
        sighting.samples.append(rssi)
        if sighting.samples.count > Self.smoothing { sighting.samples.removeFirst(sighting.samples.count - Self.smoothing) }
        sighting.lastSeen = .now
        sightings[id] = sighting
    }

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        startScanning()
        if isEnabled { report() }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
                        advertisementData: [String: Any], rssi RSSI: NSNumber) {
        let value = RSSI.doubleValue
        // 127 — сигнал невідомий.
        guard value < 0 else { return }
        let name = peripheral.name ?? advertisementData[CBAdvertisementDataLocalNameKey] as? String
        record(id: peripheral.identifier, name: name, rssi: value)
    }
}
