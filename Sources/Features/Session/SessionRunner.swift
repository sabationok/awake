import Foundation

/// Запускає сесію awake дочірнім процесом і віддає її вивід построково.
/// Зупинка йде через SIGTERM: скрипт ловить його, повертає сон і шле повідомлення.
@MainActor
final class SessionRunner {
    private var process: Process?
    private var buffer = ""

    var isRunning: Bool { process?.isRunning ?? false }

    func start(duration: String,
               onLine: @escaping (String) -> Void,
               onExit: @escaping () -> Void) throws {
        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: "/bin/bash")
        proc.arguments = [AwakeScript.url.path, duration]
        proc.environment = AwakeScript.environment

        let pipe = Pipe()
        proc.standardOutput = pipe
        proc.standardError = pipe
        pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let chunk = String(decoding: handle.availableData, as: UTF8.self)
            Task { @MainActor in self?.consume(chunk, onLine) }
        }
        proc.terminationHandler = { [weak self] _ in
            pipe.fileHandleForReading.readabilityHandler = nil
            Task { @MainActor in
                self?.process = nil
                onExit()
            }
        }

        buffer = ""
        try proc.run()
        process = proc
    }

    func stop() {
        process?.terminate()
    }

    /// Блокуючий варіант для виходу з аппки.
    func stopAndWait(timeout: TimeInterval = 5) {
        guard let proc = process, proc.isRunning else { return }
        proc.terminate()
        let deadline = Date().addingTimeInterval(timeout)
        while proc.isRunning && Date() < deadline { usleep(50_000) }
    }

    private func consume(_ chunk: String, _ onLine: (String) -> Void) {
        buffer += chunk
        while let newline = buffer.firstIndex(of: "\n") {
            let line = buffer[..<newline].trimmingCharacters(in: .whitespaces)
            buffer = String(buffer[buffer.index(after: newline)...])
            if !line.isEmpty { onLine(line) }
        }
    }
}
