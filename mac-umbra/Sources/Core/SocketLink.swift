import Darwin
import Foundation

/// Blocking JSON-lines link over the server's Unix socket, on its own thread. Reconnects every second.
/// Bytes are buffered and split on `\n`, so a multi-byte character cut by a read boundary stays whole.
final class SocketLink: @unchecked Sendable {
    let path: String
    var onLine: (Data) -> Void = { _ in }
    var onState: (Bool) -> Void = { _ in }
    var onConnectFailed: () -> Void = {}
    private let lock = NSLock()
    private var fd: Int32 = -1

    init(path: String) { self.path = path }

    func start() {
        let thread = Thread { [self] in run() }
        thread.name = "mac-umbra.socket"
        thread.start()
    }

    func send(_ line: Data) {
        lock.lock(); let s = fd; lock.unlock()
        guard s >= 0 else { return }
        var data = line
        data.append(0x0A)
        data.withUnsafeBytes { raw in
            var offset = 0
            while offset < raw.count {
                let n = Darwin.write(s, raw.baseAddress! + offset, raw.count - offset)
                if n <= 0 { return }
                offset += n
            }
        }
    }

    private func run() {
        while true {
            let s = socket(AF_UNIX, SOCK_STREAM, 0)
            if s >= 0, connect(s) {
                var on: Int32 = 1
                setsockopt(s, SOL_SOCKET, SO_NOSIGPIPE, &on, socklen_t(MemoryLayout<Int32>.size))
                lock.lock(); fd = s; lock.unlock()
                onState(true)
                readLoop(s)
                lock.lock(); fd = -1; lock.unlock()
                Darwin.close(s)
                onState(false)
            } else {
                if s >= 0 { Darwin.close(s) }
                onConnectFailed()
            }
            Thread.sleep(forTimeInterval: 1)
        }
    }

    private func connect(_ s: Int32) -> Bool {
        var addr = sockaddr_un()
        addr.sun_family = sa_family_t(AF_UNIX)
        let bytes = Array(path.utf8)
        guard bytes.count < MemoryLayout.size(ofValue: addr.sun_path) else { return false }
        withUnsafeMutableBytes(of: &addr.sun_path) { raw in
            raw.copyBytes(from: bytes)
            raw[bytes.count] = 0
        }
        return withUnsafePointer(to: &addr) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                Darwin.connect(s, $0, socklen_t(MemoryLayout<sockaddr_un>.size)) == 0
            }
        }
    }

    private func readLoop(_ s: Int32) {
        var buffer = Data()
        var chunk = [UInt8](repeating: 0, count: 65536)
        while true {
            let n = Darwin.read(s, &chunk, chunk.count)
            if n <= 0 { return }
            buffer.append(chunk, count: n)
            while let nl = buffer.firstIndex(of: 0x0A) {
                let line = buffer.subdata(in: buffer.startIndex..<nl)
                buffer.removeSubrange(buffer.startIndex...nl)
                if !line.isEmpty { onLine(line) }
            }
        }
    }
}
