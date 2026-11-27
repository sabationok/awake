import SwiftUI

/// Badge (`.u-badge`): pill with a dot in the tone; `pulse` for a live state.
public struct Badge: View {
    private let label: String
    private let tone: Tone
    private let pulse: Bool
    @Environment(\.umbra) private var theme

    public init(_ label: String, tone: Tone = .gray, pulse: Bool = false) {
        self.label = label
        self.tone = tone
        self.pulse = pulse
    }

    public var body: some View {
        let p = theme.palette
        let color = tone == .gray ? p.fg2 : tone.color(p)
        HStack(spacing: 6) {
            Dot(tone, pulse: pulse, size: 6).foregroundStyle(color)
            Text(label).font(.system(size: 11, weight: .medium)).lineLimit(1)
        }
        .foregroundStyle(color)
        .padding(.horizontal, 9)
        .frame(height: 22)
        .background(tone.color(p).opacity(0.12), in: Capsule())
    }
}

/// Dot (`.u-dot`). Pulses at 1.6 s like the web; respects «Reduce motion».
public struct Dot: View {
    private let tone: Tone
    private let pulse: Bool
    private let size: CGFloat
    @State private var dim = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.umbra) private var theme

    public init(_ tone: Tone, pulse: Bool = false, size: CGFloat = 7) {
        self.tone = tone
        self.pulse = pulse
        self.size = size
    }

    public var body: some View {
        Circle()
            .fill(tone.color(theme.palette))
            .frame(width: size, height: size)
            .opacity(dim ? 0.35 : 1)
            .onAppear {
                guard pulse, !reduceMotion else { return }
                withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) { dim = true }
            }
    }
}

/// Chip (`.u-chip`): small square tag.
public struct Chip: View {
    private let label: String
    private let tone: Tone?
    @Environment(\.umbra) private var theme

    public init(_ label: String, tone: Tone? = nil) {
        self.label = label
        self.tone = tone
    }

    public var body: some View {
        let p = theme.palette
        Text(label)
            .font(.system(size: 11, weight: .semibold))
            .tracking(0.2)
            .foregroundStyle(tone.map { $0 == .gray ? p.fg2 : $0.color(p) } ?? p.fg2)
            .padding(.horizontal, 7)
            .frame(height: 20)
            .background(p.surface3, in: RoundedRectangle(cornerRadius: 4, style: .continuous))
    }
}

/// Big value (`.u-big`): display number with caption and an optional progress bar (timer, countdown).
public struct BigValue: View {
    private let value: String
    private let caption: String?
    private let tone: Tone?
    private let color: Color?
    private let progress: Double?
    @Environment(\.umbra) private var theme

    /// `color` overrides `tone` for the digits and the bar (a session timer goes from green to red).
    public init(_ value: String, caption: String? = nil, tone: Tone? = nil, color: Color? = nil,
                progress: Double? = nil) {
        self.value = value
        self.caption = caption
        self.tone = tone
        self.color = color
        self.progress = progress
    }

    /// Order as `.u-big`: value, progress bar, caption.
    public var body: some View {
        let p = theme.palette
        let ink = color ?? tone?.color(p) ?? p.fg
        VStack(spacing: 8) {
            Text(value)
                .font(Font.display)
                .tracking(-0.9)
                .foregroundStyle(ink)
            if let progress {
                Progress(progress, color: color ?? tone?.color(p)).frame(maxWidth: 320)
            }
            if let caption {
                Text(caption).font(.system(size: 13)).foregroundStyle(p.fg3)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 22)
        .padding(.bottom, 18)
        .padding(.horizontal, 14)
    }
}

/// Thin progress bar (`.u-progress`).
public struct Progress: View {
    private let value: Double
    private let tone: Tone?
    private let color: Color?
    @Environment(\.umbra) private var theme

    public init(_ value: Double, tone: Tone? = nil) {
        self.value = value
        self.tone = tone
        self.color = nil
    }

    public init(_ value: Double, color: Color?) {
        self.value = value
        self.tone = nil
        self.color = color
    }

    public var body: some View {
        let p = theme.palette
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(p.lineStrong)
                Capsule().fill(color ?? tone?.color(p) ?? p.accent)
                    .frame(width: geo.size.width * min(max(value, 0), 1))
            }
        }
        .frame(height: 3)
        .animation(.linear(duration: 1), value: value)
    }
}
