import SwiftUI

/// Стан словом з крапкою праворуч у заголовку: «● Активна».
struct UiStatusBadgeView: View {
    let status: UiStatusBadge

    var body: some View {
        HStack(spacing: 5) {
            StatusDot(color: status.tone.color, pulse: status.pulse ?? false)
            Text(status.label)
        }
        .font(.callout)
        .foregroundStyle(.secondary)
        .lineLimit(1)
        .fixedSize()
    }
}
