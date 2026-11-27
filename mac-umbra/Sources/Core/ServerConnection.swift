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
    private let link = SocketLink(path: ServerLauncher.socketPath)

    private struct Envelope: Decodable { let type: String }
    private struct TreeEnvelope: Decodable { let data: UiTree }
    private struct Outgoing: Encodable { let type = "event"; let data: UiEvent }

    /// `launch: false` only reads (scripted snapshots): it never starts a server, it waits for the running one.
    func start(launch: Bool = true) {
        link.onLine = { [weak self] line in Task { @MainActor in self?.handle(line) } }
        link.onState = { [weak self] up in Task { @MainActor in self?.connected = up } }
        link.onConnectFailed = { [weak self] in
            guard launch else { return }
            let note = ServerLauncher.launchIfNeeded()
            Task { @MainActor in if let note { self?.problem = note } }
        }
        link.start()
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

    private func handle(_ line: Data) {
        guard let envelope = try? JSONDecoder().decode(Envelope.self, from: line), envelope.type == "tree" else { return }
        do {
            tree = try UiTreeDecoder.decoder.decode(TreeEnvelope.self, from: line).data
            problem = nil
        } catch {
            problem = "Дерево не розібралось: \(error)"
        }
    }
}
