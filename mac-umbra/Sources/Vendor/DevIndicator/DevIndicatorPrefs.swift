import Foundation
import SwiftUI

public enum DevIndicatorMode: String, Codable, Sendable {
    case floating
    case strip
}

/// Spec §3 corners. Swift only uses the four corners of the floating button.
enum DevCorner: String, Codable, Sendable {
    case topLeading
    case topTrailing
    case bottomLeading
    case bottomTrailing

    var isTop: Bool { self == .topLeading || self == .topTrailing }
    var isLeading: Bool { self == .topLeading || self == .bottomLeading }

    var alignment: Alignment {
        switch self {
        case .topLeading: return .topLeading
        case .topTrailing: return .topTrailing
        case .bottomLeading: return .bottomLeading
        case .bottomTrailing: return .bottomTrailing
        }
    }

    static func nearest(x: CGFloat, y: CGFloat, in size: CGSize) -> DevCorner {
        let leading = x < size.width / 2
        let top = y < size.height / 2
        switch (top, leading) {
        case (true, true): return .topLeading
        case (true, false): return .topTrailing
        case (false, true): return .bottomLeading
        case (false, false): return .bottomTrailing
        }
    }
}

struct DevIndicatorPrefs: Codable, Equatable {
    var mode: DevIndicatorMode = .floating
    var corner: DevCorner = .bottomLeading
}

/// Persistence under the UserDefaults key `dev-indicator:<project.id>`.
enum DevIndicatorPrefsStore {
    static func key(projectId: String) -> String {
        "dev-indicator:\(projectId)"
    }

    static func load(projectId: String, defaults: UserDefaults = .standard) -> DevIndicatorPrefs {
        guard
            let data = defaults.data(forKey: key(projectId: projectId)),
            let prefs = try? JSONDecoder().decode(DevIndicatorPrefs.self, from: data)
        else {
            return DevIndicatorPrefs()
        }
        return prefs
    }

    static func save(_ prefs: DevIndicatorPrefs, projectId: String, defaults: UserDefaults = .standard) {
        guard let data = try? JSONEncoder().encode(prefs) else { return }
        defaults.set(data, forKey: key(projectId: projectId))
    }
}

/// Forces the mode and panel state for shots or previews. Nothing is read from or written to UserDefaults.
public struct DevIndicatorPreview: Sendable {
    public var mode: DevIndicatorMode
    public var panelOpen: Bool

    public init(mode: DevIndicatorMode, panelOpen: Bool = false) {
        self.mode = mode
        self.panelOpen = panelOpen
    }
}
