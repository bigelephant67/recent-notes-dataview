"use strict";

/* -------------------------------------------------------
   Recent Notes for Dataview  –  Obsidian Plugin  v1.1.0
   Drop this file + manifest.json into your vault's
   .obsidian/plugins/recent-notes-dataview/ folder.
------------------------------------------------------- */

var obsidian = require("obsidian");

// ── Default settings ──────────────────────────────────
const DEFAULT_SETTINGS = {
	maxRecentNotes: 5,
	recentFiles: [],
	excludedFolders: [], // Array of folder paths to exclude
};

// ── Helpers ───────────────────────────────────────────

/**
 * Returns true if filePath is inside any of the excluded folders.
 * Handles nested paths automatically.
 * e.g. "Private" also blocks "Private/subfolder/note.md"
 */
function isExcluded(filePath, excludedFolders) {
	if (!excludedFolders || excludedFolders.length === 0) return false;
	const normalised = filePath.replace(/\\/g, "/");
	return excludedFolders.some((folder) => {
		if (!folder || folder.trim() === "") return false;
		const f = folder.replace(/\\/g, "/").replace(/\/+$/, "");
		return normalised === f || normalised.startsWith(f + "/");
	});
}

// ── Settings Tab ──────────────────────────────────────
class RecentNotesSettingTab extends obsidian.PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();

		// ── Header ──────────────────────────────────────
		const header = containerEl.createEl("div");
		header.style.cssText =
			"display:flex;align-items:center;gap:10px;margin-bottom:4px;";
		const icon = header.createEl("span");
		icon.textContent = "🕐";
		icon.style.fontSize = "22px";
		header.createEl("h2", { text: "Recent Notes for Dataview" });

		containerEl.createEl("p", {
			text: "Tracks recently opened notes and exposes them to DataviewJS queries.",
			cls: "setting-item-description",
		});

		containerEl.createEl("hr");

		// ── Slider ──────────────────────────────────────
		new obsidian.Setting(containerEl)
			.setName("Number of recent notes to show")
			.setDesc("Choose between 5 and 10. Takes effect immediately.")
			.addSlider((slider) =>
				slider
					.setLimits(5, 10, 1)
					.setValue(this.plugin.settings.maxRecentNotes)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.maxRecentNotes = value;
						await this.plugin.saveSettings();
					})
			);

		// ── Excluded Folders Section ─────────────────────
		containerEl.createEl("hr");

		const exHeader = containerEl.createEl("div");
		exHeader.style.cssText =
			"display:flex;align-items:center;gap:8px;margin-bottom:4px;";
		const exIcon = exHeader.createEl("span", { text: "🚫" });
		exIcon.style.fontSize = "18px";
		const exTitle = exHeader.createEl("h3", { text: "Excluded Folders" });
		exTitle.style.margin = "0";

		containerEl.createEl("p", {
			text: "Notes inside these folders will not be tracked or shown. Subfolders are excluded automatically.",
			cls: "setting-item-description",
		});

		// ── Add folder input row ─────────────────────────
		const addRow = containerEl.createEl("div");
		addRow.style.cssText =
			"display:flex;gap:8px;align-items:center;margin:10px 0 14px;";

		const input = addRow.createEl("input", { type: "text" });
		input.placeholder = "e.g.  Private  or  Work/Drafts";
		input.setAttribute("list", "rn-folder-list");
		input.style.cssText =
			"flex:1;padding:6px 10px;border-radius:6px;" +
			"border:1px solid var(--background-modifier-border);" +
			"background:var(--background-primary);color:var(--text-normal);font-size:13px;";

		// Datalist – autocomplete from actual vault folders
		const datalist = containerEl.createEl("datalist");
		datalist.id = "rn-folder-list";
		this.plugin.app.vault
			.getAllLoadedFiles()
			.filter((f) => f.children !== undefined && f.path !== "/")
			.forEach((f) => {
				const opt = datalist.createEl("option");
				opt.value = f.path;
			});

		const addBtn = addRow.createEl("button", { text: "＋ Add Folder" });
		addBtn.style.cssText =
			"padding:6px 14px;border-radius:6px;cursor:pointer;" +
			"background:var(--interactive-accent);color:var(--text-on-accent);" +
			"border:none;font-size:13px;white-space:nowrap;";

		const doAdd = async () => {
			const val = input.value.trim().replace(/\/+$/, "");
			if (!val) return;
			if (this.plugin.settings.excludedFolders.includes(val)) {
				new obsidian.Notice(`"${val}" is already in the excluded list.`);
				return;
			}
			this.plugin.settings.excludedFolders.push(val);
			await this.plugin.saveSettings();
			input.value = "";
			this.display();
		};

		addBtn.addEventListener("click", doAdd);
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") doAdd();
		});

		addRow.appendChild(input);
		addRow.appendChild(addBtn);
		containerEl.appendChild(addRow);
		containerEl.appendChild(datalist);

		// ── Excluded folder list ─────────────────────────
		const listEl = containerEl.createEl("div");
		listEl.style.cssText =
			"display:flex;flex-direction:column;gap:6px;margin-bottom:14px;";

		const excluded = this.plugin.settings.excludedFolders;

		if (excluded.length === 0) {
			const empty = listEl.createEl("div");
			empty.style.cssText =
				"padding:10px 14px;border-radius:6px;font-size:13px;" +
				"color:var(--text-muted);background:var(--background-secondary);" +
				"border:1px dashed var(--background-modifier-border);";
			empty.textContent = "No folders excluded yet.";
		} else {
			excluded.forEach((folder, idx) => {
				const row = listEl.createEl("div");
				row.style.cssText =
					"display:flex;align-items:center;justify-content:space-between;" +
					"padding:8px 12px;border-radius:6px;" +
					"background:var(--background-secondary);" +
					"border:1px solid var(--background-modifier-border);";

				const left = row.createEl("div");
				left.style.cssText = "display:flex;align-items:center;gap:8px;";
				left.createEl("span", { text: "📁" });
				const label = left.createEl("span", { text: folder });
				label.style.cssText =
					"font-size:13px;font-family:var(--font-monospace);";

				const removeBtn = row.createEl("button", { text: "Remove" });
				removeBtn.style.cssText =
					"padding:3px 10px;border-radius:5px;cursor:pointer;font-size:12px;" +
					"background:transparent;color:var(--text-error);" +
					"border:1px solid var(--background-modifier-error-hover);";
				removeBtn.addEventListener("mouseenter", () => {
					removeBtn.style.background =
						"var(--background-modifier-error)";
				});
				removeBtn.addEventListener("mouseleave", () => {
					removeBtn.style.background = "transparent";
				});
				removeBtn.addEventListener("click", async () => {
					this.plugin.settings.excludedFolders.splice(idx, 1);
					await this.plugin.saveSettings();
					this.display();
				});

				row.appendChild(left);
				row.appendChild(removeBtn);
				listEl.appendChild(row);
			});
		}

		containerEl.appendChild(listEl);

		// Clear all button (only shown when >1 folder excluded)
		if (excluded.length > 1) {
			const clearBtn = containerEl.createEl("button", {
				text: "Clear all excluded folders",
			});
			clearBtn.style.cssText =
				"padding:4px 12px;border-radius:5px;cursor:pointer;font-size:12px;" +
				"margin-bottom:16px;background:transparent;" +
				"border:1px solid var(--background-modifier-border);color:var(--text-muted);";
			clearBtn.addEventListener("click", async () => {
				this.plugin.settings.excludedFolders = [];
				await this.plugin.saveSettings();
				this.display();
			});
		}

		// ── DataviewJS snippet ───────────────────────────
		containerEl.createEl("hr");
		containerEl.createEl("h3", { text: "DataviewJS snippet" });
		containerEl.createEl("p", {
			text: 'Paste this into any note using a "dataviewjs" code block:',
			cls: "setting-item-description",
		});

		const snippetBox = containerEl.createEl("div");
		snippetBox.style.cssText =
			"background:var(--background-secondary);border:1px solid var(--background-modifier-border);" +
			"border-radius:8px;padding:14px 16px;margin:6px 0 12px;position:relative;";

		const code = [
			"// ── Recent Notes (powered by Recent Notes for Dataview) ──",
			'const rn = app.plugins.plugins["recent-notes-dataview"];',
			"if (!rn) { dv.paragraph('⚠ Plugin not enabled.'); }",
			"else {",
			"  const files = rn.getRecentFiles();",
			"  if (files.length === 0) {",
			'    dv.paragraph("No recent notes yet — open a few notes first!");',
			"  } else {",
			'    dv.table(["Note", "Modified", "Folder"],',
			"      files.map(f => [",
			"        dv.fileLink(f.path),",
			"        new Date(f.stat.mtime).toLocaleString(),",
			'        f.parent?.path || "/"',
			"      ])",
			"    );",
			"  }",
			"}",
		].join("\n");

		const pre = snippetBox.createEl("pre");
		pre.style.cssText =
			"margin:0;font-size:12.5px;overflow-x:auto;white-space:pre;";
		pre.createEl("code", { text: code });

		const copyBtn = snippetBox.createEl("button", { text: "Copy" });
		copyBtn.style.cssText =
			"position:absolute;top:10px;right:10px;padding:3px 10px;" +
			"border-radius:5px;font-size:12px;cursor:pointer;";
		copyBtn.addEventListener("click", async () => {
			await navigator.clipboard.writeText(
				"```dataviewjs\n" + code + "\n```"
			);
			copyBtn.textContent = "Copied ✓";
			setTimeout(() => (copyBtn.textContent = "Copy"), 1800);
		});

		// ── Warning ──────────────────────────────────────
		const warn = containerEl.createEl("div");
		warn.style.cssText =
			"background:var(--background-modifier-error-rgb,255 80 80 / 0.08);" +
			"border-left:3px solid var(--color-orange,#f59e0b);" +
			"border-radius:4px;padding:8px 12px;font-size:13px;";
		warn.createEl("strong", { text: "Requires: " });
		warn.appendText(
			"The Dataview community plugin must be installed and enabled."
		);
	}
}

// ── Main Plugin Class ─────────────────────────────────
class RecentNotesPlugin extends obsidian.Plugin {
	async onload() {
		await this.loadSettings();

		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				if (file && file.extension === "md") {
					this.trackRecentFile(file.path);
				}
			})
		);

		this.addSettingTab(new RecentNotesSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			const dv = this.app.plugins?.plugins?.["dataview"];
			if (!dv) {
				new obsidian.Notice(
					"Recent Notes for Dataview: Dataview plugin not found. Install it from Community Plugins.",
					8000
				);
			}
		});

		console.log("[RecentNotes] Plugin loaded ✓");
	}

	onunload() {
		console.log("[RecentNotes] Plugin unloaded");
	}

	/**
	 * Add path to front of recents list.
	 * Silently skips if the file lives inside an excluded folder.
	 */
	trackRecentFile(path) {
		if (isExcluded(path, this.settings.excludedFolders)) return;

		let files = this.settings.recentFiles.filter((f) => f !== path);
		files.unshift(path);
		files = files.slice(0, 10);
		this.settings.recentFiles = files;
		this.saveSettings();
	}

	/**
	 * Public API for DataviewJS.
	 * Returns TFile[] filtered by:
	 *   - File still exists in vault
	 *   - Not inside any excluded folder (double-checked here so
	 *     folders added after tracking are also respected)
	 */
	getRecentFiles() {
		const max = this.settings.maxRecentNotes;
		const result = [];

		for (const path of this.settings.recentFiles) {
			if (result.length >= max) break;
			if (isExcluded(path, this.settings.excludedFolders)) continue;
			const file = this.app.vault.getAbstractFileByPath(path);
			if (file instanceof obsidian.TFile) {
				result.push(file);
			}
		}

		return result;
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

module.exports = RecentNotesPlugin;
