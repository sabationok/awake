import AppKit
import SwiftUI

/// Сполучення нового пристрою (QR і посилання з одноразовим кодом) і список сполучених з відкликанням.
struct DevicesSection: View {
    @EnvironmentObject private var model: AwakeModel

    var body: some View {
        Group {
            if let devices = model.devices {
                PairingCard(pairings: devices.pairing)
                DeviceListSection(devices: devices.devices)
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

/// Сполучені браузери. Відкликаний одразу втрачає доступ і має сполучитись заново.
private struct DeviceListSection: View {
    @EnvironmentObject private var model: AwakeModel
    let devices: [AgentDevices.Device]
    @State private var revoking: AgentDevices.Device?

    var body: some View {
        Section {
            if devices.isEmpty {
                Text("Ще жоден пристрій не сполучений.").foregroundStyle(.secondary)
            }
            ForEach(devices) { device in
                HStack(spacing: 12) {
                    Image(systemName: Self.symbol(device.name))
                        .font(.title3)
                        .foregroundStyle(.secondary)
                        .frame(width: 24)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(device.name)
                        Text(Self.details(device))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .help(device.userAgent ?? "")
                    Spacer()
                    Button("Відкликати", role: .destructive) { revoking = device }
                }
            }
        } header: {
            Text("Сполучені пристрої")
        }
        .confirmationDialog(
            "Відкликати доступ для «\(revoking?.name ?? "")»?",
            isPresented: Binding(get: { revoking != nil }, set: { if !$0 { revoking = nil } }),
            presenting: revoking
        ) { device in
            Button("Відкликати", role: .destructive) { model.revokeDevice(device.id) }
        } message: { _ in
            Text("Пристрій одразу втратить доступ до пульта. Щоб повернути, його доведеться сполучити знову.")
        }
    }

    private static func symbol(_ name: String) -> String {
        if name.contains("iPhone") || name.contains("Android") { return "iphone" }
        if name.contains("iPad") { return "ipad" }
        return "laptopcomputer"
    }

    private static func details(_ device: AgentDevices.Device) -> String {
        let paired = "Сполучено \(device.createdAt.formatted(date: .abbreviated, time: .shortened))"
        guard let seen = device.lastSeenAt else { return "\(paired) · ще не заходив" }
        return "\(paired) · був \(seen.formatted(.relative(presentation: .named)))"
    }
}
