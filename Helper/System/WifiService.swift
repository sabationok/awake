import CoreLocation
import CoreWLAN

/// Назва поточної мережі Wi-Fi. macOS дає її лише бандлу з дозволом геолокації, тому помічник — бандл
/// (MaControlHelper.app з NSLocation*UsageDescription). Без дозволу `ssid()` повертає nil. Координат помічник не читає.
/// CLLocationManager кличе делегата в run loop потоку, де його створили: тому створюється на main,
/// а main крутить `RunLoop.main.run()` (Helper/main.swift).
final class WifiService: NSObject, CLLocationManagerDelegate {
    private let location = CLLocationManager()
    /// Дозвіл змінився: назва мережі могла з'явитись або зникнути.
    var onChange: (() -> Void)?

    override init() {
        super.init()
        location.delegate = self
    }

    /// `granted` | `denied` | `restricted` | `notDetermined` (PrivacyAccess).
    var access: String { PrivacyAccess.name(location.authorizationStatus) }

    /// Лише з кнопки «Надати…» (запит сервера `requestAccess`): поки не визначено — системне вікно macOS,
    /// після відмови — розділ «Служби локації» в налаштуваннях.
    func requestAccess() {
        switch location.authorizationStatus {
        case .notDetermined: location.requestWhenInUseAuthorization()
        case .denied, .restricted: PrivacyAccess.openSettings("Privacy_LocationServices")
        default: break
        }
    }

    var ssid: String? { CWWiFiClient.shared().interface()?.ssid() }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        onChange?()
    }
}
