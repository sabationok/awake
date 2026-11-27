import Darwin
import Foundation

/// macOS приписує дозволи (TCC: Bluetooth, геолокація) «відповідальному» процесу. Для підпроцесу це той, хто його
/// запустив: сервер на node, а над ним MaControl.app або Terminal. Тоді дозвіл питали б від їх імені й з їх Info.plist,
/// і він злітав би разом з ними. Помічник перезапускає себе з `responsibility_spawnattrs_setdisclaim`: новий процес
/// відповідає сам за себе, і macOS бере дозволи й тексти з MaControlHelper.app.
///
/// Функція приватна (spawn_private.h), тому через dlsym і з запасним шляхом: немає її — помічник працює як є, просто
/// без власних дозволів. App Store таке не пропустить; MaControl туди не йде.
enum Responsibility {
    private static let marker = "MC_HELPER_DISCLAIMED"

    /// Повертає керування лише в процесі, що вже відповідає сам за себе, або коли перезапуск неможливий.
    /// Інакше цей процес стає «трампліном»: чекає на дочірній, пересилає йому сигнали і виходить з його кодом.
    /// stdin / stdout дочірній успадковує, тож протокол із сервером іде напряму, повз трамплін.
    static func disclaimIfNeeded() {
        guard ProcessInfo.processInfo.environment[marker] == nil,
              let symbol = dlsym(UnsafeMutableRawPointer(bitPattern: -2), "responsibility_spawnattrs_setdisclaim"),
              let path = Bundle.main.executablePath else { return }
        typealias SetDisclaim = @convention(c) (UnsafeMutablePointer<posix_spawnattr_t?>, CBool) -> Int32
        let setDisclaim = unsafeBitCast(symbol, to: SetDisclaim.self)
        var attributes: posix_spawnattr_t?
        posix_spawnattr_init(&attributes)
        defer { posix_spawnattr_destroy(&attributes) }
        guard setDisclaim(&attributes, true) == 0 else { return }
        setenv(marker, "1", 1)
        var pid: pid_t = 0
        guard posix_spawn(&pid, path, nil, &attributes, CommandLine.unsafeArgv, environ) == 0 else {
            unsetenv(marker)
            return
        }
        trampolineChild = pid
        for name in [SIGTERM, SIGINT, SIGHUP] {
            signal(name) { received in kill(trampolineChild, received) }
        }
        var status: Int32 = 0
        while waitpid(pid, &status, 0) == -1 && errno == EINTR {}
        // Аналог WIFEXITED / WEXITSTATUS: макросів у Swift немає.
        exit((status & 0x7f) == 0 ? (status >> 8) & 0xff : 128 + (status & 0x7f))
    }
}

/// Глобальна, бо обробник сигналу — C-функція без захоплень.
private var trampolineChild: pid_t = 0
