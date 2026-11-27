import SwiftUI

/// «Вигляд»: drawn by the client itself as the first section of the server's «Налаштування» page (`settings`).
/// The server knows nothing about it; the value lives in this client only (`ThemeSetting`).
struct AppearanceSection: View {
    @Binding var theme: ThemeSetting

    var body: some View {
        UmbraSection("Вигляд") {
            UmbraPanel {
                UmbraRow("Тема") {
                    UmbraSegmented(selection: $theme,
                                   options: ThemeSetting.allCases.map { UmbraOption($0, $0.label) })
                }
            }
        }
    }
}
