import SwiftUI

/// Група пунктів меню. Із заголовком, якщо пункти належать чомусь більшому (модуль Awake → його сторінки).
struct SidebarSection<Item: Hashable>: Hashable {
    var title: String?
    var items: [Item]
}

/// Меню розділів і сторінка.
/// Широке вікно: меню стоїть поруч і згортається в іконковий рейл. Вузьке: меню виїжджає поверх.
/// Заголовок сторінки і кнопки вікна лежать в одному рядку висотою `topRowHeight`.
/// Універсальний: не знає про конкретні розділи, лише отримує секції і замикання.
struct AdaptiveSidebar<Item: Identifiable & Hashable, Content: View, Footer: View>: View {
    @Binding var selection: Item
    let sections: [SidebarSection<Item>]
    let title: (Item) -> String
    let symbol: (Item) -> String
    @ViewBuilder let footer: () -> Footer
    @ViewBuilder let content: (Item) -> Content

    /// Широке вікно: меню згорнуто в рейл.
    @AppStorage("adaptiveSidebar.collapsed") private var collapsed = false
    /// Вузьке вікно: меню показано поверх сторінки.
    @AppStorage("adaptiveSidebar.open") private var overlayOpen = true

    private let pinnedWidth: CGFloat = 640
    private let expandedWidth: CGFloat = 200
    private let railWidth: CGFloat = 56
    private let topRowHeight: CGFloat = 52

    var body: some View {
        GeometryReader { geo in
            let pinned = geo.size.width >= pinnedWidth
            ZStack(alignment: .leading) {
                if pinned {
                    HStack(spacing: 0) {
                        panel(compact: collapsed) { }
                        Divider()
                        detail
                    }
                } else {
                    detail
                    if overlayOpen { overlay }
                }
            }
            .animation(.easeOut(duration: 0.22), value: collapsed)
            .animation(.easeOut(duration: 0.22), value: overlayOpen)
            .toolbar {
                ToolbarItem(placement: .navigation) {
                    Button {
                        if pinned { collapsed.toggle() } else { overlayOpen.toggle() }
                    } label: {
                        Image(systemName: "sidebar.left")
                    }
                    .help("Розділи")
                }
            }
        }
        .ignoresSafeArea()
        .onExitCommand { overlayOpen = false }
        .navigationTitle("")
    }

    /// Сторінка: заголовок у верхньому рядку, нижче вміст вибраного розділу.
    private var detail: some View {
        content(selection)
            .safeAreaInset(edge: .top, spacing: 0) {
                Text(title(selection))
                    .font(.title2.weight(.semibold))
                    .frame(maxWidth: .infinity, minHeight: topRowHeight, alignment: .leading)
                    .padding(.horizontal, 20)
                    .background(.background)
            }
        .background(Palette.content)
    }

    /// Затемнення і меню поверх сторінки. Клік поза меню або вибір розділу закриває його.
    @ViewBuilder
    private var overlay: some View {
        Color.black.opacity(0.15)
            .ignoresSafeArea()
            .onTapGesture { overlayOpen = false }
            .transition(.opacity)

        panel(compact: false) { overlayOpen = false }
            .transition(.move(edge: .leading))
    }

    /// Панель меню. Верхній рядок порожній, щоб меню не сідало під кнопки вікна.
    /// Згорнута панель показує лише іконки, футер прихований.
    private func panel(compact: Bool, onPick: @escaping () -> Void) -> some View {
        VStack(spacing: 0) {
            Color.clear.frame(height: topRowHeight)
            if compact {
                rail
            } else {
                list(onPick: onPick)
                Divider()
                footer()
            }
        }
        .frame(width: compact ? railWidth : expandedWidth)
        .frame(maxHeight: .infinity)
        .background(.regularMaterial)
    }

    private func list(onPick: @escaping () -> Void) -> some View {
        List(selection: $selection) {
            ForEach(Array(sections.enumerated()), id: \.offset) { _, section in
                Section {
                    ForEach(section.items) { item in
                        Label(title(item), systemImage: symbol(item)).tag(item)
                    }
                } header: {
                    if let header = section.title { Text(header) }
                }
            }
        }
        .listStyle(.sidebar)
        .scrollContentBackground(.hidden)
        .onChange(of: selection) { _, _ in onPick() }
    }

    /// Іконковий рейл: ті самі розділи, лише символи. Назва з'являється підказкою.
    private var rail: some View {
        VStack(spacing: 6) {
            ForEach(Array(sections.enumerated()), id: \.offset) { index, section in
                if index > 0 {
                    Divider().padding(.vertical, 4)
                }
                ForEach(section.items) { item in
                    railButton(item)
                }
            }
            Spacer()
        }
        .padding(.top, 8)
    }

    private func railButton(_ item: Item) -> some View {
        let selected = item == selection
        return Button {
            selection = item
        } label: {
            Image(systemName: symbol(item))
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(selected ? Color.white : Color.secondary)
                .frame(width: 36, height: 30)
                .background(selected ? Color.accentColor : Color.clear, in: RoundedRectangle(cornerRadius: 7))
        }
        .buttonStyle(.plain)
        .help(title(item))
        .accessibilityLabel(title(item))
    }
}
