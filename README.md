<p align="center">
  <img src="build/icon.png" alt="SHAWISH logo" width="96" height="96">
</p>

<h1 align="center">SHAWISH</h1>

<p align="center"><strong>Offline gym management for the front desk — members, training, store, and reports on one Windows desktop.</strong></p>

<p align="center">
  A local-first Electron application for gym operators who need memberships, attendance, private training, inventory, and invoices without a cloud account.
</p>

<p align="center">
  <a href="#download-for-windows"><strong>Download SHAWISH for Windows</strong></a>
  &nbsp;·&nbsp;
  <a href="#installation-and-quick-start">Install</a>
  &nbsp;·&nbsp;
  <a href="#for-developers">Source</a>
</p>

---

> **Windows download:** the GitHub repository is [GiovanyGeorge/Shawish-gym](https://github.com/GiovanyGeorge/Shawish-gym). A public **Release with installer assets has not been verified yet.** Until you upload the `.exe` files to a Release, the link below opens an empty or 404 Releases page.

## Download for Windows

**[Download SHAWISH for Windows](https://github.com/GiovanyGeorge/Shawish-gym/releases/latest)**

Use the GitHub **Releases** page for the latest version and release notes. The latest-release page is the catalog of versions; it is not itself an `.exe` file.

When a Release exists, attach the Windows x64 artifacts produced by `npm run build:desktop`. Local builds currently emit:

| Package | Typical filename | Notes |
| --- | --- | --- |
| NSIS installer | `SHAWISH Setup 0.1.0.exe` | Installer with optional install directory |
| Portable | `SHAWISH 0.1.0.exe` | Single-file portable build |

Those files are written to the local `release/` folder and are **not** in git. They are not a public download until you upload them to GitHub Releases.

**Direct asset URL (after a real Release exists):**  
`https://github.com/GiovanyGeorge/Shawish-gym/releases/download/TAG/EXACT_ASSET_FILENAME.exe`  
Use the actual tag (for example `v0.1.0`) and the exact uploaded filename. Do not invent a tag or filename.

---

## Table of contents

- [Product overview](#product-overview)
- [Features](#features)
- [Screenshots](#screenshots)
- [Technology stack](#technology-stack)
- [Installation and quick start](#installation-and-quick-start)
- [Data storage and privacy](#data-storage-and-privacy)
- [Project structure](#project-structure)
- [Roadmap](#roadmap)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License and acknowledgments](#license-and-acknowledgments)

---

## Product overview

SHAWISH is a **Windows desktop** gym operations app. It runs fully **offline**. Data lives in a local SQLite file (via sql.js) under the Windows user profile — not in a hosted database.

It is built for a single gym workstation: register members with permanent codes (`SHW####`), manage subscriptions (including pause and renew), take daily attendance, run private-training programs from an Exercise Library, sell supplements with invoices (`INV-######`), assign trainers, and review analytics.

The UI is a custom-framed dark desktop shell (minimum window **1024×680**). There is no cloud login, no multi-tenant SaaS layer, and no claim of end-to-end encryption in the current codebase.

<p align="center">
  <img src="src/assets/dashboard/gym-dashboard.jpg" alt="In-app dashboard hero artwork used on the SHAWISH Home screen" width="720">
</p>

<p align="center"><em>In-app Home banner artwork (not a full UI screenshot).</em></p>

---

## Features

Capabilities below are implemented in the current application. They are not a future wishlist.

### Members and memberships

- Member directory with search, filters, and add/edit flows
- Permanent member codes (`SHW####`)
- Member profile drawer: overview, subscription, attendance, goals, pause history
- Subscription pause and renew with history
- Member photo (local upload)
- Member QR encoding the member code only (local SVG)
- Printable member card via a dedicated print window

### Attendance

- Daily attendance for active members
- Home widget for today’s attendance context
- Attendance history on the member profile

### Private training

- Trainers roster and client assignments
- Workout programs
- Exercise Library seeded offline (~879 system exercises from the Unlicense [free-exercise-db](https://github.com/yuhonas/free-exercise-db) dataset, plus gym staples). Names, muscles, equipment, difficulty, category, and instructions are stored. **Exercise photos from that dataset are not bundled.**
- Custom exercises in addition to the system seed

### Store and POS

- Products and inventory, including stock-in
- Checkout / sales
- Invoice numbers (`INV-######`) and printable invoices
- Product codes (`SUP-######`)

### Analytics and settings

- Reports / analytics charts from live local data (members, subscriptions, training, revenue)
- In-app notifications (for example expiry-related settings)
- Settings: gym profile, subscription prices, notifications, backup & restore, store, general

### Desktop runtime

- Offline-first Electron app (no internet required for core use)
- Custom title bar, dark SHAWISH theme
- Manual backup and restore of the local data folder from Settings

### Not claimed

The following are **not** documented as shipped: bilingual UI, full RTL layout, light theme, cloud sync, user accounts / auth, encrypted database at rest, automatic off-site backup, or “Today’s Training” session execution (called out as planned in earlier project notes).

---

## Screenshots

Application window screenshots are **not** in this repository yet.

**Add later (recommended):** PNG captures committed under `docs/screenshots/` and referenced from this README:

1. Home dashboard  
2. Members list and profile drawer (QR / print card)  
3. Attendance  
4. Private Training — Exercise Library  
5. Store checkout and invoice  
6. Analytics  
7. Settings — Backup & Restore  

Until those files exist, this README does not embed mock UI images.

---

## Technology stack

Verified from `package.json` and the Electron main process:

| Layer | Technology |
| --- | --- |
| Desktop shell | Electron 35 |
| UI | React 19, TypeScript, Vite, React Router |
| Styling | Tailwind CSS 4 |
| Forms / validation | React Hook Form, Zod |
| State | Zustand |
| Charts | Recharts |
| Icons | Lucide |
| Data | sql.js (SQLite compiled to WebAssembly), persisted as `shawish.db` |
| IPC | Electron `contextBridge` + preload (`nodeIntegration` off, `sandbox` on) |
| Packaging | electron-builder — Windows x64 **NSIS** installer and **portable** exe |

There is no Tauri/Rust runtime in the current app. Legacy `public/tauri.svg` / `public/vite.svg` files are leftover assets, not the product stack.

---

## Installation and quick start

### For regular users

1. After a GitHub Release exists, open **[Releases (latest)](https://github.com/GiovanyGeorge/Shawish-gym/releases/latest)**.
2. Download the NSIS installer (`SHAWISH Setup …exe`) or the portable build (`SHAWISH …exe`).
3. **Installer:** run the setup wizard (install directory can be changed). Launch **SHAWISH** from the Start Menu shortcut.  
   **Portable:** run the portable executable; no installer step.
4. First run creates the local data directory (see [Data storage](#data-storage-and-privacy)).
5. Configure gym name, prices, and a backup folder under **Settings**.

**Requirements (from the current build config):** Windows **64-bit**. The window will not size below 1024×680. The packaged app is **not code-signed** (`signAndEditExecutable` is disabled), so Windows SmartScreen or Defender may show an unknown-publisher warning until you sign releases yourself.

Until you publish a Release, gym staff should not be sent a GitHub download link. You can still hand them a locally built installer from `release/` on a trusted machine.

### For developers

**Tools:** [Node.js](https://nodejs.org/) (LTS or current). The repo does not pin an `engines` field. Visual Studio Build Tools and Rust are **not** required.

**Clone** (after the GitHub remote exists):

```bash
git clone https://github.com/GiovanyGeorge/Shawish-gym.git
cd Shawish-gym
npm install
```

**Run in development** (Vite + Electron via `vite-plugin-electron`):

```bash
npm run dev
```

**Web/renderer production build only:**

```bash
npm run build
```

**Windows desktop packages** (x64 NSIS + portable, output under `release/`):

```bash
npm run build:desktop
```

`preview` (`npm run preview`) is available for the Vite preview server; it is not the packaged desktop app.

Do not commit `release/`, `dist/`, `dist-electron/`, `node_modules/`, `*.exe`, or the live `shawish.db`.

---

## Data storage and privacy

SHAWISH is **offline**. Member and sales data stay on the PC that runs the app.

Default location:

```text
%LOCALAPPDATA%\Shawish\
├── shawish.db      # SQLite file written by sql.js
├── backups\        # default backup destination (configurable)
├── logs\
└── uploads\        # member, trainer, and product photos
```

**Backup & restore** (Settings) copies the database and uploads into a timestamped folder (`Shawish_Backup_YYYY-MM-DD_HH-MM-SS`). Restore replaces local data from a chosen backup folder. This is a **manual, local** copy — not encrypted backup, not cloud backup, and not automatic scheduling unless you add that later.

QR codes encode the **member code** only. Do not commit real gym databases, uploads, or `.env` secrets to GitHub.

---

## Project structure

```text
SHAWISH/
├── electron/
│   ├── main/                 # Window, IPC, sql.js, services, migrations, seeds
│   └── preload/              # contextBridge API
├── src/                      # React renderer (pages, components, stores)
│   ├── assets/dashboard/     # In-app Home banner
│   └── pages/                # Home, Members, Training, Store, Attendance, …
├── build/                    # App icons (icon.ico / icon.png)
├── public/
├── package.json
├── THIRD_PARTY_NOTICES.md
└── README.md
```

Generated or private paths omitted: `node_modules/`, `dist/`, `dist-electron/`, `release/`, live `shawish.db`.

---

## Roadmap

Grounded in the previous in-repo notes, **not** shipped:

- **Planned:** “Today’s workout” execution, workout history, and progress tracking (formerly called Phase 4)
- **Proposed (not implemented):** bilingual / RTL UI, light theme, code-signed installers, GitHub Releases automation

Do not treat this list as a delivery commitment.

---

## Troubleshooting

| Question | What to do |
| --- | --- |
| Where is the latest version? | GitHub **Releases** → `…/releases/latest` (after you publish). Read the notes on that page. |
| The download link 404s | No Release assets have been published yet. Create a GitHub Release and attach the Windows `.exe` files. |
| Installer / portable exe is missing from git | Expected. Binaries are gitignored. Build with `npm run build:desktop` or attach them to a Release. |
| Windows warns about an unknown publisher | The current electron-builder config does not sign the executable. |
| Where is my gym data? | `%LOCALAPPDATA%\Shawish\` |
| Need to rebuild from source | `npm install` then `npm run dev` or `npm run build:desktop` |
| Report a bug | [GitHub Issues](https://github.com/GiovanyGeorge/Shawish-gym/issues) |

This FAQ does not invent workarounds for errors that have not been reproduced.

---

## Contributing

1. Open an issue describing the bug or improvement (screenshots and Windows version help).  
2. Keep architecture constraints: **offline**, **IPC + sql.js**, no cloud auth.  
3. Do not open pull requests that include `shawish.db`, member photos, or `release/*.exe`.

Issue tracker: [https://github.com/GiovanyGeorge/Shawish-gym/issues](https://github.com/GiovanyGeorge/Shawish-gym/issues)

---

## License and acknowledgments

**License:** not specified. There is no `LICENSE` file in this repository. Do not assume an open-source license until one is added.

**Exercise data:** system Exercise Library seed is derived from [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense). See `THIRD_PARTY_NOTICES.md`. Dataset images are not included.

**Brand:** SHAWISH desktop gym management. Author field in `package.json` is `SHAWISH`. Version currently **0.1.0**.
