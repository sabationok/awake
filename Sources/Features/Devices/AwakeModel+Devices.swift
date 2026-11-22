import Foundation

/// Сторінка «Пристрої»: запити до агента йдуть лише через stdin, тож керувати пристроями можна тільки з цього Mac.
extension AwakeModel {
    private struct DevicesRequest: Encodable {
        let action: String
        var id: Int?
        var requestId: String?
        var approve: Bool?
    }

    /// Свіжий список і новий код, якщо старий протух.
    func refreshDevices() {
        agent.send(type: "devices", data: DevicesRequest(action: "refresh"))
    }

    /// «Новий код»: старий перестає діяти, обидва посилання отримують новий.
    func newPairingCode() {
        agent.send(type: "devices", data: DevicesRequest(action: "newCode"))
    }

    /// Найстаріший запит «Це ви?», що ще не протух. Його показує діалог у головному вікні.
    var pendingPairingRequest: AgentDevices.Request? {
        devices?.requests.first { $0.expiresAt > Date() }
    }

    /// Відповідь на «Це ви?»: лише після «Дозволити» пристрій отримає свій токен.
    func answerPairing(_ request: AgentDevices.Request, approve: Bool) {
        agent.send(type: "devices", data: DevicesRequest(action: "answer", requestId: request.id, approve: approve))
    }

    /// Токен пристрою перестає діяти на наступному ж запиті.
    func revokeDevice(_ id: Int) {
        agent.send(type: "devices", data: DevicesRequest(action: "revoke", id: id))
    }
}
