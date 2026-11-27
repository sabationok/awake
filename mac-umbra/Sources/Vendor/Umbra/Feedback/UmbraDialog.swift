import SwiftUI

public extension View {
    /// Centred dialog (`.u-dialog`) over a blurred scrim. Escape or a click on the scrim closes it.
    /// Actions are usually `Button`s with `.umbra(...)` styles, the main one last.
    func umbraDialog<Body: View, Actions: View>(
        isPresented: Binding<Bool>,
        title: String,
        @ViewBuilder content: @escaping () -> Body,
        @ViewBuilder actions: @escaping () -> Actions
    ) -> some View {
        overlay {
            if isPresented.wrappedValue {
                UmbraDialogOverlay(isPresented: isPresented, title: title, content: content, actions: actions)
                    .transition(.opacity)
            }
        }
        .animation(.easeOut(duration: 0.15), value: isPresented.wrappedValue)
    }
}

struct UmbraDialogOverlay<Body: View, Actions: View>: View {
    @Binding var isPresented: Bool
    let title: String
    let content: () -> Body
    let actions: () -> Actions
    @Environment(\.umbra) private var theme

    var body: some View {
        let p = theme.palette
        ZStack {
            p.scrim
                .background(.ultraThinMaterial.opacity(theme.translucent ? 0.6 : 0))
                .ignoresSafeArea()
                .onTapGesture { isPresented = false }
            VStack(alignment: .leading, spacing: 16) {
                Text(title).font(.system(size: 15, weight: .semibold))
                content()
                    .font(.system(size: 12))
                    .foregroundStyle(p.fg2)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 8) {
                    Spacer(minLength: 0)
                    actions()
                }
            }
            .padding(22)
            .frame(maxWidth: 420, alignment: .leading)
            .umbraSurface(.overlay, radius: UmbraRadius.lg)
            .padding(16)
            .onExitCommand { isPresented = false }
            .accessibilityAddTraits(.isModal)
        }
    }
}
