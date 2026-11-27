import CoreGraphics
import Foundation

/// Яскравість вбудованого дисплея через приватний DisplayServices, як клавіші F1/F2. Root і дозволи не потрібні.
/// Зовнішні монітори так не керуються (їм треба DDC/CI), а закрита кришка ховає вбудований дисплей: тоді nil.
enum BrightnessService {
    private typealias GetFunction = @convention(c) (CGDirectDisplayID, UnsafeMutablePointer<Float>) -> Int32
    private typealias SetFunction = @convention(c) (CGDirectDisplayID, Float) -> Int32

    private static let handle = dlopen("/System/Library/PrivateFrameworks/DisplayServices.framework/DisplayServices", RTLD_LAZY)

    private static let getBrightness: GetFunction? = {
        guard let handle, let symbol = dlsym(handle, "DisplayServicesGetBrightness") else { return nil }
        return unsafeBitCast(symbol, to: GetFunction.self)
    }()

    private static let setBrightness: SetFunction? = {
        guard let handle, let symbol = dlsym(handle, "DisplayServicesSetBrightness") else { return nil }
        return unsafeBitCast(symbol, to: SetFunction.self)
    }()

    /// Яскравість 0…100 або nil без вбудованого дисплея.
    static func brightness() -> Int? {
        guard let getBrightness, let display = builtinDisplay() else { return nil }
        var value = Float(0)
        guard getBrightness(display, &value) == 0 else { return nil }
        return Int((value * 100).rounded())
    }

    @discardableResult
    static func setBrightness(_ percent: Int) -> Bool {
        guard let setBrightness, let display = builtinDisplay() else { return false }
        return setBrightness(display, Float(min(max(percent, 0), 100)) / 100) == 0
    }

    private static func builtinDisplay() -> CGDirectDisplayID? {
        var displays = [CGDirectDisplayID](repeating: 0, count: 16)
        var count = UInt32(0)
        guard CGGetActiveDisplayList(UInt32(displays.count), &displays, &count) == .success else { return nil }
        return displays.prefix(Int(count)).first { CGDisplayIsBuiltin($0) != 0 }
    }
}
