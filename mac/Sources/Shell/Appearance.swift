import SwiftUI

/// Port of `web/src/shell/appearance.tsx` (`AppearanceSection`).
/// «Вигляд»: drawn by the client itself as the first section of the server's «Налаштування» page (`settings`).
/// The server knows nothing about it; the value lives in this client only (`ThemeChoice`).
struct AppearanceSection: View {
    @Binding var theme: ThemeChoice

    var body: some View {
        Section("Вигляд") {
            Panel {
                Row("Тема") {
                    Segmented(selection: $theme,
                                   options: ThemeChoice.allCases.map { Option($0, $0.label) })
                }
            }
        }
    }
}
