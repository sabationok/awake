import Foundation

enum LayoutOrigin { case socket, file }

/// The app's only state: the route index the server pushed, the pages it has, and whether the socket is up. The page
/// on screen is asked with `{"type":"layout.get","data":{pageId,ifRev}}`; the server answers with that page (or
/// `layout.notModified`) and then pushes it again whenever its `rev` changes. Clicks go back as
/// `{"type":"event","data":UiEvent}`. The app owns no session logic.
@MainActor
final class ServerConnection: ObservableObject {
    @Published var shell: UiShell?
    /// Pages the app has, by id; built into render nodes when they arrive.
    @Published var pages: [String: UiPageContent] = [:]
    /// Pages the server does not know (`layout.notFound`).
    @Published var missing: Set<String> = []
    @Published var connected = false
    @Published var problem: String?
    /// Where the layout comes from (web `UiSource`): the running server's socket, or a file for snapshots.
    @Published var origin: LayoutOrigin = .socket
    /// The raw line of the last page, for `--perf` (replays it as the server's echo).
    private(set) var lastPageLine: Data?
    private let link = SocketLink(path: ServerLauncher.socketPath)
    /// The page on screen: asked again after a reconnect (a restarted server knows nothing about it).
    private var current: String?
    /// Opened pages, last at the end; older ones beyond `cachedPages` are dropped.
    private var recent: [String] = []
    private let cachedPages = 8

    private struct Envelope: Decodable { let type: String }
    private struct Payload<T: Decodable>: Decodable { let data: T }
    private struct PageRef: Decodable { let pageId: String }
    private struct Outgoing: Encodable { let type = "event"; let data: UiEvent }
    private struct LayoutGet: Encodable {
        struct Request: Encodable { let pageId: String; let ifRev: String? }
        let type = "layout.get"
        let data: Request
    }
    /// A server line, decoded off the main thread.
    private enum Incoming {
        case shell(UiShell)
        case page(UiPageContent)
        case notModified
        case notFound(String)
    }
    private var timer: Timer?

    /// `launch: false` only reads (scripted snapshots): it never starts a server, it waits for the running one. The
    /// only line it sends is `layout.get` for the page it draws.
    func start(launch: Bool = true) {
        // Decoding a page runs on the socket's thread, not the main one.
        link.onLine = { [weak self] line in
            guard let decoded = Self.decode(line) else { return }
            Task { @MainActor in self?.apply(decoded, line: line) }
        }
        link.onState = { [weak self] up in
            Task { @MainActor in
                self?.connected = up
                if up { self?.request() }
            }
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

    /// Snapshot only: `{"shell": UiShell, "pages": {"<id>": UiPageLayout}}` from a file, no socket. Sends go nowhere.
    func load(file: String) {
        struct Snapshot: Decodable { let shell: UiShell; let pages: [String: UiPageLayout] }
        do {
            let snapshot = try UiLayoutDecoder.decoder.decode(Snapshot.self, from: Data(contentsOf: URL(fileURLWithPath: file)))
            shell = snapshot.shell
            pages = try snapshot.pages.mapValues { UiPageContent(id: $0.id, rev: $0.rev, nodes: try $0.renderNodes()) }
            connected = true
            origin = .file
        } catch {
            problem = "Знімок з файлу не розібрався: \(error)"
        }
    }

    /// The page on screen: asked from the server with the `rev` the app has; the answer replaces it if it changed.
    func open(_ pageId: String) {
        guard current != pageId else { return }
        current = pageId
        recent.removeAll { $0 == pageId }
        recent.append(pageId)
        if recent.count > cachedPages {
            let dropped = recent.prefix(recent.count - cachedPages)
            recent.removeFirst(dropped.count)
            dropped.forEach { pages[$0] = nil }
        }
        request()
    }

    func send(_ event: UiEvent) {
        guard let data = try? JSONEncoder().encode(Outgoing(data: event)) else { return }
        link.send(data)
    }

    private func request() {
        guard origin == .socket, let pageId = current,
              let data = try? JSONEncoder().encode(LayoutGet(data: .init(pageId: pageId, ifRev: pages[pageId]?.rev))) else { return }
        link.send(data)
    }

    /// `--perf`: decode the last page again as if the server pushed it (the echo after a `.setting`), here on the
    /// main thread to time it. Returns the decode time in ms.
    func replayLast() -> Double {
        guard let line = lastPageLine else { return 0 }
        let t0 = PerfProbe.now()
        guard let decoded = Self.decode(line) else { return 0 }
        let decodedIn = PerfProbe.now() - t0
        apply(decoded, line: line)
        return decodedIn
    }

    /// nil for a line the app does not read. Safe off the main thread.
    nonisolated private static func decode(_ line: Data) -> Result<Incoming, Error>? {
        guard let envelope = try? JSONDecoder().decode(Envelope.self, from: line) else { return nil }
        switch envelope.type {
        case "shell":
            return Result { .shell(try UiLayoutDecoder.decoder.decode(Payload<UiShell>.self, from: line).data) }
        case "layout.page":
            return Result {
                let page = try UiLayoutDecoder.decoder.decode(Payload<UiPageLayout>.self, from: line).data
                return .page(UiPageContent(id: page.id, rev: page.rev, nodes: try page.renderNodes()))
            }
        case "layout.notModified":
            return .success(.notModified)
        case "layout.notFound":
            return Result { .notFound(try JSONDecoder().decode(Payload<PageRef>.self, from: line).data.pageId) }
        default:
            return nil
        }
    }

    private func apply(_ decoded: Result<Incoming, Error>, line: Data) {
        switch decoded {
        case .success(.shell(let next)):
            if shell != next { shell = next }
            problem = nil
        case .success(.page(let next)):
            lastPageLine = line
            // Pushes for pages the app no longer keeps (watched on the server, dropped here) are ignored.
            guard recent.contains(next.id) || origin == .file else { return }
            if pages[next.id] != next { pages[next.id] = next }
            missing.remove(next.id)
            problem = nil
        case .success(.notModified):
            break
        case .success(.notFound(let pageId)):
            pages[pageId] = nil
            missing.insert(pageId)
        case .failure(let error):
            problem = "Сторінка не розібралась: \(error)"
        }
    }
}
