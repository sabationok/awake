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
            Text("Підключення")
        } footer: {
            Text("Токен бота і чат зберігаються лише на цьому Mac.")
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
    }

    /// Поля вводу з кнопками. «Зберегти» синя лише коли є зміни.
    @ViewBuilder
    private var editor: some View {
        SettingsRow(title: "Токен бота", symbol: "key.fill", color: .gray) {
            SecretField(text: $model.telegram.token, prompt: "від @BotFather")
                .frame(maxWidth: 220)
                .textFieldStyle(.roundedBorder)
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
