import AppKit
import SwiftUI

/// Сполучення нового пристрою (QR і посилання з одноразовим кодом) на сторінці «Web UI → Пристрої».
/// Список сполучених з відкликанням малює сервер.
struct DevicesSection: View {
    @EnvironmentObject private var model: AwakeModel

    var body: some View {
        Group {
            if let devices = model.devices {
                PairingCard(pairings: devices.pairing)
            } else {
                Section {
                    Text(agentRunning
                         ? "Завантаження…"
                         : "Агент не запущений. Пристрої і сполучення живуть в агенті.")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .onAppear { model.refreshDevices() }
    }

    private var agentRunning: Bool {
        if case .running = model.agentStatus { true } else { false }
    }
}
