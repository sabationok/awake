import Foundation
import IOKit

/// Стан кришки MacBook з IOKit (`AppleClamshellState` у IOPMrootDomain).
/// Під час сесії сон вимкнено, тож система сама не блокує екран при закритті кришки.
enum ClamshellService {
    static func isClosed() -> Bool {
        let entry = IOServiceGetMatchingService(kIOMainPortDefault, IOServiceMatching("IOPMrootDomain"))
        guard entry != 0 else { return false }
        defer { IOObjectRelease(entry) }
        let value = IORegistryEntryCreateCFProperty(entry, "AppleClamshellState" as CFString, kCFAllocatorDefault, 0)
        return (value?.takeRetainedValue() as? Bool) ?? false
    }
}
