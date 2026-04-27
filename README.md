# 🕐 Recent Notes for Dataview

> An [Obsidian](https://obsidian.md) plugin that tracks your recently opened notes and lets you display them anywhere using [Dataview](https://github.com/blacksmithgu/obsidian-dataview) queries — with optional integration for up to **100 recent notes**.

![GitHub release](https://img.shields.io/github/v/release/sujit-waghmare/recent-notes-dataview?color=blue&style=flat-square)
![Obsidian](https://img.shields.io/badge/Obsidian-v0.15.0+-purple?style=flat-square)
![License](https://img.shields.io/github/license/sujit-waghmare/recent-notes-dataview?style=flat-square)
![Mobile](https://img.shields.io/badge/Mobile-Supported-green?style=flat-square)

---

## ✨ Features

- 📋 **Tracks recently opened notes** automatically in the background
- 🔢 **Configurable count** — slider from 5 to 20 natively, or up to **100** with the [Recent Notes](https://github.com/kamil-rudnicki/obsidian-recent-notes) plugin
- 🔌 **Recent Notes integration** — pairs with [Recent Notes](https://github.com/kamil-rudnicki/obsidian-recent-notes) by [@kamil-rudnicki](https://github.com/kamil-rudnicki) to unlock a 100-note history
- 🚫 **Folder exclusions** — block entire folders (and subfolders) from being tracked
- 🔤 **Title exclusions** — hide notes by filename using contains or exact match rules
- 📂 **Folder path filter in queries** — scope any Dataview table to a specific folder via `fromFolder`
- ⚡ **DataviewJS integration** — expose your recent notes to any Dataview query via `getRecentFiles()`
- 💾 **Persistent** — recent notes survive Obsidian restarts
- 📱 **Mobile compatible** — works on Obsidian iOS and Android

---

## 📋 Requirements

- [Obsidian](https://obsidian.md) v0.15.0 or higher
- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) community plugin
- *(Optional)* [Recent Notes](https://github.com/kamil-rudnicki/obsidian-recent-notes) by Kamil Rudnicki — unlocks up to 100 recent notes

---

## 🚀 Installation

### From Community Plugins (Recommended)

1. Open Obsidian → **Settings → Community Plugins**
2. Disable Restricted Mode if prompted
3. Click **Browse** and search for **"Recent Notes for Dataview"**
4. Click **Install**, then **Enable**

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/sujit-waghmare/recent-notes-dataview/releases/latest)
2. Create the folder `.obsidian/plugins/recent-notes-dataview/` in your vault
3. Place all three files inside it
4. Go to **Settings → Community Plugins** → hit **Refresh** → enable the plugin

> ⚠ All three files are required from v1.3.0 onwards. Missing `styles.css` will cause the settings page to render without styling.

---

## 🔌 Unlocking 100 Recent Notes

By default the plugin tracks notes natively with a max display of **20**. Install [Recent Notes](https://github.com/kamil-rudnicki/obsidian-recent-notes) by Kamil Rudnicki to unlock up to **100**.

1. Search **"Recent Notes"** in Community Plugins → install the one by **Kamil Rudnicki**
2. Enable it
3. Open **Settings → Recent Notes for Dataview**
4. A **green banner** confirms detection: *✅ Recent Notes plugin detected — up to 100 recent notes available*
5. The slider now goes up to **100** — no snippet changes needed

Without it, an **orange banner** appears with a hint to install, and the slider caps at **20**.

---

## 🧩 Usage

### Basic — show all recent notes

~~~dataviewjs
const rn = app.plugins.plugins["recent-notes-dataview"];
if (!rn) { dv.paragraph('⚠ Plugin not enabled.'); }
else {
  const files = rn.getRecentFiles();
  if (files.length === 0) {
    dv.paragraph("No recent notes yet — open a few notes first!");
  } else {
    dv.table(["Note", "Modified", "Folder"],
      files.map(f => [
        dv.fileLink(f.path),
        new Date(f.stat.mtime).toLocaleString(),
        f.parent?.path || "/"
      ])
    );
  }
}
~~~

### Folder-filtered — show recent notes from a specific folder

~~~dataviewjs
const rn = app.plugins.plugins["recent-notes-dataview"];
if (!rn) { dv.paragraph('⚠ Plugin not enabled.'); }
else {
  // Change "Templates" to any folder path you want
  const files = rn.getRecentFiles({ fromFolder: "Templates" });
  if (files.length === 0) {
    dv.paragraph("No recent notes in this folder.");
  } else {
    dv.table(["Note", "Modified"],
      files.map(f => [
        dv.fileLink(f.path),
        new Date(f.stat.mtime).toLocaleString()
      ])
    );
  }
}
~~~

### Numbered list — show up to 100 recent notes

~~~dataviewjs
const rn = app.plugins.plugins["recent-notes-dataview"];
if (!rn) { dv.paragraph('⚠ Plugin not enabled.'); }
else {
  const files = rn.getRecentFiles();
  if (files.length === 0) {
    dv.paragraph("No recent notes yet.");
  } else {
    dv.paragraph(`Showing ${files.length} recent notes:`);
    dv.table(["#", "Note", "Modified", "Folder"],
      files.map((f, i) => [
        i + 1,
        dv.fileLink(f.path),
        new Date(f.stat.mtime).toLocaleString(),
        f.parent?.path || "/"
      ])
    );
  }
}
~~~

> 💡 All snippets are available with one-click **Copy** buttons in the plugin Settings page.

---

## ⚙️ Settings

Navigate to **Settings → Recent Notes for Dataview**

### 🔢 Number of recent notes

| Source | Slider range | How to unlock |
|---|---|---|
| Native tracking | 5 – 20 | Default |
| Recent Notes plugin | 5 – 100 | Install Recent Notes by Kamil Rudnicki |

---

### 🚫 Excluded folders

Block entire folders from being tracked.

- Type a path like `Private` or `Work/Drafts` and click **Add folder**
- Input **autocompletes** from your vault folders
- Exclusions are **recursive** — `Private` also blocks `Private/Journal/`, `Private/Archive/`, etc.
- Notes already tracked inside a newly excluded folder disappear immediately — no restart needed
- Paths are case-sensitive on Mac/Linux

---

### 🔤 Excluded titles

Hide notes by filename using text rules.

| Mode | Behaviour | Example |
|---|---|---|
| **Contains** (default) | Hides notes whose filename *contains* the text | `Untitled` hides `Untitled 1`, `Untitled 23`, `My Untitled Draft` |
| **Exact match** | Hides notes whose filename *exactly equals* the text | `Meeting` only hides `Meeting.md`, not `Team Meeting.md` |

Each saved filter shows a badge: `🔤 Untitled [contains]` or `🔤 Meeting [exact]`

Matching is always **case-insensitive**. The `.md` extension is stripped automatically.

---

## 🔧 How It Works

```
getRecentFiles() is called
        │
        ▼
Is "recent-notes" plugin installed and has data?
        │
   YES  │  NO
        │   └─► Use native recentFiles list (up to 20)
        │
        ▼
Pull paths from recent-notes plugin (up to 100)
        │
        ▼
Apply folder exclusions + title exclusions + fromFolder filter
        │
        ▼
Return TFile[] up to maxRecentNotes count
```

- `getRecentFiles()` is a **public API** accessible from any DataviewJS block via `app.plugins.plugins["recent-notes-dataview"]`
- Every `.md` file you open is recorded in the background
- Deleted or renamed notes are automatically skipped at query time
- All exclusion rules apply regardless of which source (native or external) is active

---

## 🛠 Development

```bash
# Clone the repo
git clone https://github.com/sujit-waghmare/recent-notes-dataview
cd recent-notes-dataview

# Install dependencies
npm install

# Development mode (watches for changes)
npm run dev

# Production build
npm run build
```

### Common build fixes

| Error | Fix |
|---|---|
| `Cannot find module 'obsidian'` | Run `npm install` first |
| `moduleResolution 'bundler' invalid` | Change to `"moduleResolution": "node"` in `tsconfig.json` |
| `Property 'settings' has no initializer` | Change to `settings!: RecentNotesSettings` in `main.ts` |

---

## 🖼 Screenshots

> *(Add screenshots to `assets/screenshots/` and update these paths)*

---

## 🤝 Contributing

- 🐛 **Bug reports** → [Open an issue](https://github.com/sujit-waghmare/recent-notes-dataview/issues)
- 💡 **Feature requests** → [Start a discussion](https://github.com/sujit-waghmare/recent-notes-dataview/discussions)
- 💬 **Community chat** → [Discord](https://discord.gg/9b8rnKM9)

---

## 🙏 Credits

- [Recent Notes](https://github.com/kamil-rudnicki/obsidian-recent-notes) by [Kamil Rudnicki](https://github.com/kamil-rudnicki) — optional integration that unlocks up to 100 recently opened notes. Our plugin reads its internal file list when available, giving users a much richer history without any extra effort.
- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) by blacksmithgu — the query engine that powers the display layer.

---

## 📄 License

MIT © [Waghmare](https://github.com/sujit-waghmare)

---

## ☕ Support

If this plugin saves you time, consider starring ⭐ the repo — it helps others find it!

