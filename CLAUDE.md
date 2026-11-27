# MaControl (awake)

## Changelog and versions

MaControl is versioned as one unit, the package `macontrol` in `app/` (Mac app, agent and Web UI ship together).
Changesets keeps its version and `app/CHANGELOG.md`; the workspace packages `@awake/*` are not versioned on their own.

- Every change that the owner can notice (new behaviour, changed behaviour, a fix) ships with a changeset file in
  the same commit: `.changeset/<short-kebab-name>.md` with `"macontrol": patch | minor | major` and one or two
  sentences in Ukrainian written for the owner (what appeared or changed), not for a developer. Pure refactors,
  docs and tests need none.
- Dev builds do not close the entries: `scripts/build-info.mjs` puts the pending ones into
  `Resources/agent/build-info.json`, and the agent announces a newly installed build in Telegram with the entries
  the owner has not seen yet (`agent/src/app-update`).
- A release closes them: `pnpm release:version`, commit, then `scripts/release.sh` (takes the version from
  `app/package.json`; the release notes are the CHANGELOG section).
- `changeset init` and `changeset add` without flags are interactive and hang without a TTY: write the file by hand.

## Mockup before UI code

A new page, a new module with pages, or a rearrangement of existing pages (rows moving between pages, a page
split or merged) starts with a mockup shown to the owner in the chat, before any code:

- Draw the layout as it will look: the sidebar entry and every page with its sections and rows. Values may be
  placeholders; say so.
- Mark on it what moves from where, what is new, and what is visible but changeable only on the Mac.
- Next to it list what stays outside and the points you are not sure about.
- Code starts only after the owner approves the mockup. A change to one row or one label on an existing page
  needs none.

## Screens only from the lib

- Web Umbra (`web-umbra/src/ui`) and Mac Umbra (swift-umbra-lib, module `Umbra`) are the component catalogs. A screen
  or a client shell is composed only from their components; no ad hoc markup, styles or one-off views in a page.
- A missing component goes into the lib first (web: `src/ui`; Mac: the swift-umbra-lib session), then the screen
  uses it. Components carry no lib prefix (`Segmented`, not `UmbraSegmented`).
- Labels come from the server tree, never from the client: a module's entry in the menu, crumbs and title is
  `tree.modules[].title`; other pages use `page.title`. A client never renames or hard-codes a label.

## Who owns what

One direction: clients → server → helper → macOS. Answers and events come back.

- **Server** (NestJS, `agent/`): the main process. Owns logic, sessions (Awake, Sleeper), data (SQLite), the
  Telegram bot, notifications, settings. Works alone; keeps running when the app is closed.
- **Helper** (pure Swift, `Helper/`, binary `mc-helper`): the server's subprocess and the only thing that calls
  macOS. Runs primitives (sleep on / off, sleep now, lock, display off, volume, mute, brightness) and reports the
  system state. Decides nothing. Protocol: `contracts/src/helper.ts`.
- **Clients**: the SwiftUI app (`Sources/`), the Web UI (`web/`), the Telegram bot. They render what the server
  gives and send clicks; no session logic, no system calls. The app is also the double-click entry point: it starts
  the server when none is running, or when a different build is running, and then connects to it over the local
  socket `~/Library/Application Support/MaControl/server.sock` (same JSON lines as the old stdin / stdout link).
- Permissions belong to the server: the helper checks and installs the sudoers rules (it shows the macOS password
  window), the server stores the per-module switches and checks them before acting. Clients get them as the
  server page «Дозволи» (`agent/src/mac-permissions`, scope local): the web shows the system grants and toggles the
  per-module switches; grant / revoke buttons exist only in the Mac app (scope mac) and the server refuses those
  actions from any other source.
- Agreed exception (owner, 2026-11-27): the theme (Системна | Світла | Темна) belongs to each client, not the server.
  Each client stores it itself (web: localStorage `macontrol:theme`; Mac Umbra: UserDefaults `theme`) and draws the
  section «Вигляд» first on the server page «Налаштування»; the server knows nothing about it.
- Not moved yet, and not an agreed exception: the app still reads the Wi-Fi name and scans Bluetooth and sends them
  to the server (macOS grants those two to a bundle with an Info.plist; the helper must become a background bundle
  to take them over). The server reads `pmset -g assertions` itself for Keepers.
- The old link (server as a child of the app, `MACONTROL_STANDALONE` unset) is kept only for the e2e harness.

## Server separately from the app in dev

The app looks for the server in `~/Library/Application Support/MaControl/agent-dev/` first (dev / preview builds
only) and restarts the server when `agent.cjs` there changes; it compares the file with `server.json`, which the
running server writes.

- `pnpm agent:dev` builds the server and puts it there (Web UI only the first time); `pnpm agent:dev:web` also
  rebuilds the Web UI; `pnpm agent:dev:off` removes the folder, the app goes back to the bundled server.
- Server-only changes need no reinstall of the app. A reinstall is needed only for Swift changes (app or helper).
- A production build ignores the folder: `scripts/build-agent.sh` bundles the server into the app as before.

## Server alone, without the app (dev)

- `pnpm server:dev` builds the helper and the server and runs the server with `MACONTROL_STANDALONE=1`: it starts
  the helper itself and takes the state and system actions (lock, display off, volume, mute, brightness) from it.
  Keys come from `~/.config/awake/agent.env`. The app must be closed: same port, same bot.
- The helper protocol is `contracts/src/helper.ts` (JSON lines over the helper's stdin / stdout). The helper
  reuses the system services from `Sources/**`; the file list is in `scripts/build-helper.sh`.
- In standalone mode the server owns the Awake and Sleeper sessions (`agent/src/mac-sessions`): timers, the
  one-session rule, battery / thermal / lid reactions, history and Telegram. The helper only runs primitives
  (`sleepDisabled`, `sleepNow`, lock, display off). The bash script `Resources/awake` is not used there.
- Without the app there is no Wi-Fi name and no Bluetooth «Поруч» (see the temporary exceptions above).
