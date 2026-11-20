import AppKit
import SwiftUI

/// Сполучення нового пристрою (QR і посилання з одноразовим кодом) і список сполучених з відкликанням.
struct DevicesSection: View {
    @EnvironmentObject private var model: AwakeModel

    var body: some View {
        Group {
            if let devices = model.devices {
                PairingSection(pairing: devices.pairing)
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

/// QR і посилання. Код діє 2 хвилини і лише раз; коли спливає, просимо в агента новий.
private struct PairingSection: View {
    @EnvironmentObject private var model: AwakeModel
    let pairing: AgentDevices.Pairing
    @State private var copied = false

    var body: some View {
        Section {
            if let url = pairing.url, let expiresAt = pairing.expiresAt {
                HStack(alignment: .top, spacing: 16) {
                    // Код з кешу міг протухнути: QR лишається на місці (без стрибка), але тьмяний, поки агент дасть новий.
                    let stale = expiresAt <= Date()
                    QrCodeImage(text: url)
                        .frame(width: 148, height: 148)
                        .opacity(stale ? 0.15 : 1)
                        .overlay { if stale { ProgressView() } }
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Наведи камеру телефона або відкрий посилання на ноуті. Пристрій має бути в тій самій Wi-Fi, а тут з'явиться питання «Це ви?».")
                            .fixedSize(horizontal: false, vertical: true)
                        Text(url)
                            .font(.caption.monospaced())
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                            .truncationMode(.middle)
                            .textSelection(.enabled)
                        HStack {
                            Button(copied ? "Скопійовано" : "Копіювати посилання") { copy(url) }
                            Button("Новий код") { model.refreshDevices() }
                        }
                        TimelineView(.periodic(from: .now, by: 1)) { context in
                            let left = max(0, Int(expiresAt.timeIntervalSince(context.date)))
                            Text(left > 0 ? "Код діє ще \(left / 60):\(String(format: "%02d", left % 60))" : "Оновлюю код…")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .onChange(of: left == 0) { _, expired in
                                    if expired { model.refreshDevices() }
                                }
                        }
                    }
                }
                .padding(.vertical, 4)
            } else if pairing.reason == "loading" {
                // Кеш без коду: місце під QR тримаємо, щоб сторінка не стрибнула, коли код прийде.
                HStack(alignment: .top, spacing: 16) {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(.quaternary)
                        .frame(width: 148, height: 148)
                        .overlay { ProgressView() }
                    Text("Отримую код сполучення від агента…")
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 4)
            } else {
                Text(pairing.reason == "noNetwork"
                     ? "Mac не в мережі: немає адреси, за якою пристрій міг би його знайти."
                     : "Сполучати можна лише в довіреній Wi-Fi. Познач цю мережу як довірену в «Підключенні».")
                    .foregroundStyle(.secondary)
            }
        } header: {
            Text("Сполучити пристрій")
        } footer: {
            Text("Код одноразовий. Пристрій отримає свій токен лише після «Дозволити» тут; токен лишається тільки в його браузері.")
        }
    }

    private func copy(_ url: String) {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(url, forType: .string)
        copied = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { copied = false }
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
