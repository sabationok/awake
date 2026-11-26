import AppKit
import SwiftUI

/// QR з сервера (посилання сполучення) по центру рядка. Коли код спливає, QR затемнюється, поки сервер не дасть новий.
struct UiQrView: View {
    let value: String
    let expiresAt: Date?

    var body: some View {
        QrCodeImage(text: value)
            .frame(width: 240, height: 240)
            .overlay {
                if let expiresAt {
                    TimelineView(.periodic(from: .now, by: 1)) { context in
                        if expiresAt <= context.date {
                            ZStack {
                                Color(nsColor: .windowBackgroundColor).opacity(0.85)
                                ProgressView()
                            }
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 4)
    }
}
