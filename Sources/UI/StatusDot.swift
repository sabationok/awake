import SwiftUI

/// Зелена крапка для активного стану, як «Під'єднано» у налаштуваннях Wi-Fi.
struct StatusDot: View {
    let active: Bool

    var body: some View {
        Circle()
            .fill(active ? Color.green : Color.secondary.opacity(0.5))
            .frame(width: 8, height: 8)
    }
}
