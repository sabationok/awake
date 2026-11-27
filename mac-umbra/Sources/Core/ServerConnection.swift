import Foundation

/// The app's only state: the last tree the server pushed and whether the socket is up. Clicks go back as
/// `{"type":"event","data":UiEvent}`. The app owns no session logic.
@MainActor
final class ServerConnection: ObservableObject {
    @Published var tree: UiTree?
    @Published var connected = false
    @Published var problem: String?
    private let link = SocketLink(path: ServerLauncher.socketPath)

    private struct Envelope: Decodable { let type: String }
    private struct TreeEnvelope: Decodable { let data: UiTree }
    private struct Outgoing: Encodable { let type = "event"; let data: UiEvent }

    func start() {
        link.onLine = { [weak self] line in Task { @MainActor in self?.handle(line) } }
        link.onState = { [weak self] up in Task { @MainActor in self?.connected = up } }
        link.onConnectFailed = { [weak self] in
            let note = ServerLauncher.launchIfNeeded()
            Task { @MainActor in if let note { self?.problem = note } }
        }
        link.start()
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
