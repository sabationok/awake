import CoreLocation
import CoreWLAN

/// Назва поточної мережі Wi-Fi. macOS віддає SSID лише застосункам з дозволом геолокації,
/// без нього `ssid()` повертає nil.
@MainActor
final class WifiService: NSObject, CLLocationManagerDelegate {
    private let location = CLLocationManager()
    var onAuthorizationChange: (() -> Void)?

    override init() {
        super.init()
        location.delegate = self
    }

    var isAuthorized: Bool {
        let status = location.authorizationStatus
        return status == .authorizedAlways || status == .authorized
    }

    var isDenied: Bool {
        let status = location.authorizationStatus
        return status == .denied || status == .restricted
    }

    func requestAccess() {
        location.requestWhenInUseAuthorization()
    }

    func currentSSID() -> String? {
        CWWiFiClient.shared().interface()?.ssid()
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in self.onAuthorizationChange?() }
    }
}
