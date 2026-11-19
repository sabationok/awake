import SwiftUI

/// Full-width segmented tabs like System Settings («За останні 24 години | Останні 10 дн»): equal halves on
/// a gray track, the selected one filled with the accent color and white text.
struct SegmentedTabs<Value: Hashable>: View {
    let items: [(value: Value, title: String)]
    @Binding var selection: Value
    @Namespace private var namespace

    var body: some View {
        HStack(spacing: 0) {
            ForEach(items, id: \.value) { item in
                let selected = item.value == selection
                Button { withAnimation(.easeOut(duration: 0.18)) { selection = item.value } } label: {
                    Text(item.title)
                        .fontWeight(selected ? .medium : .regular)
                        .foregroundStyle(selected ? Color.white : Color.primary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 26)
                        .background {
                            if selected {
                                RoundedRectangle(cornerRadius: 7, style: .continuous)
                                    .fill(Color.accentColor)
                                    .matchedGeometryEffect(id: "selection", in: namespace)
                            }
                        }
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(2)
        .background(Palette.segmentTrack, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
    }
}
