import SwiftUI

struct TelegramSection: View {
    @EnvironmentObject private var model: AwakeModel

    var body: some View {
        Section {
            if model.telegramEditing {
                editor
            } else {
                summary
            }
        } header: {
            Text("Сповіщення в Telegram")
        } footer: {
            Text("Початок і кінець сесії, відключення живлення, низький заряд, нагрівання. З увімкненими командами боту можна писати /awake (кнопки), /status, /start, /duration 4h, /stop, /lock, /screen, /quit. Які події надсилати, вибирай нижче.")
        }
        ForEach(AppModule.allCases) { module in
            Section {
                ForEach(TelegramEvent.allCases.filter { $0.module == module }) { event in
                    SettingsRow(title: event.title, symbol: event.symbol, color: .blue) {
                        Toggle("", isOn: Binding(
                            get: { model.savedTelegram.events.contains(event) },
                            set: { model.setTelegramEvent(event, enabled: $0) }
                        ))
                        .toggleStyle(.switch)
                        .labelsHidden()
                    }
                }
            } header: {
                Text("Надсилати в Telegram · \(module.title)")
            }
        }
        .animation(.default, value: model.telegramEditing)
        .animation(.default, value: model.telegramJustSaved)
    }

    /// Згорнутий вигляд: налаштування збережено, поля сховані.
    @ViewBuilder
    private var summary: some View {
        SettingsRow(title: "Бот", symbol: "paperplane.fill", color: .blue) {
            HStack(spacing: 10) {
                if model.telegramJustSaved {
                    Label("Збережено", systemImage: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                } else {
                    Text("\(model.savedTelegram.maskedToken) · \(model.savedTelegram.chatId)")
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }
                Button("Тест") { model.testTelegram() }
                Button("Змінити…") { model.telegramEditing = true }
            }
        }
        SettingsRow(title: "Приймати команди", symbol: "terminal.fill", color: .indigo) {
            HStack(spacing: 10) {
                Text(listenerText).foregroundStyle(listenerColor)
                Toggle("", isOn: $model.telegramCommands)
                    .toggleStyle(.switch)
                    .labelsHidden()
            }
        }
    }

    private var listenerText: String {
        switch model.telegramListener {
        case .stopped: model.telegramCommands ? "Підключення…" : "Вимкнено"
        case .listening: "Слухає"
        case .failed(let message): "Помилка: \(message)"
        }
    }

    private var listenerColor: Color {
        if case .failed = model.telegramListener { return .red }
        return .secondary
    }

    /// Поля вводу з кнопками. «Зберегти» синя лише коли є зміни.
    @ViewBuilder
    private var editor: some View {
        SettingsRow(title: "Токен бота", symbol: "key.fill", color: .gray) {
            SecureField("", text: $model.telegram.token, prompt: Text("від @BotFather"))
                .frame(maxWidth: 220)
                .textFieldStyle(.roundedBorder)
                .multilineTextAlignment(.trailing)
        }
        SettingsRow(title: "Chat ID", symbol: "number", color: .gray) {
            TextField("", text: $model.telegram.chatId, prompt: Text("123456789"))
                .frame(maxWidth: 220)
                .textFieldStyle(.roundedBorder)
                .multilineTextAlignment(.trailing)
        }
        HStack {
            Button("Надіслати тест") { model.testTelegram() }
                .disabled(!model.telegram.isConfigured)
            Spacer()
            if model.savedTelegram.isConfigured {
                Button("Скасувати") { model.cancelTelegramEditing() }
            }
            Button("Зберегти") { model.saveTelegram() }
                .buttonStyle(.borderedProminent)
                .disabled(!model.telegramDirty || !model.telegram.isConfigured)
                .keyboardShortcut(.defaultAction)
        }
    }
}
