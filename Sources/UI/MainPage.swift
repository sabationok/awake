/// Сторінки головного вікна. `.remote` — сторінка дерева від агента, решту малює сам застосунок.
enum MainPage: Hashable, Identifiable {
    case remote(id: String)
    case permission
    case connection

    var id: MainPage { self }
}
