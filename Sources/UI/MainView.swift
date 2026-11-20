import SwiftUI

/// Головне вікно: сторінки розділів у спільному `AdaptiveSidebar`.
struct MainView: View {
    @EnvironmentObject private var model: AwakeModel
    @EnvironmentObject private var updates: UpdateStatus
    @State private var page: SettingsPage = .session

    var body: some View {
        AdaptiveSidebar(
            selection: $page,
            sections: SettingsPage.groups,
            title: \.title,
            symbol: \.symbol,
            footer: { UpdateBanner(status: updates) }
        ) { page in
            if page == .settings {
                ModuleSettings()
            } else {
                Form {
                    content(for: page)
                }
                .formStyle(.grouped)
            }
        }
        .frame(minWidth: 460, idealWidth: 720, minHeight: 360, idealHeight: 520)
    }

    @ViewBuilder
    private func content(for page: SettingsPage) -> some View {
        switch page {
        case .session:
            SessionSection()
            StatusSection()
        case .status:
            StatusSection()
        case .tracking:
            TrackingSection()
        case .settings:
            EmptyView()
        case .display:
            DisplaySection()
        case .safety:
            SafetySection()
        case .telegram:
            TelegramSection()
        case .remote:
            RemoteSection()
        case .permission:
            PermissionSection()
        case .log:
            if model.log.isEmpty {
                Section { Text("Записів ще немає").foregroundStyle(.secondary) }
            } else {
                LogSection()
            }
        }
    }
}
