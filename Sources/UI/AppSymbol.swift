/// Символи, спільні для вікна і меню-бару.
enum AppSymbol {
    static func cup(active: Bool) -> String { active ? "cup.and.saucer.fill" : "cup.and.saucer" }
}
