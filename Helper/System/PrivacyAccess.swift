import CoreBluetooth
import CoreLocation
import Foundation

/// Стан дозволу macOS (TCC) словами протоколу: `granted` | `denied` | `restricted` | `notDetermined`.
/// Системне вікно запиту помічник показує лише за запитом сервера `requestAccess` (кнопка «Надати…» в аппці на Mac),
/// ніколи сам: ні на старті, ні після збірки чи встановлення.
enum PrivacyAccess {
    static func name(_ status: CLAuthorizationStatus) -> String {
        switch status {
        case .authorizedAlways, .authorizedWhenInUse: "granted"
        case .denied: "denied"
        case .restricted: "restricted"
        default: "notDetermined"
        }
    }

    static func name(_ authorization: CBManagerAuthorization) -> String {
        switch authorization {
        case .allowedAlways: "granted"
        case .denied: "denied"
        case .restricted: "restricted"
        default: "notDetermined"
        }
    }

    /// Відмову macOS вдруге не питає: лишається відкрити потрібний розділ «Приватність і безпека».
    static func openSettings(_ pane: String) {
        _ = Shell.run("/usr/bin/open", ["x-apple.systempreferences:com.apple.preference.security?\(pane)"])
    }
}
