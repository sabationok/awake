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
/// Широке вікно: повне меню поруч зі сторінкою. Вузьке: меню стискається в іконковий рейл.
/// Кнопки-перемикача немає: ширину меню задає ширина вікна.
/// Назва вибраного розділу йде в заголовок вікна (`navigationTitle`), сторінка свого заголовка не малює.
/// Універсальний: не знає про конкретні розділи, лише отримує секції і замикання.
struct AdaptiveSidebar<Item: Identifiable & Hashable, Content: View, Footer: View>: View {
    @Binding var selection: Item
    let sections: [SidebarSection<Item>]
    let title: (Item) -> String
    let symbol: (Item) -> String
    /// Вимкнений пункт: сірий, без вибору; текст — підказка, чому. nil — звичайний.
    var disabledReason: (Item) -> String? = { _ in nil }
    @ViewBuilder let footer: () -> Footer
    @ViewBuilder let content: (Item) -> Content

    private let pinnedWidth: CGFloat = 640
    private let expandedWidth: CGFloat = 200
    private let railWidth: CGFloat = 56

    var body: some View {
        GeometryReader { geo in
            let compact = geo.size.width < pinnedWidth
            HStack(spacing: 0) {
                panel(compact: compact)
                Divider()
                content(selection).background(Palette.content)
            }
            .animation(.easeOut(duration: 0.22), value: compact)
        }
        .navigationTitle(title(selection))
    }

    /// Панель меню. Згорнута в рейл показує лише іконки, футер прихований.
    private func panel(compact: Bool) -> some View {
        VStack(spacing: 0) {
            if compact {
                rail
            } else {
                list
                Divider()
                footer()
            }
        }
        .frame(width: compact ? railWidth : expandedWidth)
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
            Label(title(item), systemImage: symbol(item))
                .foregroundStyle(.tertiary)
                .selectionDisabled()
                .help(reason)
                .tag(item)
        } else {
            Label(title(item), systemImage: symbol(item)).tag(item)
        }
    }

    /// Розгорнуті батьківські пункти (за назвою, щоб пам'ятати між запусками). За замовчуванням усе згорнуто.
    @AppStorage("adaptiveSidebar.expanded") private var expanded = ""

    private func expansion(of item: Item) -> Binding<Bool> {
        let key = title(item)
        return Binding(
            get: { expanded.split(separator: "\n").contains(Substring(key)) },
            set: { open in
                var keys = expanded.split(separator: "\n").map(String.init).filter { $0 != key }
                if open { keys.append(key) }
                expanded = keys.joined(separator: "\n")
            }
        )
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
        let reason = disabledReason(item)
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
        .disabled(reason != nil)
        .help(reason.map { "\(title(item)): \($0)" } ?? title(item))
        .accessibilityLabel(title(item))
    }
}
