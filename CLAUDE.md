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

## Server (agent) separately from the app in dev

The agent is a child process of the Mac app (state in stdin, commands from stdout), so it is never started by hand.
In a dev or preview build the app takes it from `~/Library/Application Support/MaControl/agent-dev/` when that
folder has `agent.cjs`, and restarts only the agent process when the file changes (checked every 2 s).

- `pnpm agent:dev` builds the agent and puts it there (Web UI only the first time); `pnpm agent:dev:web` also
  rebuilds the Web UI; `pnpm agent:dev:off` removes the folder, the app goes back to the bundled agent.
- Agent-only changes need no reinstall of the app. A reinstall is needed only for Swift changes.
- A production build ignores the folder: `scripts/build-agent.sh` bundles the agent into the app as before.
