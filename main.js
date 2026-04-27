"use strict";

/* -------------------------------------------------------
   Recent Notes for Dataview  –  Obsidian Plugin  v1.4.0
   Drop main.js, manifest.json, and styles.css into:
   .obsidian/plugins/recent-notes-dataview/
------------------------------------------------------- */

var obsidian = require("obsidian");

// ── Constants ─────────────────────────────────────────
const RECENT_NOTES_PLUGIN_ID = "recent-notes"; // Kamil Rudnicki's plugin ID
const NATIVE_BUFFER_SIZE     = 100;             // internal tracking buffer
const NATIVE_MAX_DISPLAY     = 20;              // fallback max when recent-notes absent
const INTEGRATION_MAX        = 100;             // max when recent-notes is present

// ── Default settings ──────────────────────────────────
const DEFAULT_SETTINGS = {
	maxRecentNotes: 5,
	recentFiles: [],
	excludedFolders: [],
	excludedTitles: [], // { text: string, exactMatch: boolean }[]
};

// ── Helpers ───────────────────────────────────────────

function isFolderExcluded(filePath, excludedFolders) {
	if (!excludedFolders.length) return false;
	const norm = filePath.replace(/\\/g, "/");
	return excludedFolders.some((folder) => {
		if (!folder.trim()) return false;
		const f = folder.replace(/\\/g, "/").replace(/\/+$/, "");
		return norm === f || norm.startsWith(f + "/");
	});
}

function isTitleExcluded(filePath, excludedTitles) {
	if (!excludedTitles.length) return false;
	const baseName = filePath
		.replace(/\\/g, "/")
		.split("/")
		.pop()
		.replace(/\.md$/i, "")
		.toLowerCase();
	return excludedTitles.some(({ text, exactMatch }) => {
		if (!text.trim()) return false;
		const t = text.trim().toLowerCase();
		return exactMatch ? baseName === t : baseName.includes(t);
	});
}

function isExcluded(filePath, excludedFolders, excludedTitles) {
	return (
		isFolderExcluded(filePath, excludedFolders) ||
		isTitleExcluded(filePath, excludedTitles)
	);
}

/**
 * Try to pull the recent file list from the "recent-notes" plugin by
 * Kamil Rudnicki (plugin ID: "recent-notes"). That plugin keeps an
 * internal `recentFiles` array of up to 100 paths in its settings.
 * Returns null if the plugin is not installed or its data is unavailable.
 */
function getRecentNotesPluginPaths(app) {
	try {
		const rnPlugin = app.plugins?.plugins?.[RECENT_NOTES_PLUGIN_ID];
		if (!rnPlugin) return null;

		// The plugin stores its list in settings.recentFiles as an array of
		// objects: { path: string, ... } or plain strings depending on version.
		const data = rnPlugin.settings?.recentFiles;
		if (!Array.isArray(data) || data.length === 0) return null;

		// Normalise — handle both string[] and object[] shapes
		return data
			.map((entry) =>
				typeof entry === "string" ? entry : entry?.path ?? null
			)
			.filter(Boolean);
	} catch {
		return null;
	}
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

		// ── Page heading ─────────────────────────────────
		new obsidian.Setting(containerEl)
			.setName("Recent Notes for Dataview")
			.setHeading();

		// Detect whether the recent-notes plugin is installed
		const rnInstalled = !!this.plugin.app.plugins?.plugins?.[RECENT_NOTES_PLUGIN_ID];
		const sliderMax   = rnInstalled ? INTEGRATION_MAX : NATIVE_MAX_DISPLAY;
		const sourceLabel = rnInstalled
			? `Source: Recent Notes plugin (up to ${INTEGRATION_MAX} notes available).`
			: `Source: Native tracking (up to ${NATIVE_MAX_DISPLAY} notes). Install the "Recent Notes" plugin by Kamil Rudnicki to unlock up to ${INTEGRATION_MAX} notes.`;

		containerEl.createEl("p", {
			text: "Tracks recently opened notes and exposes them to DataviewJS queries.",
			cls: "setting-item-description",
		});

		// Integration status banner
		const banner = containerEl.createEl("div", {
			cls: rnInstalled ? "rn-banner rn-banner-ok" : "rn-banner rn-banner-warn",
		});
		banner.createEl("span", {
			text: rnInstalled
				? "✅ Recent Notes plugin detected — up to 100 recent notes available."
				: `⚠ Recent Notes plugin not found — using native tracking (max ${NATIVE_MAX_DISPLAY} notes).`,
		});

		// ── Count slider ─────────────────────────────────
		// Clamp saved value to new max if needed
		if (this.plugin.settings.maxRecentNotes > sliderMax) {
			this.plugin.settings.maxRecentNotes = sliderMax;
			void this.plugin.saveSettings();
		}

		new obsidian.Setting(containerEl)
			.setName("Number of recent notes to show")
			.setDesc(`Choose between 5 and ${sliderMax}. ${sourceLabel}`)
			.addSlider((slider) =>
				slider
					.setLimits(5, sliderMax, 1)
					.setValue(this.plugin.settings.maxRecentNotes)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.maxRecentNotes = value;
						await this.plugin.saveSettings();
					})
			);

		// ════════════════════════════════════════════════
		// SECTION: Excluded folders
		// ════════════════════════════════════════════════
		new obsidian.Setting(containerEl)
			.setName("Excluded folders")
			.setHeading();

		containerEl.createEl("p", {
			text: "Notes inside these folders will not be tracked or shown. Subfolders are excluded automatically.",
			cls: "setting-item-description",
		});

		const folderAddRow = containerEl.createEl("div", { cls: "rn-add-row" });

		const folderInput = folderAddRow.createEl("input", { type: "text" });
		folderInput.placeholder = "e.g. Private or Work/Drafts";
		folderInput.addClass("rn-text-input");
		folderInput.setAttribute("list", "rn-folder-list");

		const folderDatalist = containerEl.createEl("datalist");
		folderDatalist.id = "rn-folder-list";
		this.plugin.app.vault
			.getAllLoadedFiles()
			.filter((f) => f.children !== undefined && f.path !== "/")
			.forEach((f) => {
				const opt = folderDatalist.createEl("option");
				opt.value = f.path;
			});

		const folderAddBtn = folderAddRow.createEl("button", {
			text: "Add folder",
			cls: "rn-add-btn",
		});

		const doAddFolder = async () => {
			const val = folderInput.value.trim().replace(/\/+$/, "");
			if (!val) return;
			if (this.plugin.settings.excludedFolders.includes(val)) {
				new obsidian.Notice(`"${val}" is already excluded.`);
				return;
			}
			this.plugin.settings.excludedFolders.push(val);
			await this.plugin.saveSettings();
			folderInput.value = "";
			this.display();
		};

		folderAddBtn.addEventListener("click", () => void doAddFolder());
		folderInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") void doAddFolder();
		});

		const folderList = containerEl.createEl("div", { cls: "rn-item-list" });
		const excludedFolders = this.plugin.settings.excludedFolders;

		if (excludedFolders.length === 0) {
			folderList.createEl("div", {
				text: "No folders excluded yet.",
				cls: "rn-empty-state",
			});
		} else {
			excludedFolders.forEach((folder, idx) => {
				this.renderListRow(folderList, "📁", folder, async () => {
					this.plugin.settings.excludedFolders.splice(idx, 1);
					await this.plugin.saveSettings();
					this.display();
				});
			});
		}

		if (excludedFolders.length > 1) {
			const clearBtn = containerEl.createEl("button", {
				text: "Clear all excluded folders",
				cls: "rn-clear-btn",
			});
			clearBtn.addEventListener("click", async () => {
				this.plugin.settings.excludedFolders = [];
				await this.plugin.saveSettings();
				this.display();
			});
		}

		// ════════════════════════════════════════════════
		// SECTION: Excluded titles
		// ════════════════════════════════════════════════
		new obsidian.Setting(containerEl)
			.setName("Excluded titles")
			.setHeading();

		containerEl.createEl("p", {
			text: "Hide notes whose filename contains (or exactly matches) the text you specify.",
			cls: "setting-item-description",
		});

		const titleAddWrapper = containerEl.createEl("div", {
			cls: "rn-title-add-wrapper",
		});

		const titleInputRow = titleAddWrapper.createEl("div", { cls: "rn-add-row" });

		const titleInput = titleInputRow.createEl("input", { type: "text" });
		titleInput.placeholder = "e.g. Untitled or Meeting Notes";
		titleInput.addClass("rn-text-input");

		const titleAddBtn = titleInputRow.createEl("button", {
			text: "Add filter",
			cls: "rn-add-btn",
		});

		const exactRow = titleAddWrapper.createEl("div", { cls: "rn-exact-row" });
		let exactMatchEnabled = false;

		const exactToggle = exactRow.createEl("div", { cls: "rn-toggle rn-toggle-off" });
		exactToggle.createEl("div", { cls: "rn-toggle-knob" });

		const exactLabel = exactRow.createEl("span", {
			text: "Exact match: off — hides notes whose title contains this text",
			cls: "rn-exact-label",
		});

		const updateToggleUI = () => {
			if (exactMatchEnabled) {
				exactToggle.removeClass("rn-toggle-off");
				exactToggle.addClass("rn-toggle-on");
				exactLabel.textContent =
					"Exact match: on — only hides notes whose full title equals this text";
			} else {
				exactToggle.removeClass("rn-toggle-on");
				exactToggle.addClass("rn-toggle-off");
				exactLabel.textContent =
					"Exact match: off — hides notes whose title contains this text";
			}
		};

		exactToggle.addEventListener("click", () => {
			exactMatchEnabled = !exactMatchEnabled;
			updateToggleUI();
		});

		const doAddTitle = async () => {
			const val = titleInput.value.trim();
			if (!val) return;
			const duplicate = this.plugin.settings.excludedTitles.some(
				(t) =>
					t.text.toLowerCase() === val.toLowerCase() &&
					t.exactMatch === exactMatchEnabled
			);
			if (duplicate) {
				new obsidian.Notice(
					`"${val}" (${exactMatchEnabled ? "exact" : "contains"}) is already in the list.`
				);
				return;
			}
			this.plugin.settings.excludedTitles.push({
				text: val,
				exactMatch: exactMatchEnabled,
			});
			await this.plugin.saveSettings();
			titleInput.value = "";
			exactMatchEnabled = false;
			updateToggleUI();
			this.display();
		};

		titleAddBtn.addEventListener("click", () => void doAddTitle());
		titleInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") void doAddTitle();
		});

		const titleList = containerEl.createEl("div", { cls: "rn-item-list" });
		const excludedTitles = this.plugin.settings.excludedTitles;

		if (excludedTitles.length === 0) {
			titleList.createEl("div", {
				text: "No title filters added yet.",
				cls: "rn-empty-state",
			});
		} else {
			excludedTitles.forEach((entry, idx) => {
				const badge = entry.exactMatch ? " [exact]" : " [contains]";
				this.renderListRow(titleList, "🔤", entry.text + badge, async () => {
					this.plugin.settings.excludedTitles.splice(idx, 1);
					await this.plugin.saveSettings();
					this.display();
				});
			});
		}

		if (excludedTitles.length > 1) {
			const clearBtn = containerEl.createEl("button", {
				text: "Clear all title filters",
				cls: "rn-clear-btn",
			});
			clearBtn.addEventListener("click", async () => {
				this.plugin.settings.excludedTitles = [];
				await this.plugin.saveSettings();
				this.display();
			});
		}

		// ════════════════════════════════════════════════
		// SECTION: DataviewJS snippets
		// ════════════════════════════════════════════════
		new obsidian.Setting(containerEl)
			.setName("DataviewJS snippets")
			.setHeading();

		containerEl.createEl("p", {
			text: "Basic — show recent notes (respects all exclusion settings):",
			cls: "setting-item-description",
		});
		this.renderSnippet(containerEl, [
			'const rn = app.plugins.plugins["recent-notes-dataview"];',
			"if (!rn) { dv.paragraph('⚠ Plugin not enabled.'); }",
			"else {",
			"  const files = rn.getRecentFiles();",
			"  if (files.length === 0) {",
			'    dv.paragraph("No recent notes yet.");',
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
		]);

		containerEl.createEl("p", {
			text: 'With folder filter — show recent notes only from a specific folder (e.g. "Templates"):',
			cls: "setting-item-description",
		});
		this.renderSnippet(containerEl, [
			'const rn = app.plugins.plugins["recent-notes-dataview"];',
			"if (!rn) { dv.paragraph('⚠ Plugin not enabled.'); }",
			"else {",
			'  // Change "Templates" to any folder path you want',
			'  const files = rn.getRecentFiles({ fromFolder: "Templates" });',
			"  if (files.length === 0) {",
			'    dv.paragraph("No recent notes in this folder.");',
			"  } else {",
			'    dv.table(["Note", "Modified"],',
			"      files.map(f => [",
			"        dv.fileLink(f.path),",
			"        new Date(f.stat.mtime).toLocaleString()",
			"      ])",
			"    );",
			"  }",
			"}",
		]);

		containerEl.createEl("p", {
			text: "⚠ Requires the Dataview community plugin to be installed and enabled.",
			cls: "rn-warning-text",
		});
	}

	renderListRow(containerEl, iconText, labelText, onRemove) {
		const row = containerEl.createEl("div", { cls: "rn-list-row" });

		const left = row.createEl("div", { cls: "rn-list-row-left" });
		left.createEl("span", { text: iconText });
		left.createEl("span", { text: labelText, cls: "rn-list-row-label" });

		const removeBtn = row.createEl("button", {
			text: "Remove",
			cls: "rn-remove-btn",
		});
		removeBtn.addEventListener("click", () => void onRemove());

		row.appendChild(left);
		row.appendChild(removeBtn);
	}

	renderSnippet(containerEl, lines) {
		const box = containerEl.createEl("div", { cls: "rn-snippet-box" });
		const code = lines.join("\n");

		const pre = box.createEl("pre", { cls: "rn-snippet-pre" });
		pre.createEl("code", { text: code });

		const copyBtn = box.createEl("button", {
			text: "Copy",
			cls: "rn-copy-btn",
		});
		copyBtn.addEventListener("click", () => {
			void navigator.clipboard
				.writeText("```dataviewjs\n" + code + "\n```")
				.then(() => {
					copyBtn.textContent = "Copied ✓";
					setTimeout(() => (copyBtn.textContent = "Copy"), 1800);
				});
		});
	}
}

// ── Main Plugin Class ─────────────────────────────────
class RecentNotesPlugin extends obsidian.Plugin {
	async onload() {
		await this.loadSettings();

		// Native tracking — always runs as fallback
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
	}

	onunload() {
		// nothing to clean up
	}

	/**
	 * Native tracker — always keeps our own buffer of 100 paths.
	 * Used as fallback when recent-notes plugin is absent.
	 */
	trackRecentFile(path) {
		if (isExcluded(path, this.settings.excludedFolders, this.settings.excludedTitles))
			return;

		let files = this.settings.recentFiles.filter((f) => f !== path);
		files.unshift(path);
		files = files.slice(0, NATIVE_BUFFER_SIZE);
		this.settings.recentFiles = files;
		void this.saveSettings();
	}

	/**
	 * Public API for DataviewJS.
	 *
	 * Priority:
	 *   1. Pull paths from "recent-notes" plugin (Kamil Rudnicki) if installed → up to 100
	 *   2. Fall back to our own native tracking → up to 20
	 *
	 * @param {object}  [opts]
	 * @param {string}  [opts.fromFolder] — only return files inside this folder
	 */
	getRecentFiles(opts) {
		const max = this.settings.maxRecentNotes;
		const fromFolder =
			opts && opts.fromFolder
				? opts.fromFolder.replace(/\\/g, "/").replace(/\/+$/, "")
				: null;

		// ── Source selection ─────────────────────────────
		const externalPaths = getRecentNotesPluginPaths(this.app);
		const sourcePaths   = externalPaths ?? this.settings.recentFiles;

		// ── Build result ─────────────────────────────────
		const result = [];

		for (const path of sourcePaths) {
			if (result.length >= max) break;
			if (isExcluded(path, this.settings.excludedFolders, this.settings.excludedTitles))
				continue;
			if (fromFolder) {
				const norm = path.replace(/\\/g, "/");
				if (!(norm === fromFolder || norm.startsWith(fromFolder + "/")))
					continue;
			}
			const file = this.app.vault.getAbstractFileByPath(path);
			if (file instanceof obsidian.TFile) result.push(file);
		}

		return result;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

module.exports = RecentNotesPlugin;
						
