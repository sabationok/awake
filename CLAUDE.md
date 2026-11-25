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
