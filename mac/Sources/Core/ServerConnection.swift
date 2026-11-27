import Foundation

enum TreeOrigin { case socket, file }

/// The app's only state: the last tree the server pushed and whether the socket is up. Clicks go back as
/// `{"type":"event","data":UiEvent}`. The app owns no session logic.
@MainActor
final class ServerConnection: ObservableObject {
    @Published var tree: UiTree?
    @Published var connected = false
    @Published var problem: String?
    /// Where the tree comes from (web `TreeOrigin`): the running server's socket, or a file for snapshots.
    @Published var origin: TreeOrigin = .socket
    /// The raw line of the last tree, for `--perf` (replays it as the server's echo).
    private(set) var lastTreeLine: Data?
    private let link = SocketLink(path: ServerLauncher.socketPath)

    private struct Envelope: Decodable { let type: String }
    private struct TreeEnvelope: Decodable { let data: UiTree }
    private struct Outgoing: Encodable { let type = "event"; let data: UiEvent }
    private var timer: Timer?

    /// `launch: false` only reads (scripted snapshots): it never starts a server, it waits for the running one.
    func start(launch: Bool = true) {
        // Decoding a tree (~240 KB) runs on the socket's thread, not the main one; a line equal to the last tree
        // (the server re-sends the whole tree on every change anywhere) is dropped before it is decoded.
        var lastLine: Data?
        link.onLine = { [weak self] line in
            guard let decoded = Self.decodeTree(line), line != lastLine else { return }
            lastLine = line
            Task { @MainActor in self?.apply(decoded, line: line) }
        }
        link.onState = { [weak self] up in
            Task { @MainActor in self?.connected = up }
        }
        link.onConnectFailed = { [weak self] in
            guard launch else { return }
            let note = ServerLauncher.launchIfNeeded()
            Task { @MainActor in if let note { self?.problem = note } }
        }
        link.start()
        guard launch else { return }
        timer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in
            Task { @MainActor in if let note = ServerLauncher.checkRunning() { self?.problem = note } }
        }
    }

    /// Snapshot only: a tree saved as plain `UiTree` JSON, no socket. Sends go nowhere.
    func load(file: String) {
        do {
            tree = try UiTreeDecoder.decoder.decode(UiTree.self, from: Data(contentsOf: URL(fileURLWithPath: file)))
            connected = true
            origin = .file
        } catch {
            problem = "Дерево з файлу не розібралось: \(error)"
        }
    }

    func send(_ event: UiEvent) {
        guard let data = try? JSONEncoder().encode(Outgoing(data: event)) else { return }
        link.send(data)
    }

    /// `--perf`: decode the last tree again as if the server pushed it (the echo after a `.setting`), here on the
    /// main thread to time it. Returns the decode time in ms.
    func replayLast() -> Double {
        guard let line = lastTreeLine else { return 0 }
        let t0 = PerfProbe.now()
        guard let decoded = Self.decodeTree(line) else { return 0 }
        let decodedIn = PerfProbe.now() - t0
        apply(decoded, line: line)
        return decodedIn
    }

    /// nil for a line that is not a tree. Safe off the main thread.
    nonisolated static func decodeTree(_ line: Data) -> Result<UiTree, Error>? {
        guard let envelope = try? JSONDecoder().decode(Envelope.self, from: line), envelope.type == "tree" else { return nil }
        return Result { try UiTreeDecoder.decoder.decode(TreeEnvelope.self, from: line).data }
    }

    private func apply(_ decoded: Result<UiTree, Error>, line: Data) {
        lastTreeLine = line
        switch decoded {
        case .success(let next):
            if tree != next { tree = next }
            problem = nil
        case .failure(let error):
            problem = "Дерево не розібралось: \(error)"
        }
    }
}
