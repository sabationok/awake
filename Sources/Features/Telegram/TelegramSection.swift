import SwiftUI

/// «Підключення» бота на сторінці Telegram: картка «Бот» зі станом праворуч і діями в «⋯»; токен і чат —
/// у спільному аркуші форми (два поля). Зберігаються лише на цьому Mac.
struct TelegramSection: View {
    @EnvironmentObject private var model: AwakeModel
    @State private var editorOpen = false

    var body: some View {
        Section {
            ItemCard(title: "Бот", symbol: "paperplane.fill", color: .blue, status: status, comment: comment) {
                ItemCardActions(actions: actions)
            }
        } header: {
            Text("Підключення")
        } footer: {
            Text("Токен бота і чат зберігаються лише на цьому Mac.")
        }
        .animation(.default, value: model.telegramJustSaved)
        .sheet(isPresented: $editorOpen, onDismiss: { model.cancelTelegramEditing() }) {
            editor
        }
    }

    private var configured: Bool { model.savedTelegram.isConfigured }

    private var status: ItemCardStatus {
        if model.telegramJustSaved { return ItemCardStatus(label: "Збережено", color: .green) }
        return configured ? ItemCardStatus(label: "Задано", color: .green) : ItemCardStatus(label: "Не задано", color: .gray)
    }

    private var comment: String {
        configured ? "\(model.savedTelegram.maskedToken) · чат \(model.savedTelegram.chatId)" : "Токен від @BotFather і ID чату."
    }

    /// Без налаштувань — одна кнопка «Задати»; з ними — «Тест» і «Змінити» в «⋯».
    private var actions: [ItemCardActions.Action] {
        guard configured else { return [.init(id: "set", label: "Задати", prominent: true) { editorOpen = true }] }
        return [
            .init(id: "test", label: "Надіслати тест", symbol: "paperplane") { model.testTelegram() },
            .init(id: "edit", label: "Змінити", symbol: "pencil") { editorOpen = true },
        ]
    }

    private var editor: some View {
        FormSheet(title: "Бот Telegram", canSubmit: model.telegramDirty && model.telegram.isConfigured,
                  onCancel: { editorOpen = false }, onSubmit: { if model.saveTelegram() { editorOpen = false } }) {
            FormInput(label: "Токен бота", text: $model.telegram.token, prompt: "від @BotFather", secure: true)
            FormInput(label: "Chat ID", text: $model.telegram.chatId, prompt: "123456789",
                      hint: "Приватний чат з ботом або група.")
        }
    }
}
