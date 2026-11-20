/// Хто почав чи зупинив сесію. Агент пише це в історію сесій.
enum SessionSource: String, Decodable {
    case mac, telegram, web
}
