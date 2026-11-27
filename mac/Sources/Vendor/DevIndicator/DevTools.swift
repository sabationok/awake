import Foundation
import Observation

/// A dev-tool action. Runs on the main actor; may be async.
public typealias DevToolAction = @MainActor () async -> Void

public struct DevTool: Identifiable {
    public let id: String
    public let title: String
    public let systemImage: String?
    public let run: DevToolAction

    public init(id: String, title: String, systemImage: String? = nil, run: @escaping DevToolAction) {
        self.id = id
        self.title = title
        self.systemImage = systemImage
        self.run = run
    }
}

/// Registry of dev tools shown in the panel's «Інструменти» section.
/// Registering an existing id replaces that tool in place.
@Observable
public final class DevTools {
    public static let shared = DevTools()

    public private(set) var tools: [DevTool] = []

    public static func register(_ tool: DevTool) {
        shared.add(tool)
    }

    public static func unregister(id: String) {
        shared.remove(id: id)
    }

    private func add(_ tool: DevTool) {
        if let index = tools.firstIndex(where: { $0.id == tool.id }) {
            tools[index] = tool
        } else {
            tools.append(tool)
        }
    }

    private func remove(id: String) {
        tools.removeAll { $0.id == id }
    }
}
