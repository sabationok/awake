import SwiftUI

/// Port of `web/src/sdui/use-run-action.tsx`: an action with a confirm or a form. Nodes call `run`; the shell
/// draws the pending one as an Umbra dialog (`runActionDialog`), the same `Dialog` / `FormDialog` the web shows.
struct RunnableAction {
    var label: String
    var action: UiAction
    var variant: ButtonVariant
    var confirm: UiConfirm?
    var form: UiForm?
}

/// As web `fromButton`: only filled and destructive differ, the rest is the bordered default; the confirm text gets
/// the button's label as title and OK.
func fromButton(_ button: UiButton) -> RunnableAction {
    RunnableAction(label: button.label, action: button.action, variant: button.variant.umbra,
                   confirm: button.confirm.map { UiConfirm(title: button.label, text: $0, ok: button.label) })
}

func fromMenuItem(_ item: UiMenuItem) -> RunnableAction {
    RunnableAction(label: item.label, action: item.action, variant: item.variant.umbra, confirm: item.confirm,
                   form: item.form)
}

/// `useRunAction`: holds the action waiting for a confirm or a form, and fires it with the form's values as params.
@MainActor
final class RunAction: ObservableObject {
    struct Pending {
        var item: RunnableAction
        var send: SendEvent
    }

    @Published var pending: Pending?

    func run(_ item: RunnableAction, send: @escaping SendEvent) {
        if item.confirm != nil || item.form != nil {
            pending = Pending(item: item, send: send)
        } else {
            send(.action(item.action))
        }
    }

    func fire(_ extra: [String: String] = [:]) {
        guard let pending else { return }
        var action = pending.item.action
        if !extra.isEmpty {
            action.params = (action.params ?? [:]).merging(extra.mapValues { .string($0) }) { $1 }
        }
        self.pending = nil
        pending.send(.action(action))
    }

    func close() { pending = nil }
}

extension View {
    /// The pending action's dialog: the form when there is one, else the confirm.
    func runActionDialog(_ runner: RunAction) -> some View {
        modifier(RunActionDialog(runner: runner))
    }
}

private struct RunActionDialog: ViewModifier {
    @ObservedObject var runner: RunAction
    @State private var values: [String: String] = [:]
    @State private var touched = false

    private var item: RunnableAction? { runner.pending?.item }
    private var presented: Binding<Bool> {
        Binding(get: { runner.pending != nil }, set: { if !$0 { runner.close() } })
    }

    func body(content: Content) -> some View {
        content
            .umbraDialog(isPresented: presented, title: item?.form?.title ?? item?.confirm?.title ?? item?.label ?? "") {
                if let form = item?.form {
                    FormFields(form: form, values: $values, touched: touched)
                } else if let text = item?.confirm?.text {
                    Text(text)
                }
            } actions: {
                if let item {
                    Button("Скасувати") { runner.close() }.buttonStyle(.umbra(.ghost))
                    if let form = item.form {
                        Button(form.submit ?? "Зберегти") {
                            touched = true
                            if FormFields.errors(form, values).isEmpty { runner.fire(values) }
                        }
                        .buttonStyle(.umbra(.accent))
                    } else {
                        Button(item.confirm?.ok ?? "Так") { runner.fire() }
                            .buttonStyle(.umbra(item.variant == .default ? .accent : item.variant))
                    }
                }
            }
            .onChange(of: runner.pending?.item.label) { _ in
                touched = false
                values = Dictionary(uniqueKeysWithValues: (item?.form?.fields ?? []).map {
                    ($0.name, $0.value ?? $0.options?.first?.value ?? "")
                })
            }
    }
}

/// `FormDialog`'s fields: `.u-field` with the label above, the error (after the first submit) or the hint below.
private struct FormFields: View {
    let form: UiForm
    @Binding var values: [String: String]
    let touched: Bool

    static func errors(_ form: UiForm, _ values: [String: String]) -> [String: String] {
        var out: [String: String] = [:]
        for f in form.fields {
            let v = values[f.name] ?? ""
            if f.required == true && v.trimmingCharacters(in: .whitespaces).isEmpty { out[f.name] = "Обовʼязкове поле" }
            else if let min = f.minLength, v.count < min { out[f.name] = "Щонайменше \(min) символів" }
            else if let other = f.sameAs, v != values[other] { out[f.name] = "Значення не збігаються" }
        }
        return out
    }

    var body: some View {
        let errors = Self.errors(form, values)
        VStack(alignment: .leading, spacing: 12) {
            ForEach(form.fields, id: \.name) { f in
                let error = touched || (f.sameAs != nil && !(values[f.name] ?? "").isEmpty) ? errors[f.name] : nil
                let binding = Binding(get: { values[f.name] ?? "" }, set: { values[f.name] = $0 })
                if f.kind == "select" {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(f.label).font(Umbra.Font.xs).foregroundStyle(.secondary)
                        Select(f.label, selection: binding, options: (f.options ?? []).map {
                            Option($0.value, $0.label, disabled: $0.disabled ?? false)
                        })
                    }
                } else {
                    TextField(f.label, text: binding, placeholder: f.placeholder ?? "", hint: f.hint, error: error,
                                   secure: f.kind == "password")
                }
            }
        }
        .frame(minWidth: 320)
    }
}
