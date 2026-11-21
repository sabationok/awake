import SwiftUI

/// Маленька плашка біля значення: звідки воно взялося («Envify», «relay.env»).
struct SourceTag: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.caption)
            .foregroundStyle(.secondary)
            .padding(.horizontal, 6)
            .padding(.vertical, 1)
            .background(.quaternary, in: Capsule())
    }
}
