# 🕐 Recent Notes for Dataview

> An [Obsidian](https://obsidian.md) plugin that tracks your recently opened notes and lets you display them anywhere using [Dataview](https://github.com/blacksmithgu/obsidian-dataview) queries.

![GitHub release](https://img.shields.io/github/v/release/sujit-waghmare/recent-notes-dataview?color=blue&style=flat-square)
![Obsidian](https://img.shields.io/badge/Obsidian-v0.15.0+-purple?style=flat-square)
![License](https://img.shields.io/github/license/sujit-waghmare/recent-notes-dataview?style=flat-square)
![Mobile](https://img.shields.io/badge/Mobile-Supported-green?style=flat-square)

---

## ✨ Features

- 📋 **Tracks recently opened notes** automatically in the background
- 🔢 **Configurable count** — choose to show 5 to 10 recent notes via slider
- 🚫 **Folder exclusions** — block entire folders (and their subfolders) from being tracked
- 🔤 **Title exclusions** — hide notes by filename using contains or exact match rules
- 📂 **Folder path filter in queries** — scope any Dataview table to a specific folder
- ⚡ **DataviewJS integration** — expose your recent notes to any Dataview query
- 💾 **Persistent** — recent notes survive Obsidian restarts
- 📱 **Mobile compatible** — works on Obsidian iOS and Android

---

## 📋 Requirements

- [Obsidian](https://obsidian.md) v0.15.0 or higher
- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) community plugin

---

## 🚀 Installation

### From Community Plugins (Recommended)

1. Open Obsidian → **Settings → Community Plugins**
2. Disable Restricted Mode if prompted
3. Click **Browse** and search for **"Recent Notes for Dataview"**
4. Click **Install**, then **Enable**

### Manual Installation

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/sujit-waghmare/recent-notes-dataview/releases/latest)
2. Create the folder `.obsidian/plugins/recent-notes-dataview/` in your vault
3. Place both files inside it
4. Go to **Settings → Community Plugins** → hit **Refresh** → enable the plugin

---

## 🧩 Usage

### Basic — show all recent notes

In any note, create a `dataviewjs` code block:

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

> 💡 Both snippets are available with one-click **Copy** buttons in the plugin Settings page.

---

## ⚙️ Settings

Navigate to **Settings → Recent Notes for Dataview**

### 🔢 Number of Recent Notes

Slider from **5 to 10**. Controls how many notes appear in Dataview queries. Default: 5.

---

### 🚫 Excluded Folders

Block entire folders from being tracked.

- Type a path like `Private` or `Work/Drafts` and click **＋ Add Folder**
- Input **autocompletes** from your vault folders
- Exclusions are **recursive** — `Private` also blocks `Private/Journal/`, `Private/Archive/`, etc.
- Notes already tracked inside a newly excluded folder disappear immediately — no restart needed
- Paths are case-sensitive on Mac/Linux

---

### 🔤 Excluded Titles *(New in v1.2.0)*

Hide notes by filename using text rules. Two modes:

| Mode | Behaviour | Example |
|---|---|---|
| **Contains** (default) | Hides notes whose filename *contains* the text | `Untitled` hides `Untitled 1`, `Untitled 23`, `My Untitled Draft` |
| **Exact Match** | Hides notes whose filename *exactly equals* the text | `Meeting` only hides `Meeting.md`, not `Team Meeting.md` |

Each saved filter shows a badge: `🔤 Untitled [contains]` or `🔤 Meeting [exact]`

Matching is always **case-insensitive**. The `.md` extension is stripped automatically.

---

## 🖼 Screenshots
### Settings
> ![v1.2.0 update](https://github.com/sujit-waghmare/recent-notes-dataview/blob/4dfa316abb6354d5dc85e03bcf1bbaea669474ae/assets/screenshots/recent-note-dataview-settings.jpg)

### Showcase
> ![preview](https://github.com/sujit-waghmare/recent-notes-dataview/blob/main/assets/screenshots/recent-notes-preview.png)

---

## 🛠 Development

```bash
# Clone the repo
git clone https://github.com/bigelephant67/recent-notes-dataview
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

## 🤝 Contributing

- 🐛 **Bug reports** → [Open an issue](https://github.com/sujit-waghmare/recent-notes-dataview/issues)
- 💡 **Feature requests** → [Start a discussion](https://github.com/sujit-waghmare/recent-notes-dataview/discussions)
- 💬 **Community chat** → [Discord](https://discord.gg/9b8rnKM9)

---

## 📄 License

MIT © [Waghmare](https://github.com/sujit-waghmare)

---

## ☕ Support

If this plugin saves you time, consider starring ⭐ the repo — it helps others find it!
