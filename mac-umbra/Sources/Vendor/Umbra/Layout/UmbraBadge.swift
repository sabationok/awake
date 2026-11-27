import SwiftUI

/// Badge (`.u-badge`): pill with a dot in the tone; `pulse` for a live state.
public struct UmbraBadge: View {
    private let label: String
    private let tone: UmbraTone
    private let pulse: Bool
    @Environment(\.umbra) private var theme

    public init(_ label: String, tone: UmbraTone = .gray, pulse: Bool = false) {
        self.label = label
        self.tone = tone
        self.pulse = pulse
    }

    public var body: some View {
        let p = theme.palette
        let color = tone == .gray ? p.fg2 : tone.color(p)
        HStack(spacing: 6) {
            UmbraDot(tone, pulse: pulse, size: 6).foregroundStyle(color)
            Text(label).font(.system(size: 11, weight: .medium)).lineLimit(1)
        }
        .foregroundStyle(color)
        .padding(.horizontal, 9)
        .frame(height: 22)
        .background(tone.color(p).opacity(0.12), in: Capsule())
    }
}

/// Dot (`.u-dot`). Pulses at 1.6 s like the web; respects «Reduce motion».
public struct UmbraDot: View {
    private let tone: UmbraTone
    private let pulse: Bool
    private let size: CGFloat
    @State private var dim = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.umbra) private var theme

    public init(_ tone: UmbraTone, pulse: Bool = false, size: CGFloat = 7) {
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
public struct UmbraChip: View {
    private let label: String
    private let tone: UmbraTone?
    @Environment(\.umbra) private var theme

    public init(_ label: String, tone: UmbraTone? = nil) {
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
public struct UmbraBigValue: View {
    private let value: String
    private let caption: String?
    private let tone: UmbraTone?
    private let progress: Double?
    @Environment(\.umbra) private var theme

    public init(_ value: String, caption: String? = nil, tone: UmbraTone? = nil, progress: Double? = nil) {
        self.value = value
        self.caption = caption
        self.tone = tone
        self.progress = progress
    }

    public var body: some View {
        let p = theme.palette
        VStack(spacing: 8) {
            Text(value)
                .font(UmbraFont.display)
                .tracking(-0.9)
                .foregroundStyle(tone?.color(p) ?? p.fg)
            if let caption {
                Text(caption).font(.system(size: 12)).foregroundStyle(p.fg3)
            }
            if let progress {
                UmbraProgress(progress, tone: tone).frame(maxWidth: 320)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 22)
        .padding(.bottom, 18)
        .padding(.horizontal, 14)
    }
}

/// Thin progress bar (`.u-progress`).
public struct UmbraProgress: View {
    private let value: Double
    private let tone: UmbraTone?
    @Environment(\.umbra) private var theme

    public init(_ value: Double, tone: UmbraTone? = nil) {
        self.value = value
        self.tone = tone
    }

    public var body: some View {
        let p = theme.palette
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(p.lineStrong)
                Capsule().fill(tone?.color(p) ?? p.accent)
                    .frame(width: geo.size.width * min(max(value, 0), 1))
            }
        }
        .frame(height: 3)
        .animation(.linear(duration: 1), value: value)
    }
}
