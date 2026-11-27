// The app's one import point for swift-umbra-lib (module `Umbra`, built first by scripts/build-mac-umbra.sh).
// No other file imports Umbra: `@_exported` makes it visible to the whole app module from here.
//
// Aliased below: the components whose names collide with SwiftUI / Charts / Foundation and that the app uses as
// Umbra's. A declaration in the app module shadows an imported one, so the plain name means Umbra's everywhere in
// the app; the system type stays reachable as `SwiftUI.Section`, `SwiftUI.Slider`, `Charts.Chart`, `Foundation.Progress`.
//
// Never aliased (write the module at the call site):
// - `Umbra.Font`, `Umbra.Layout`, `Umbra.ButtonStyle`: SwiftUI's are used everywhere through type inference and
//   protocol conformance (`.font(.system…)`, `: Layout`, `.buttonStyle(…)`), so shadowing them app-wide is a trap.
// - `SidebarNode`: the app has its own (`Lib/SidebarSections.swift`); the lib's is internal to the lib.
@_exported import Umbra

typealias Section = Umbra.Section
typealias Slider = Umbra.Slider
typealias TextField = Umbra.TextField
typealias Menu = Umbra.Menu
typealias MenuButton = Umbra.MenuButton
typealias Chart = Umbra.Chart
typealias Progress = Umbra.Progress
typealias VisualEffect = Umbra.VisualEffect
