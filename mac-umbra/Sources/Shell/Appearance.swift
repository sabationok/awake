import SwiftUI

/// Port of `web-umbra/src/shell/appearance.tsx` (`AppearanceSection`).
/// «Вигляд»: drawn by the client itself as the first section of the server's «Налаштування» page (`settings`).
/// The server knows nothing about it; the value lives in this client only (`ThemeChoice`).
struct AppearanceSection: View {
    @Binding var theme: ThemeChoice

    var body: some View {
        UmbraSection("Вигляд") {
            UmbraPanel {
                UmbraRow("Тема") {
                    UmbraSegmented(selection: $theme,
                                   options: ThemeChoice.allCases.map { UmbraOption($0, $0.label) })
                }
            }
        }
    }
}
