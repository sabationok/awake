import CoreBluetooth

/// Bluetooth-пристрої поруч для модуля «Поруч». Аппка лише бачить і згладжує сигнал, а коли блокувати, вирішує агент.
/// CBCentralManager створюється лише на вимогу: саме він показує системний запит доступу до Bluetooth.
@MainActor
final class BluetoothScanner: NSObject, CBCentralManagerDelegate {
    struct Device: Encodable, Equatable {
        let id: String
        let name: String
        let rssi: Double
    }

    struct Report: Encodable {
        let bluetooth: String
        let devices: [Device]
    }

    private struct Sighting {
        var name: String?
        var samples: [Double]
        var lastSeen: Date
    }

    /// Пристрій, якого не чули стільки секунд, зникає зі звіту: агент рахує його «не видно».
    private static let forgetAfter: TimeInterval = 10
    private static let reportEvery: TimeInterval = 2
    /// Середнє з останніх вимірів: один провал сигналу не робить пристрій «далеким».
    private static let smoothing = 5
    private static let maxDevices = 25

    private var central: CBCentralManager?
    private var sightings: [UUID: Sighting] = [:]
    private var timer: Timer?
    private(set) var isEnabled = false
    /// Id вибраного пристрою з `proximity.device`: потрапляє у звіт, навіть якщо в нього немає назви.
    var target: String?
    var onReport: ((Report) -> Void)?
    var onAuthorizationChange: (() -> Void)?

    var isAuthorized: Bool { CBManager.authorization == .allowedAlways }
    var isDenied: Bool { [.denied, .restricted].contains(CBManager.authorization) }

    /// Перший виклик показує системний запит доступу.
    func requestAccess() {
        if central == nil { central = CBCentralManager(delegate: self, queue: nil) }
    }

    func setEnabled(_ enabled: Bool) {
        guard enabled != isEnabled else { return }
        isEnabled = enabled
        if enabled {
            requestAccess()
            startScanning()
            timer = Timer.scheduledTimer(withTimeInterval: Self.reportEvery, repeats: true) { [weak self] _ in
                Task { @MainActor in self?.report() }
            }
        } else {
            central?.stopScan()
            timer?.invalidate()
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
        switch central?.state {
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

    nonisolated func centralManagerDidUpdateState(_ central: CBCentralManager) {
        Task { @MainActor in
            self.onAuthorizationChange?()
            self.startScanning()
        }
    }

    nonisolated func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
                                    advertisementData: [String: Any], rssi RSSI: NSNumber) {
        let value = RSSI.doubleValue
        // 127 — сигнал невідомий.
        guard value < 0 else { return }
        let id = peripheral.identifier
        let name = peripheral.name ?? advertisementData[CBAdvertisementDataLocalNameKey] as? String
        Task { @MainActor in self.record(id: id, name: name, rssi: value) }
    }
}
