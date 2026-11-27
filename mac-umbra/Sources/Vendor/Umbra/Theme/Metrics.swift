import SwiftUI

/// Sizes from the web tokens (`--fs-*`, `--r-*`, `--row-h`, `--sidebar-w`). System font (SF Pro), not Inter.
public enum UmbraFont {
    public static let xs = Font.system(size: 11)
    public static let sm = Font.system(size: 12)
    public static let body = Font.system(size: 13)
    public static let lg = Font.system(size: 15)
    public static let xl = Font.system(size: 20)
    public static let display = Font.system(size: 44, weight: .medium).monospacedDigit()
    public static let mono = Font.system(size: 11, design: .monospaced)
    /// Section titles: 11 pt, semibold, upper case with tracking.
    public static let caps = Font.system(size: 11, weight: .semibold)
}

public enum Radius {
    public static let sm: CGFloat = 6
    public static let md: CGFloat = 10
    public static let lg: CGFloat = 14
}

public enum UmbraLayout {
    public static let rowMinHeight: CGFloat = 44
    public static let sidebarWidth: CGFloat = 232
    /// Below this window width the sidebar becomes an overlay.
    public static let compactWidth: CGFloat = 640
    /// Content column max width, like `.s-content`.
    public static let contentMaxWidth: CGFloat = 760
    public static let headerHeight: CGFloat = 52
}

public enum Motion {
    /// `--ease: cubic-bezier(0.2, 0.7, 0.2, 1)`.
    public static let ease = Animation.timingCurve(0.2, 0.7, 0.2, 1, duration: 0.2)
}
