import Foundation

/// Через скільки секунд бездіяльності гасити екран під час сесії.
struct DisplayOffOption: Identifiable, Hashable {
    let id: Int          // секунди, -1 означає «як у системі»
    let title: String

    var seconds: Int? { id < 0 ? nil : id }

    static let all: [DisplayOffOption] = [
        .init(id: -1, title: "Як у системі"),
        .init(id: 5, title: "Одразу"),
        .init(id: 30, title: "Через 30 с"),
        .init(id: 60, title: "Через 1 хв"),
        .init(id: 120, title: "Через 2 хв"),
    ]

    private static let defaultsKey = "displayOff"

    /// Вибір користувача, збережений між запусками.
    static var saved: DisplayOffOption {
        get {
            let id = UserDefaults.standard.object(forKey: defaultsKey) as? Int ?? -1
            return all.first { $0.id == id } ?? all[0]
        }
        set { UserDefaults.standard.set(newValue.id, forKey: defaultsKey) }
    }
}
