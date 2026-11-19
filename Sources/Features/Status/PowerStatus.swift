/// Знімок стану живлення.
struct PowerStatus: Equatable {
    var percent: Int?
    var onAC: Bool

    static let unknown = PowerStatus(percent: nil, onAC: true)
}
