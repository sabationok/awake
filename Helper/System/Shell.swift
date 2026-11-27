import Darwin
import Foundation

/// Синхронний запуск системних команд: posix_spawn + waitpid, без Process.
/// Process.waitUntilExit крутить run loop main-потоку і чекає звідти сповіщення про завершення; відколи на main живуть
/// CoreLocation і CoreBluetooth, таке сповіщення губилось, і помічник висів на першому ж `pmset -g`.
enum Shell {
    struct Result {
        let status: Int32
        let output: String
        var succeeded: Bool { status == 0 }
        var lines: [String] { output.split(separator: "\n").map(String.init) }
    }

    static func run(_ path: String, _ args: [String] = [], environment: [String: String]? = nil) -> Result {
        var fds: [Int32] = [0, 0]
        guard pipe(&fds) == 0 else { return Result(status: -1, output: "pipe failed") }
        var actions: posix_spawn_file_actions_t?
        posix_spawn_file_actions_init(&actions)
        defer { posix_spawn_file_actions_destroy(&actions) }
        posix_spawn_file_actions_addopen(&actions, 0, "/dev/null", O_RDONLY, 0)
        posix_spawn_file_actions_adddup2(&actions, fds[1], 1)
        posix_spawn_file_actions_adddup2(&actions, fds[1], 2)
        posix_spawn_file_actions_addclose(&actions, fds[0])
        posix_spawn_file_actions_addclose(&actions, fds[1])

        let argv = ([path] + args).map { strdup($0) } + [nil]
        let envStrings = environment.map { $0.map { "\($0.key)=\($0.value)" } }
        let envp = envStrings.map { $0.map { strdup($0) } + [nil] }
        defer {
            argv.forEach { free($0) }
            envp?.forEach { free($0) }
        }
        var pid: pid_t = 0
        let spawned = envp.map { posix_spawn(&pid, path, &actions, nil, argv, $0) } ?? posix_spawn(&pid, path, &actions, nil, argv, environ)
        close(fds[1])
        guard spawned == 0 else {
            close(fds[0])
            return Result(status: -1, output: String(cString: strerror(spawned)))
        }
        let data = FileHandle(fileDescriptor: fds[0], closeOnDealloc: true).readDataToEndOfFile()
        var status: Int32 = 0
        while waitpid(pid, &status, 0) == -1 && errno == EINTR {}
        let code = (status & 0x7f) == 0 ? (status >> 8) & 0xff : 128 + (status & 0x7f)
        return Result(status: code, output: String(decoding: data, as: UTF8.self))
    }
}
