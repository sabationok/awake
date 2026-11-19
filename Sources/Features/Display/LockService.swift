import Foundation

/// Блокування екрана, як Ctrl+Cmd+Q. Root і дозволи не потрібні.
enum LockService {
    private typealias LockFunction = @convention(c) () -> Int32

    /// Приватна функція login.framework, яку використовує системне меню «Заблокувати екран».
    private static let lockNow: LockFunction? = {
        let path = "/System/Library/PrivateFrameworks/login.framework/Versions/Current/login"
        guard let handle = dlopen(path, RTLD_LAZY),
              let symbol = dlsym(handle, "SACLockScreenImmediate")
        else { return nil }
        return unsafeBitCast(symbol, to: LockFunction.self)
    }()

    static var isAvailable: Bool { lockNow != nil }

    /// Блокує сесію і гасить екран. Повертає false, якщо системний виклик недоступний:
    /// тоді лише гасимо екран, а пароль залежить від налаштувань «Замкненого екрана».
    @discardableResult
    static func lockAndSleepDisplay() -> Bool {
        let locked = lockNow.map { $0() == 0 } ?? false
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { DisplayService.sleepNow() }
        return locked
    }
}
