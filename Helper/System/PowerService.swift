import Foundation
import IOKit.ps

/// Читання стану живлення і блокування сну. Root не потрібен.
enum PowerService {
    static func battery() -> PowerStatus {
        guard let info = IOPSCopyPowerSourcesInfo()?.takeRetainedValue(),
              let list = IOPSCopyPowerSourcesList(info)?.takeRetainedValue() as? [CFTypeRef]
        else { return .unknown }

        var status = PowerStatus.unknown
        for source in list {
            guard let d = IOPSGetPowerSourceDescription(info, source)?.takeUnretainedValue() as? [String: Any]
            else { continue }
            status.percent = d[kIOPSCurrentCapacityKey] as? Int
            status.onAC = (d[kIOPSPowerSourceStateKey] as? String) == kIOPSACPowerValue
        }
        return status
    }

    /// Чи заблоковано сон через `pmset disablesleep` (ким завгодно).
    static func isSleepBlocked() -> Bool {
        Shell.run("/usr/bin/pmset", ["-g"]).output
            .range(of: #"SleepDisabled\s+1"#, options: .regularExpression) != nil
    }
}
