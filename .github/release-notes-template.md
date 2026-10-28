Bruno Plus is a fork of [Bruno](https://github.com/usebruno/bruno) that adds a Git interface to the app —
stage, commit, stash, branch, pull and push without leaving the window.

This release is based on upstream Bruno `v4.3.0`.

## Install

### macOS

1. Download the DMG for your Mac:
   - **Apple Silicon (M1/M2/M3/M4)**: `..._arm64_mac.dmg`
   - **Intel**: `..._x64_mac.dmg`
2. Open the DMG and drag **Bruno Plus** into Applications.
3. **First launch**: right-click the app → **Open** → **Open**.

This build is not signed with an Apple Developer certificate, so macOS shows a security
warning the first time. Right-click → Open bypasses it; a normal double-click does not.

If macOS reports that the app is "damaged" (Gatekeeper quarantine):

**Option A: Using the Fix Script (Quickest)**
1. Move **Bruno Plus** into your `/Applications` folder.
2. Download `Fix-Damaged-App.command` from the Assets below.
3. Right-click `Fix-Damaged-App.command` → select **Open** → click **Open** (required by macOS for downloaded scripts).
4. Follow the prompt in the Terminal window that opens, then launch Bruno Plus.

**Option B: Using Terminal manually**
Open Terminal and run:

```bash
xattr -cr "/Applications/Bruno Plus.app"
```

### Windows

1. Download the `.exe` installer (`..._x64_win.exe`).
2. Run it. SmartScreen may warn about an unknown publisher — choose
   **More info** → **Run anyway**.
3. The installer lets you pick the install directory; no admin rights are required.

### Linux

- **AppImage** (recommended, works on any distro): download, then
  `chmod +x brunoplus-*.AppImage && ./brunoplus-*.AppImage`
- **Debian/Ubuntu**: `sudo apt install ./brunoplus-*.deb`

## Your data

Bruno Plus stores its settings and collections under its own paths, separate from Bruno:

| | Location |
| --- | --- |
| App data | `~/Library/Application Support/Bruno Plus` (macOS) · `%APPDATA%/Bruno Plus` (Windows) · `~/.config/Bruno Plus` (Linux) |
| Default collections | `~/Documents/brunoplus` |

Existing Bruno data is **not** imported automatically. To move it over, quit the app and rename
the folders:

```bash
mv ~/Library/Application\ Support/bruno "~/Library/Application Support/Bruno Plus"   # macOS
mv ~/Documents/bruno ~/Documents/brunoplus
```

## What's in this release

See the [README](https://github.com/ahyaniayas/brunoplus#readme) for the full list of what the
fork adds. Short version:

- **Git Plus panel** — Changes, Pull, Stash, Branch, Config, Gitignore/Readme and Merge tabs
- **Initialize Git** — connect a collection to a remote and branch in one step
- **Disconnect Git** — remove version control while keeping the collection files

## Not implemented

- Three-way merge editor and per-hunk conflict resolution. Conflict *detection* works, and the
  Merge tab offers discard-local and pull.
- Commit history / graph view and a fetch UI.

## Known limitations

- Builds are **unsigned**. Expect Gatekeeper (macOS) and SmartScreen (Windows) warnings.
- No auto-updater. Update by downloading a newer release.
- Windows and Linux builds target x64 only.

## Upstream

Base: `usebruno/bruno` at `main`, versioned to match the `v4.3.0` release.
Change history: compare this tag against `usebruno/bruno`.
