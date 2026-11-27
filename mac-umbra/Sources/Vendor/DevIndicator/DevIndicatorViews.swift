import AppKit
import SwiftUI

// MARK: - Floating button

/// Neutral on purpose (spec §3): it belongs to dev tooling, not to the host app's design.
/// The stage colour is not used here; it only shows in the panel badge and the strip dot.
struct DevFloatingButton: View {
    let palette: DevPalette
    let dragging: Bool

    @State private var hovered = false

    var body: some View {
        ZStack {
            Circle().fill(palette.buttonFill)
            Circle().strokeBorder(palette.buttonRing, lineWidth: 1)
            Image(systemName: "chevron.left.forwardslash.chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(palette.buttonIcon)
        }
        .frame(width: 36, height: 36)
        .contentShape(Circle())
        // Two shadows, as on the web: a tight contact one and a soft drop.
        // Hover lifts 1 pt and makes the drop a little stronger.
        .shadow(color: .black.opacity(0.2), radius: 1.5, x: 0, y: hovered ? 2 : 1)
        .shadow(color: .black.opacity(hovered ? 0.26 : 0.22), radius: hovered ? 11 : 8, x: 0, y: hovered ? 10 : 6)
        .offset(y: hovered ? -1 : 0)
        .animation(.easeOut(duration: 0.12), value: hovered)
        .onHover { inside in
            hovered = inside
            if !dragging { DevCursor.set(inside ? .pointingHand : nil) }
        }
        .onChange(of: dragging) { _, isDragging in
            DevCursor.set(isDragging ? .closedHand : (hovered ? .pointingHand : nil))
        }
    }
}

/// Keeps a single cursor pushed at a time, so `push` and `pop` always balance.
@MainActor
enum DevCursor {
    private static var pushed = false

    static func set(_ cursor: NSCursor?) {
        if pushed {
            NSCursor.pop()
            pushed = false
        }
        if let cursor {
            cursor.push()
            pushed = true
        }
    }
}

// MARK: - Strip (bottom only, 24 pt)

struct DevStripBar: View {
    let build: DevBuild
    let palette: DevPalette
    let onTap: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(palette.stage(build.stage))
                .frame(width: 6, height: 6)
            Text(build.project.displayName)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(palette.fg)
                .lineLimit(1)
            Text("v\(build.version)")
                .font(.system(size: 11))
                .foregroundStyle(palette.fg3)
                .lineLimit(1)
            // Strip: no dirty mark (spec §3 adds « •» only in the panel row).
            Text("\(build.git.branch) · \(build.git.commit)")
                .font(.system(size: 11, design: .monospaced))
                .foregroundStyle(palette.fg3)
                .lineLimit(1)
                .truncationMode(.middle)
            Spacer(minLength: 8)
            Text(build.builtAtLabel)
                .font(.system(size: 11))
                .foregroundStyle(palette.fg3)
                .lineLimit(1)
        }
        .padding(.horizontal, 10)
        .frame(maxWidth: .infinity)
        .frame(height: 24)
        .background(palette.surface)
        .overlay(alignment: .top) {
            Rectangle().fill(palette.line).frame(height: 1)
        }
        .contentShape(Rectangle())
        .onTapGesture(perform: onTap)
    }
}

// MARK: - Panel (260 pt card)

struct DevPanel: View {
    let build: DevBuild
    let palette: DevPalette
    let mode: DevIndicatorMode
    let tools: DevTools
    let onSelectMode: (DevIndicatorMode) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .center, spacing: 8) {
                Text(build.project.displayName)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(palette.fg)
                    .lineLimit(1)
                Spacer(minLength: 6)
                DevBadge(text: build.stage.rawValue, color: palette.stage(build.stage))
            }
            .padding(.bottom, 8)

            VStack(alignment: .leading, spacing: 5) {
                DevRow(label: "Версія", value: versionValue, palette: palette)
                DevRow(label: "Гілка", value: branchValue, palette: palette, monospaced: true)
                DevRow(label: "Зібрано", value: build.builtAtLabel, palette: palette)
                ForEach(Array((build.extra ?? []).enumerated()), id: \.offset) { _, row in
                    DevRow(label: row.label, value: row.value, palette: palette)
                }
                ForEach(Array((build.sdks ?? []).enumerated()), id: \.offset) { _, sdk in
                    DevRow(label: sdk.name, value: sdk.version, palette: palette)
                }
            }

            Rectangle().fill(palette.line).frame(height: 1).padding(.vertical, 8)

            Text("Інструменти")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(palette.fg3)
                .padding(.bottom, 4)

            DevToolRow(
                title: "Копіювати паспорт",
                systemImage: "doc.on.doc",
                palette: palette
            ) {
                copyPassport()
            }
            ForEach(tools.tools) { tool in
                DevToolRow(title: tool.title, systemImage: tool.systemImage ?? "wrench.and.screwdriver", palette: palette) {
                    Task { await tool.run() }
                }
            }

            Rectangle().fill(palette.line).frame(height: 1).padding(.vertical, 8)

            DevSegmented(
                options: [(DevIndicatorMode.floating, "Кнопка"), (DevIndicatorMode.strip, "Смужка")],
                selection: mode,
                palette: palette,
                onSelect: onSelectMode
            )
        }
        .padding(12)
        .frame(width: 260, alignment: .leading)
        .background(palette.surface, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(palette.line, lineWidth: 1))
        .shadow(color: .black.opacity(0.28), radius: 18, y: 8)
    }

    private var versionValue: String {
        guard let number = build.buildNumber else { return build.version }
        return "\(build.version) · #\(number)"
    }

    private var branchValue: String {
        "\(build.git.branch) · \(build.git.commit)\(build.git.dirty ? " •" : "")"
    }

    private func copyPassport() {
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(build.passportJSON(), forType: .string)
    }
}

private struct DevRow: View {
    let label: String
    let value: String
    let palette: DevPalette
    var monospaced = false

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text(label)
                .font(.system(size: 12))
                .foregroundStyle(palette.fg3)
                .frame(width: 72, alignment: .leading)
            Text(value)
                .font(.system(size: 12, design: monospaced ? .monospaced : .default))
                .foregroundStyle(palette.fg)
                .lineLimit(1)
                .truncationMode(.middle)
                .textSelection(.enabled)
        }
    }
}

private struct DevBadge: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.15), in: RoundedRectangle(cornerRadius: 6))
    }
}

private struct DevToolRow: View {
    let title: String
    let systemImage: String
    let palette: DevPalette
    let action: () -> Void

    @State private var hovered = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: systemImage)
                    .font(.system(size: 12))
                    .frame(width: 16)
                Text(title)
                    .font(.system(size: 12))
                Spacer(minLength: 0)
            }
            .foregroundStyle(palette.fg)
            .padding(.horizontal, 6)
            .padding(.vertical, 5)
            .contentShape(Rectangle())
            .background(hovered ? palette.surface2 : .clear, in: RoundedRectangle(cornerRadius: 6))
        }
        .buttonStyle(.plain)
        .onHover { hovered = $0 }
    }
}

/// Two-segment control used for «Кнопка | Смужка».
private struct DevSegmented: View {
    let options: [(DevIndicatorMode, String)]
    let selection: DevIndicatorMode
    let palette: DevPalette
    let onSelect: (DevIndicatorMode) -> Void

    var body: some View {
        HStack(spacing: 2) {
            ForEach(Array(options.enumerated()), id: \.offset) { _, option in
                let selected = option.0 == selection
                Button {
                    onSelect(option.0)
                } label: {
                    Text(option.1)
                        .font(.system(size: 12, weight: selected ? .semibold : .regular))
                        .foregroundStyle(selected ? palette.fg : palette.fg3)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 4)
                        .background(selected ? palette.surface2 : .clear, in: RoundedRectangle(cornerRadius: 6))
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(2)
        .background(palette.line.opacity(0.5), in: RoundedRectangle(cornerRadius: 8))
    }
}
