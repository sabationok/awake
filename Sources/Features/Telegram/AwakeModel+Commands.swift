import AppKit

/// Вхід від Telegram: текстові команди (/status, /start, …) і кнопки з /awake.
extension AwakeModel {
    func applyTelegramListener() {
        guard telegramCommands, savedTelegram.isConfigured else {
            commandListener.stop()
            return
        }
        commandListener.onStatus = { [weak self] in self?.telegramListener = $0 }
        commandListener.onSkipped = { [weak self] count in
            let since = TelegramCommandListener.stoppedAt
                .map { " з \($0.formatted(date: .numeric, time: .shortened))" } ?? ""
            self?.append("Telegram: пропущено \(count) команд(и), надісланих\(since), поки слухач не працював")
        }
        commandListener.start(settings: savedTelegram) { [weak self] input in
            self?.handleTelegram(input) ?? TelegramOutput()
        }
    }

    func handleTelegram(_ input: TelegramInput) -> TelegramOutput {
        switch input {
        case .text(let text): return handleTelegramCommand(text)
        case .action(let data): return handleTelegramAction(data)
        }
    }

    private func handleTelegramCommand(_ text: String) -> TelegramOutput {
        let parts = text.split(separator: " ", maxSplits: 1).map(String.init)
        guard var command = parts.first, command.hasPrefix("/") else { return TelegramOutput() }
        if let at = command.firstIndex(of: "@") { command = String(command[..<at]) }
        let argument = parts.count > 1 ? parts[1].trimmingCharacters(in: .whitespaces) : nil
        append("Telegram: \(text)")
        refresh()

        switch command.lowercased() {
        case "/awake":
            return awakeMenu()

        case "/status":
            return .text(statusReply(title: "ℹ️ Стан"))

        case "/start":
            var chosen = preset
            if let argument {
                guard let once = SessionPreset.find(argument) else { return .text(unknownDuration(argument)) }
                chosen = once
            }
            guard permissionGranted else {
                return .text(TelegramMessage.format(title: "⛔️ Немає дозволу на керування сном", fields: [("event", "error")]))
            }
            // Під час активної сесії /start перезапускає її з новим часом.
            restart(chosen)
            return TelegramOutput()   // скрипт сам напише «Сон повернуто» і «Сон заблоковано»

        case "/duration":
            guard let argument else {
                return .text(TelegramMessage.format(title: "⏱ Тривалість за замовчуванням", fields: [
                    ("event", "duration"),
                    ("duration", preset.id),
                    ("allowed", SessionPreset.ids),
                    ("change", "/duration 2h"),
                ]))
            }
            guard let chosen = SessionPreset.find(argument) else { return .text(unknownDuration(argument)) }
            preset = chosen
            append("Тривалість за замовчуванням: \(chosen.title)")
            return .text(TelegramMessage.format(title: "⏱ Тривалість змінено", fields: [
                ("event", "duration"),
                ("duration", chosen.id),
                ("applies", isRunning ? "з наступної сесії" : "до наступного /start"),
            ]))

        case "/stop":
            return stopSession()

        case "/lock":
            let locked = LockService.lockAndSleepDisplay()
            return .text(TelegramMessage.format(title: locked ? "🔒 Екран заблоковано" : "🌙 Екран погашено, блокування недоступне", fields: [
                ("event", "lock"),
                ("locked", locked),
                ("running", isRunning),
            ]))

        case "/screen":
            turnDisplayOff()
            return .text(TelegramMessage.format(title: "🌙 Екран погашено", fields: [("event", "screen")]))

        case "/quit":
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) { NSApp.terminate(nil) }
            return .text(TelegramMessage.format(title: "👋 Виходжу з аппки", fields: [
                ("event", "quit"),
                ("session_stopped", isRunning),
            ]))

        default:
            return .text(helpReply())
        }
    }

    /// Натиснута кнопка з /awake. Дії ті самі, що й у текстових командах.
    private func handleTelegramAction(_ data: String) -> TelegramOutput {
        append("Telegram: кнопка \(data)")
        refresh()
        let parts = data.split(separator: ":").map(String.init)
        switch parts.first {
        case "start":
            guard parts.count == 2, let chosen = SessionPreset.find(parts[1]) else {
                return TelegramOutput(callbackAnswer: "Невідома тривалість")
            }
            guard permissionGranted else {
                return TelegramOutput(callbackAnswer: "Немає дозволу на керування сном")
            }
            let answer = isRunning ? "Перезапускаю на \(chosen.title)" : "Запускаю на \(chosen.title)"
            restart(chosen)
            return TelegramOutput(callbackAnswer: answer)

        case "stop":
            let output = stopSession()
            return TelegramOutput(html: output.html, keyboard: output.keyboard, callbackAnswer: "Зупиняю")

        case "status":
            return TelegramOutput(html: statusReply(title: "ℹ️ Стан"), keyboard: awakeKeyboard)

        default:
            return TelegramOutput(callbackAnswer: "Невідома дія")
        }
    }

    private func stopSession() -> TelegramOutput {
        if isRunning {
            stop()
            return TelegramOutput()   // скрипт сам напише «Сон повернуто»
        }
        if sleepBlockedOutside {
            forceRestore()
            return .text(statusReply(title: "🛌 Сон повернуто"))
        }
        return .text(statusReply(title: "💤 Сесія не працює"))
    }

    private var awakeKeyboard: [[TelegramButton]] {
        [
            [TelegramButton(text: "1 год", data: "start:1h"),
             TelegramButton(text: "2 год", data: "start:2h"),
             TelegramButton(text: "4 год", data: "start:4h")],
            [TelegramButton(text: "Стан", data: "status"),
             TelegramButton(text: "Стоп", data: "stop")],
        ]
    }

    private func awakeMenu() -> TelegramOutput {
        let html = TelegramMessage.format(title: "☕️ Awake", fields: [
            ("running", isRunning),
            ("duration", preset.id),
        ])
        return TelegramOutput(html: html, keyboard: awakeKeyboard)
    }

    private func statusReply(title: String) -> String {
        var fields: [(String, Any)] = [
            ("event", "status"),
            ("running", isRunning),
            ("duration", preset.id),
            ("sleep_blocked", sleepBlocked),
        ]
        if let endDate {
            fields.append(("until", endDate.formatted(date: .numeric, time: .shortened)))
            fields.append(("remaining", Countdown.string(until: endDate, now: Date())))
        }
        if let percent = power.percent { fields.append(("battery", percent)) }
        fields.append(("power", power.onAC ? "AC" : "BAT"))
        fields.append(("thermal", thermal.title))
        return TelegramMessage.format(title: title, fields: fields)
    }

    private func unknownDuration(_ value: String) -> String {
        TelegramMessage.format(title: "❓ Невідома тривалість", fields: [
            ("got", value),
            ("allowed", SessionPreset.ids),
        ])
    }

    private func helpReply() -> String {
        TelegramMessage.format(title: "🤖 Команди", fields: [
            ("/awake", "кнопки: 1, 2, 4 години, стан, стоп"),
            ("/status", "стан сесії, батарея, температура"),
            ("/start", "заблокувати сон на \(preset.id); /start 2h — разово інша тривалість"),
            ("/duration", "показати або змінити тривалість: /duration 4h"),
            ("/stop", "повернути сон"),
            ("/lock", "заблокувати екран і погасити його"),
            ("/screen", "лише погасити екран"),
            ("/quit", "вийти з аппки, сон повернеться"),
        ])
    }
}
