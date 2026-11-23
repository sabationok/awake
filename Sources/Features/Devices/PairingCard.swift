import AppKit
import SwiftUI

/// Картка «Сполучити пристрій»: селектор шляху (локально, Tailscale, дистанційно; недоступні сірі), QR з таймером і посилання з копіюванням.
/// Коди окремі для кожного шляху: QR одного шляху не діє через інший.
struct PairingCard: View {
    @EnvironmentObject private var model: AwakeModel
    let pairings: AgentDevices.Pairings
    /// nil — вибору ще не було: перший шлях, у якого є посилання.
    @State private var chosen: AgentDevices.Mode?

    /// Вибраний шлях, поки в нього є посилання; інакше перший доступний. Недоступний не вибирається, як у
    /// «Віддаленому доступі»: його видно сірим, а якщо доступного немає взагалі — причину першого.
    private var mode: AgentDevices.Mode {
        let modes = pairings.modes
        if let chosen, modes.contains(chosen), isAvailable(chosen) { return chosen }
        return modes.first(where: isAvailable) ?? modes.first ?? .local
    }

    private func isAvailable(_ mode: AgentDevices.Mode) -> Bool { pairings[mode].url != nil }

    /// Таймер живе на всій картці, а не в QR: так код оновлюється і тоді, коли видно інший шлях. Найближчий з усіх.
    private var expiry: Date? { pairings.modes.compactMap { pairings[$0].expiresAt }.min() }

    var body: some View {
        let pairing = pairings[mode]
        Section {
            Group {
                // Пункти Picker-меню в macOS ігнорують .disabled, а кнопки в Menu — ні (як у select SDUI).
                LabeledContent("Шлях") {
                    Menu(mode.title) {
                        ForEach(pairings.modes) { option in
                            Button(isAvailable(option) ? option.title : "\(option.title) — недоступно") {
                                if isAvailable(option) { chosen = option }
                            }
                            .disabled(!isAvailable(option))
                        }
                    }
                    .menuStyle(.button)
                    .fixedSize()
                }

                Text(mode.hint)
                    .foregroundStyle(.secondary)

                if let url = pairing.url, let expiresAt = pairing.expiresAt {
                    PairingQr(url: url, expiresAt: expiresAt)
                    PairingLink(url: url)
                } else {
                    PairingUnavailable(reason: pairing.reason)
                }
            }
            .task(id: expiry) { await renewWhenExpired(at: expiry) }
        } header: {
            Text("Сполучити пристрій")
        } footer: {
            Text("Код одноразовий. Токен пристрій отримає лише після «Дозволити».")
        }
    }

    /// Спливає код — просимо свіжий знімок: агент сам ротує код, а попередній ще період приймає.
    /// Не `newPairingCode()`: той скидає обидва коди одразу, і QR, який саме сканують, перестане діяти.
    /// Нове `expiresAt` перезапускає задачу, тож цикла немає.
    private func renewWhenExpired(at expiry: Date?) async {
        guard let expiry else { return }
        let delay = expiry.timeIntervalSinceNow
        if delay > 0 { try? await Task.sleep(for: .seconds(delay)) }
        guard !Task.isCancelled else { return }
        model.refreshDevices()
    }
}

private extension AgentDevices.Mode {
    var title: String {
        switch self {
        case .local: "Локально"
        case .tailnet: "Tailscale"
        case .remote: "Дистанційно"
        }
    }

    var hint: String {
        switch self {
        case .local: "Відкрий на телефоні або ноуті в тій самій Wi-Fi"
        case .tailnet: "Відкрий з будь-якої мережі на своєму пристрої з Tailscale"
        case .remote: "Відкрий з будь-якої мережі: вхід іде через дашборд"
        }
    }
}

/// QR по центру, під ним — «Новий код» і таймер.
private struct PairingQr: View {
    @EnvironmentObject private var model: AwakeModel
    let url: String
    let expiresAt: Date

    var body: some View {
        VStack(spacing: 12) {
            QrCodeImage(text: url)
                .frame(width: 240, height: 240)
                .overlay { ExpiryShade(expiresAt: expiresAt) }
            HStack(spacing: 12) {
                PairingCountdown(expiresAt: expiresAt)
                Button("Новий код") { model.newPairingCode() }
            }
        }
        .frame(maxWidth: .infinity)
    }
}

/// Затемнює QR, коли код протух і агент ще не дав новий.
private struct ExpiryShade: View {
    let expiresAt: Date

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            if expiresAt <= context.date {
                ZStack {
                    Color(nsColor: .windowBackgroundColor).opacity(0.85)
                    ProgressView()
                }
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
    }
}

private struct PairingCountdown: View {
    let expiresAt: Date

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let left = max(0, Int(expiresAt.timeIntervalSince(context.date)))
            Text(left > 0 ? "Код діє \(left / 60):\(String(format: "%02d", left % 60))" : "Оновлюю код…")
                .font(.system(.title3, design: .monospaced).weight(.semibold))
                .monospacedDigit()
        }
    }
}

/// Посилання великим моноширинним шрифтом, виділяється і переноситься; «Копіювати» поруч.
private struct PairingLink: View {
    let url: String
    @State private var copied = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Посилання")
                .font(.caption)
                .foregroundStyle(.secondary)
            HStack(spacing: 10) {
                Text(url)
                    .font(.system(.body, design: .monospaced))
                    .lineLimit(2)
                    .truncationMode(.middle)
                    .textSelection(.enabled)
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(.quaternary, in: RoundedRectangle(cornerRadius: 8))
                Button(copied ? "Скопійовано" : "Копіювати") { copy() }
            }
        }
    }

    private func copy() {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(url, forType: .string)
        copied = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { copied = false }
    }
}

/// Причина, чому в цьому шляху зараз немає посилання.
private struct PairingUnavailable: View {
    let reason: String?

    var body: some View {
        VStack(spacing: 8) {
            if reason == "loading" { ProgressView() }
            Text(Self.text(for: reason))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, minHeight: 120)
    }

    private static func text(for reason: String?) -> String {
        switch reason {
        case "untrusted": return "Mac не в довіреній Wi-Fi. Додай мережу в «Підключенні» або обери «Tailscale»."
        case "tailnetOff": return "Tailscale не запущений на Mac або вимкнений: увімкни «Через Tailscale» в Агент → Огляд."
        case "disabled": return "Webhooxy вимкнено в агенті."
        case "noNetwork": return "Mac не в мережі: немає адреси, за якою пристрій міг би його знайти."
        case "relayOff": return "Webhooxy вимкнений або не налаштований: увімкни його в Агент → Огляд."
        case "loading": return "Завантаження…"
        default: return "Посилання зараз недоступне."
        }
    }
}
