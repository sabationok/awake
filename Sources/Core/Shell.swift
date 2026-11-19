import Foundation

/// Синхронний запуск системних команд.
enum Shell {
    struct Result {
        let status: Int32
        let output: String
        var succeeded: Bool { status == 0 }
        var lines: [String] { output.split(separator: "\n").map(String.init) }
    }

    static func run(_ path: String, _ args: [String] = [], environment: [String: String]? = nil) -> Result {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: path)
        process.arguments = args
        if let environment { process.environment = environment }
        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe
        do { try process.run() } catch { return Result(status: -1, output: error.localizedDescription) }
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        return Result(status: process.terminationStatus, output: String(decoding: data, as: UTF8.self))
    }
}
