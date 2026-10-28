<br />
<img src="assets/images/logo-transparent.png" width="80"/>

### Bruno Plus — a fork of Bruno with a built-in Git UI

Bruno Plus is a fork of [Bruno](https://github.com/usebruno/bruno) — the offline-first API client that stores
collections as plain text on your filesystem — with one substantial addition: **a Git interface inside the
app**. Stage, commit, stash, branch, pull and push without leaving the window.

Everything else is upstream Bruno. This is not a rewrite and not a separate product.

---

## Why this fork exists

Bruno removed its Git UI from the open-source edition. The git *backend* is still there —
`packages/bruno-electron/src/utils/git.js` is ~1900 lines and exports around 50 functions — but only three IPC
handlers were ever wired to the renderer, and the renderer has no git components at all. So the capability
exists in the source tree but is unreachable from the app.

Bruno Plus connects that existing backend to a UI. It does not reimplement git.

## What was added

### Git Plus panel

Reachable from the top bar of any collection. The label shows `Git Plus` before a repository is connected and
`Git Plus - <branch>` afterwards. A separate caret opens the branch list and repository actions.

| Tab | What it does |
| --- | --- |
| **Changes** | Stage / unstage files (individually or all at once), discard changes, commit, inline diff viewer, and **push** the current branch |
| **Pull** | Pull from `origin` with fast-forward-only (default) or merge strategy, with interactive VS Code-style conflict resolution |
| **Stash** | Create, apply and drop stashes |
| **Branch** | List, create and switch branches |
| **Config** | Edit or remove the `origin` remote |
| **Gitignore / Readme** | Edit `.gitignore` and the collection readme in-app |
| **Merge & Conflict Resolution** | Integrated conflict resolver editor with Accept Current / Incoming / Both changes and complete/abort merge |

### Initialize Git

A collection outside a repository shows an **Initialize Git** panel instead of a dead end. The form accepts an
optional remote URL and branch, so a fresh repository can be connected to its upstream in one step
(`git init` → `git remote add origin` → `git branch --set-upstream-to`). Leave both blank for a local-only
repository.

The branch list is loaded from the remote URL. If it cannot be read — private repo, typo, offline — the field
stays free-text so a branch name can still be typed.

### Disconnect Git

Deletes the collection's `.git` directory to turn it back into a plain folder. Requires typing `REMOVE GIT` to
confirm. Collection files are left untouched.

Only the resolved repository root's `.git` is removed, never a parent repository's, so a collection nested
inside a larger repo cannot destroy that repo's history.

## Not implemented

- **Fetch UI** and **commit history / graph UI.** The backend functions exist but are not wired.
- **Rebranding of the `bruno://` protocol.** It is tied to upstream's OAuth2 callback host.

## Differences from upstream Bruno

| | Upstream Bruno | Bruno Plus |
| --- | --- | --- |
| App name | `Bruno` | `Bruno Plus` |
| Package name | `bruno` | `brunoplus` |
| App data directory | `…/bruno` | `…/brunoplus` |
| Default collection location | `~/Documents/bruno` | `~/Documents/brunoplus` |
| Git UI | not in the open-source edition | included |
| Dependabot | enabled | removed |

Because the data directory changed, **existing Bruno data is not picked up automatically**. Bruno Plus starts
fresh. To move your data over, quit the app and rename the folders:

```bash
mv ~/Library/Application\ Support/bruno ~/Library/Application\ Support/brunoplus   # macOS
mv ~/Documents/bruno ~/Documents/brunoplus
```

## Requirements

- Node.js **22** (see `.nvmrc`). Node 24 breaks the test suite: the native `canvas` dependency used by
  `jest-environment-jsdom` fails to build, which takes down every renderer test.
- Git installed and available on `PATH`.

## Run from source

```bash
nvm use 22
npm install
npm run setup        # builds the workspace packages the app depends on
npm run dev          # Electron + renderer with hot reload
```

When running via `npm run dev` the macOS dock shows "Electron", not "Bruno Plus" — that name comes from the
`.app` bundle being executed. `productName` only applies to packaged builds.

## Build locally (macOS)

Packaging needs three adjustments before it will run on a machine that does not hold upstream's Apple
credentials. In `packages/bruno-electron/electron-builder-config.js`:

```js
afterSign: undefined,   // was 'notarize.js' — notarization needs upstream's Apple ID
mac: {
  identity: null,       // was 'Anoop MD (W7LPPWA48L)' — upstream's signing certificate
  hardenedRuntime: false,
}
```

Then:

```bash
nvm use 22
npm run build:web             # renderer bundle, required before packaging
npm run build:electron:mac    # or ./scripts/build-electron.sh mac
```

Output lands in `packages/bruno-electron/out/`:

```
out/
├── Bruno Plus-<version>-arm64.dmg
├── Bruno Plus-<version>-arm64-mac.zip
└── mac-arm64/Bruno Plus.app
```

The build is unsigned, so the first launch needs **right-click → Open** to get past Gatekeeper. Do not commit
the three config changes above — they point at credentials only upstream has.

## Tests

```bash
npm test --workspace=packages/bruno-app
npm test --workspace=packages/bruno-electron
npm run lint
```

## Upstream

Base: `usebruno/bruno` at `main` (`71c9d52`), which is 48 commits ahead of the `v4.3.0` release tag. Version
numbers here mirror `v4.3.0`, the latest release at the time of forking.

Sync with upstream:

```bash
git fetch upstream
git merge upstream/main
```

## License and trademark

Bruno is MIT licensed — see [license.md](license.md). The copyright notice is preserved; nothing here
restricts redistribution or modification.

`Bruno` is a trademark held by [Anoop M D](https://www.helloanoop.com/), which is separate from the code
license. This fork is named **Bruno Plus** to stay clearly distinct.

## Credit

Essentially all of the application is upstream Bruno and its contributors. This fork adds the git interface
described above.

- Upstream: <https://github.com/usebruno/bruno>
- Upstream docs: <https://docs.usebruno.com>
