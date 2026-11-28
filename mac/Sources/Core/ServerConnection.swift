import Foundation

enum LayoutOrigin { case socket, file }

/// The app's only state: the route index the server pushed, the pages it has, and whether the socket is up. The page
/// on screen is asked with `{"type":"layout.get","data":{pageId,ifRev}}`; the server answers with that page (or
/// `layout.notModified`) and then pushes it again whenever its `rev` changes. Clicks go back as
/// `{"type":"event","data":UiEvent}`. The app owns no session logic.
/// AppState comes on the same socket: `state.full` on connect, then `state.patch` with `rev` +1 (a gap → `state.get`).
/// A state change rebuilds the kept pages' nodes from their rows (`show` / `bind`), the layout is not asked again.
/// `notify` lines are the server's toasts.
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
    /// Toasts the server sent (`notify`), newest last, at most three.
    @Published var toasts: [Toast] = []
    /// Rows of the kept pages: rebuilt into `pages` when the state changes.
    private var layouts: [String: UiPageLayout] = [:]
    /// The app's AppState copy (raw JSON, the server owns its shape) and its `rev`.
    private var state: JSONValue?
    private var stateRev = 0
    /// Render generation per page: a slower render of older input never replaces a newer one.
    private var renders: [String: Int] = [:]
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
    private struct StateGet: Encodable { let type = "state.get"; let data: [String: String] = [:] }
    private struct LayoutGet: Encodable {
        struct Request: Encodable { let pageId: String; let ifRev: String? }
        let type = "layout.get"
        let data: Request
    }
    /// A server line, decoded off the main thread.
    private enum Incoming {
        case shell(UiShell)
        case page(UiPageLayout)
        case notModified
        case notFound(String)
        case stateFull(StateFullMessage)
        case statePatch(StatePatchMessage)
        case notify(UiNotify)
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
            dropped.forEach { pages[$0] = nil; layouts[$0] = nil; renders[$0] = nil }
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
        if case .success(.page(let layout)) = decoded { _ = try? layout.renderNodes(state: state) }
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
            return Result { .page(try UiLayoutDecoder.decoder.decode(Payload<UiPageLayout>.self, from: line).data) }
        case "layout.notModified":
            return .success(.notModified)
        case "layout.notFound":
            return Result { .notFound(try JSONDecoder().decode(Payload<PageRef>.self, from: line).data.pageId) }
        case "state.full":
            return Result { .stateFull(try JSONDecoder().decode(Payload<StateFullMessage>.self, from: line).data) }
        case "state.patch":
            return Result { .statePatch(try JSONDecoder().decode(Payload<StatePatchMessage>.self, from: line).data) }
        case "notify":
            return Result { .notify(try JSONDecoder().decode(Payload<UiNotify>.self, from: line).data) }
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
            layouts[next.id] = next
            render(next.id)
            missing.remove(next.id)
            problem = nil
        case .success(.notModified):
            break
        case .success(.notFound(let pageId)):
            pages[pageId] = nil
            layouts[pageId] = nil
            missing.insert(pageId)
        case .success(.stateFull(let full)):
            stateRev = full.rev
            setState(full.state)
        case .success(.statePatch(let patch)):
            // A gap or a patch before any full state: ask the whole state again.
            guard let current = state, patch.rev == stateRev + 1 else { return askState() }
            stateRev = patch.rev
            guard !patch.ops.isEmpty else { return }
            guard let next = AppStateJSON.apply(current, patch.ops) else { return askState() }
            setState(next)
        case .success(.notify(let notify)):
            show(notify)
        case .failure(let error):
            problem = "Сторінка не розібралась: \(error)"
        }
    }

    private func askState() {
        guard origin == .socket, let data = try? JSONEncoder().encode(StateGet()) else { return }
        link.send(data)
    }

    private func setState(_ next: JSONValue) {
        guard next != state else { return }
        state = next
        layouts.keys.forEach(render)
    }

    /// Rows + the current state → render nodes, off the main thread (dates and charts are parsed there).
    private func render(_ pageId: String) {
        guard let layout = layouts[pageId] else { return }
        let generation = (renders[pageId] ?? 0) + 1
        renders[pageId] = generation
        let snapshot = state
        Task { @MainActor [weak self] in
            let result = await Task.detached(priority: .userInitiated) { Result { try layout.renderNodes(state: snapshot) } }.value
            guard let self, self.renders[pageId] == generation, self.layouts[pageId] != nil else { return }
            switch result {
            case .success(let nodes):
                let next = UiPageContent(id: layout.id, rev: layout.rev, nodes: nodes)
                if self.pages[pageId] != next { self.pages[pageId] = next }
            case .failure(let error):
                self.problem = "Сторінка не розібралась: \(error)"
            }
        }
    }

    /// A server toast into the queue: 3.2 s (an error 6 s), at most three, as the web's `useToastQueue`.
    private func show(_ notify: UiNotify) {
        let kind: Toast.Kind = switch notify.kind {
        case .info: .info
        case .success: .success
        case .warning: .warning
        case .error: .error
        }
        let toast = Toast(kind: kind, title: notify.title, detail: notify.detail)
        toasts = Array(toasts.suffix(2)) + [toast]
        let seconds: Double = notify.kind == .error ? 6 : 3.2
        DispatchQueue.main.asyncAfter(deadline: .now() + seconds) { [weak self] in
            self?.toasts.removeAll { $0.id == toast.id }
        }
    }
}
