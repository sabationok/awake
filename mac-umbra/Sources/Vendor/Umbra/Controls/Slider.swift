import SwiftUI

/// Slider (`.u-slider`): 3 pt track with the accent fill and a 13 pt knob. `onCommit` fires on release,
/// matching the contract rule «action on release».
public struct Slider: View {
    @Binding private var value: Double
    private let range: ClosedRange<Double>
    private let step: Double?
    private let label: String
    private let onCommit: (Double) -> Void
    private let showsValue: Bool
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.umbra) private var theme

    /// `showsValue`: the rounded value right of the track (`.u-slider-value`).
    public init(_ label: String, value: Binding<Double>, in range: ClosedRange<Double>, step: Double? = nil,
                showsValue: Bool = false, onCommit: @escaping (Double) -> Void = { _ in }) {
        self.showsValue = showsValue
        self.label = label
        _value = value
        self.range = range
        self.step = step
        self.onCommit = onCommit
    }

    public var body: some View {
        HStack(spacing: 10) {
            track
            if showsValue {
                Text("\(Int(value.rounded()))")
                    .font(Font.sm.monospacedDigit())
                    .foregroundStyle(theme.palette.fg2)
                    .frame(width: 34, alignment: .trailing)
            }
        }
    }

    private var track: some View {
        let p = theme.palette
        return GeometryReader { geo in
            let width = geo.size.width
            let span = max(range.upperBound - range.lowerBound, .ulpOfOne)
            let fraction = (value - range.lowerBound) / span
            let knobX = 6.5 + (width - 13) * fraction
            ZStack(alignment: .leading) {
                Capsule().fill(p.lineStrong).frame(height: 3)
                Capsule().fill(p.accent).frame(width: max(knobX, 0), height: 3)
                Circle().fill(p.fg).frame(width: 13, height: 13).offset(x: knobX - 6.5)
            }
            .frame(height: 18)
            .contentShape(Rectangle())
            .gesture(DragGesture(minimumDistance: 0)
                .onChanged { drag in value = snapped(drag.location.x, width: width) }
                .onEnded { drag in onCommit(snapped(drag.location.x, width: width)) })
        }
        .frame(minWidth: 80)
        .frame(height: 18)
        .opacity(isEnabled ? 1 : 0.4)
        .allowsHitTesting(isEnabled)
        .accessibilityElement()
        .accessibilityLabel(label)
        .accessibilityValue(String(Int(value.rounded())))
        .accessibilityAdjustableAction { direction in
            let delta = step ?? (range.upperBound - range.lowerBound) / 20
            value = min(max(value + (direction == .increment ? delta : -delta), range.lowerBound), range.upperBound)
            onCommit(value)
        }
    }

    private func snapped(_ x: Double, width: Double) -> Double {
        let fraction = min(max((x - 6.5) / max(width - 13, 1), 0), 1)
        var raw = range.lowerBound + fraction * (range.upperBound - range.lowerBound)
        if let step, step > 0 { raw = (raw / step).rounded() * step }
        return min(max(raw, range.lowerBound), range.upperBound)
    }
}
