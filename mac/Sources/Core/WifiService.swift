import CoreLocation
import CoreWLAN

/// The current Wi-Fi name for the server (`{"type":"wifi"}`). Temporary, as in the old app: macOS gives the SSID only to
/// a bundle with Location access and an Info.plist, which the helper does not have yet. Without access `ssid()` is nil.
@MainActor
final class WifiService: NSObject, CLLocationManagerDelegate {
    private let location = CLLocationManager()
    var onChange: (() -> Void)?

    override init() {
        super.init()
        location.delegate = self
    }

    /// Asks for Location once (macOS shows its window only while the status is not determined).
    func requestAccess() {
        if location.authorizationStatus == .notDetermined { location.requestWhenInUseAuthorization() }
    }

    func currentSSID() -> String? {
        CWWiFiClient.shared().interface()?.ssid()
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in self.onChange?() }
    }
}
