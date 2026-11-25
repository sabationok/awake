import SwiftUI

/// «Інтерфейс»: підсвітка того, що вшите в аппку, і того, що прийшло деревом від агента.
struct InterfaceOriginSection: View {
    @AppStorage(UiOrigin.native.storageKey) private var highlightNative = false
    @AppStorage(UiOrigin.agent.storageKey) private var highlightAgent = false

    var body: some View {
        Section {
            Toggle(isOn: $highlightNative) {
                Label {
                    Text("Підсвітити статичні елементи")
                } icon: {
                    SettingsIcon(symbol: "hammer.fill", color: UiOrigin.native.color)
                }
            }
            Toggle(isOn: $highlightAgent) {
                Label {
                    Text("Підсвітити динамічні елементи")
                } icon: {
                    SettingsIcon(symbol: "arrow.triangle.2.circlepath", color: UiOrigin.agent.color)
                }
            }
        } header: {
            Text("Інтерфейс")
        } footer: {
            Text("Статичне вшите в аппку і міняється лише з новою збіркою. Динамічне приходить від агента і оновлюється без неї. Позначається найвищий елемент: сторінка рамкою, секція на змішаній сторінці — тлом.")
        }
    }
}
