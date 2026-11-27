import SwiftUI

/// Пункт меню і його вкладені пункти (модуль Awake → Налаштування сесії, Стан, Трекінг).
struct SidebarNode<Item: Hashable>: Hashable {
    var item: Item
    var children: [Item] = []
}

/// Група пунктів меню, відділена від інших.
struct SidebarSection<Item: Hashable>: Hashable {
    var nodes: [SidebarNode<Item>]

    /// Усі пункти по порядку: батько, далі його діти.
    var items: [Item] { nodes.flatMap { [$0.item] + $0.children } }
}

/// Меню розділів і сторінка.
/// Широке вікно: повне меню поруч зі сторінкою. Вузьке: сторінка на всю ширину, а повне меню (з групами й
/// вкладеними пунктами) відкривається поверх неї кнопкою в тулбарі і закривається вибором пункту чи кліком поза ним.
/// У заголовку вікна — назва модуля; на вкладеній сторінці замість неї крихти «Модуль › Сторінка» в тулбарі.
/// Універсальний: не знає про конкретні розділи, лише отримує секції і замикання.
struct AdaptiveSidebar<Item: Identifiable & Hashable, Content: View, Footer: View>: View {
    @Binding var selection: Item
    let sections: [SidebarSection<Item>]
    let title: (Item) -> String
    let symbol: (Item) -> String
    /// Вимкнений пункт: сірий, без вибору; текст — підказка, чому. nil — звичайний.
    var disabledReason: (Item) -> String? = { _ in nil }
    /// Новий порядок пунктів першої секції (модулів) після «Упорядкувати» → «Готово». nil — кнопки немає.
    var onReorder: (([Item]) -> Void)? = nil
    @ViewBuilder let footer: () -> Footer
    @ViewBuilder let content: (Item) -> Content

    private let pinnedWidth: CGFloat = 640
    private let expandedWidth: CGFloat = 200
    private let overlayWidth: CGFloat = 260

    /// Меню поверх сторінки у вузькому вікні.
    @State private var overlayOpen = false
    /// Розгорнуті групи. На старті все згорнуто, між запусками не пам'ятається; закрите меню-оверлей згортає все.
    @State private var expanded: Set<String> = []
    /// Режим «Упорядкувати»: перша секція — плаский список, пункти перетягуються.
    @State private var organizing = false
    @State private var order: [Item] = []

    var body: some View {
        GeometryReader { geo in
            let compact = geo.size.width < pinnedWidth
            ZStack(alignment: .topLeading) {
                HStack(spacing: 0) {
                    if !compact {
                        panel.frame(width: expandedWidth)
                        Divider()
                    }
                    page
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Palette.content)
                }
                if compact {
                    // Меню завжди в ієрархії: відкриття й закриття — той самий зсув убік, анімований в обидва боки.
                    Color.black.opacity(overlayOpen ? 0.18 : 0)
                        .contentShape(Rectangle())
                        .allowsHitTesting(overlayOpen)
                        .onTapGesture { overlayOpen = false }
                    let width = min(overlayWidth, geo.size.width - 40)
                    panel
                        .frame(width: width)
                        .shadow(color: .black.opacity(overlayOpen ? 0.25 : 0), radius: 16, x: 4)
                        .offset(x: overlayOpen ? 0 : -width - 24)
                        .allowsHitTesting(overlayOpen)
                }
            }
            .animation(.easeOut(duration: 0.2), value: overlayOpen)
            .onChange(of: selection) { _, _ in overlayOpen = false }
            .onChange(of: overlayOpen) { _, open in
                if !open {
                    expanded = []
                    organizing = false
                }
            }
            .onChange(of: compact) { _, isCompact in if !isCompact { overlayOpen = false } }
            .toolbar {
                if compact {
                    ToolbarItem(placement: .navigation) {
                        Button {
                            overlayOpen.toggle()
                        } label: {
                            Image(systemName: "sidebar.left")
                        }
                        .help(overlayOpen ? "Сховати меню" : "Показати меню")
                    }
                }
                // Після кнопки меню: шлях вкладеної сторінки в рядку заголовка.
                ToolbarItem(placement: .navigation) { breadcrumbs }
            }
        }
        .navigationTitle(windowTitle)
    }

    /// Модуль вибраної сторінки (батько в меню); nil — вибрано головний пункт.
    private var parentNode: SidebarNode<Item>? {
        sections.lazy.flatMap(\.nodes).first { $0.children.contains(selection) }
    }

    /// Заголовок вікна: на головній сторінці модуля — його назва; на вкладеній порожній, шлях показують крихти в тулбарі.
    private var windowTitle: String { parentNode == nil ? title(selection) : "" }

    /// Крихти «Модуль › Сторінка» в рядку заголовка; модуль клікабельний.
    @ViewBuilder
    private var breadcrumbs: some View {
        if let parent = parentNode {
            HStack(spacing: 6) {
                Button(title(parent.item)) { selection = parent.item }
                    .buttonStyle(.plain)
                    .foregroundStyle(Color.accentColor)
                Image(systemName: "chevron.right").font(.caption).foregroundStyle(.tertiary)
                Text(title(selection)).fontWeight(.semibold)
            }
            .font(.headline)
            .fixedSize()
        }
    }

    private var page: some View { content(selection) }

    /// Повне меню: групи, вкладені пункти і футер — однакове поруч зі сторінкою і поверх неї.
    private var panel: some View {
        VStack(spacing: 0) {
            if organizing { organizeList } else { list }
            if onReorder != nil {
                Divider()
                organizeBar
            }
            Divider()
            footer()
        }
        .frame(maxHeight: .infinity)
        .background(.regularMaterial)
    }

    private var list: some View {
        List(selection: $selection) {
            ForEach(Array(sections.enumerated()), id: \.offset) { _, section in
                Section {
                    ForEach(section.nodes, id: \.item) { node in
                        if node.children.isEmpty {
                            label(node.item)
                        } else {
                            DisclosureGroup(isExpanded: expansion(of: node.item)) {
                                // Другий рівень без іконок: іконка лишається за модулем.
                                ForEach(node.children) { Text(title($0)).tag($0) }
                            } label: {
                                label(node.item)
                            }
                        }
                    }
                }
            }
        }
        .listStyle(.sidebar)
        .scrollContentBackground(.hidden)
    }

    @ViewBuilder
    private func label(_ item: Item) -> some View {
        if let reason = disabledReason(item) {
            itemLabel(item)
                .foregroundStyle(.tertiary)
                .selectionDisabled()
                .help(reason)
                .tag(item)
        } else {
            itemLabel(item).tag(item)
        }
    }

    /// Назва з іконкою модуля. Колір іконки явний: поверх сторінки sidebar-стиль списку її не підфарбовує.
    private func itemLabel(_ item: Item) -> some View {
        Label {
            Text(title(item))
        } icon: {
            Image(systemName: symbol(item)).foregroundStyle(Color.accentColor)
        }
    }

    private func expansion(of item: Item) -> Binding<Bool> {
        let key = title(item)
        return Binding(
            get: { expanded.contains(key) },
            set: { open in
                if open { expanded.insert(key) } else { expanded.remove(key) }
            }
        )
    }

    /// Пункти першої секції без вкладених: тягнеш — міняється порядок. Вибір сторінки на цей час вимкнений.
    private var organizeList: some View {
        List {
            Section {
                ForEach(order, id: \.self) { item in
                    HStack {
                        itemLabel(item)
                        Spacer()
                        Image(systemName: "line.3.horizontal").foregroundStyle(.tertiary)
                    }
                }
                .onMove { from, to in order.move(fromOffsets: from, toOffset: to) }
            } header: {
                Text("Перетягни модулі")
            }
        }
        .listStyle(.sidebar)
        .scrollContentBackground(.hidden)
    }

    /// Унизу меню: «Упорядкувати»; у режимі — «Скасувати» і «Готово».
    private var organizeBar: some View {
        HStack(spacing: 8) {
            if organizing {
                Button("Скасувати") { organizing = false }
                Spacer()
                Button("Готово") {
                    onReorder?(order)
                    organizing = false
                }
                .buttonStyle(.borderedProminent)
            } else {
                Button {
                    order = sections.first?.nodes.map(\.item) ?? []
                    expanded = []
                    organizing = true
                } label: {
                    Label("Упорядкувати", systemImage: "arrow.up.arrow.down")
                }
                .buttonStyle(.borderless)
                .help("Змінити порядок модулів у меню")
                Spacer()
            }
        }
        .controlSize(.small)
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }
}
