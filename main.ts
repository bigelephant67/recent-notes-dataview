import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";

// ── Interfaces ────────────────────────────────────────

interface TitleRule {
	text: string;
	exactMatch: boolean;
}

interface RecentNotesSettings {
	maxRecentNotes: number;
	recentFiles: string[];
	excludedFolders: string[];
	excludedTitles: TitleRule[];
}

interface GetRecentFilesOptions {
	fromFolder?: string;
}

// ── Defaults ──────────────────────────────────────────

const DEFAULT_SETTINGS: RecentNotesSettings = {
	maxRecentNotes: 5,
	recentFiles: [],
	excludedFolders: [],
	excludedTitles: [],
};

// ── Helpers ───────────────────────────────────────────

function isFolderExcluded(filePath: string, excludedFolders: string[]): boolean {
	if (!excludedFolders.length) return false;
	const norm = filePath.replace(/\\/g, "/");
	return excludedFolders.some((folder) => {
		if (!folder.trim()) return false;
		const f = folder.replace(/\\/g, "/").replace(/\/+$/, "");
		return norm === f || norm.startsWith(f + "/");
	});
}

function isTitleExcluded(filePath: string, excludedTitles: TitleRule[]): boolean {
	if (!excludedTitles.length) return false;
	const baseName = filePath
		.replace(/\\/g, "/")
		.split("/")
		.pop()!
		.replace(/\.md$/i, "")
		.toLowerCase();
	return excludedTitles.some(({ text, exactMatch }) => {
		if (!text.trim()) return false;
		const t = text.trim().toLowerCase();
		return exactMatch ? baseName === t : baseName.includes(t);
	});
}

function isExcluded(
	filePath: string,
	excludedFolders: string[],
	excludedTitles: TitleRule[]
): boolean {
	return (
		isFolderExcluded(filePath, excludedFolders) ||
		isTitleExcluded(filePath, excludedTitles)
	);
}

// ── Settings Tab ──────────────────────────────────────

class RecentNotesSettingTab extends PluginSettingTab {
	plugin: RecentNotesPlugin;

	constructor(app: App, plugin: RecentNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// ── Page heading ─────────────────────────────────
		new Setting(containerEl)
			.setName("Recent Notes for Dataview")
			.setHeading();

		containerEl.createEl("p", {
			text: "Tracks recently opened notes and exposes them to DataviewJS queries.",
			cls: "setting-item-description",
		});

		// ── Count slider ─────────────────────────────────
		new Setting(containerEl)
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

		// ════════════════════════════════════════════════
		// SECTION: Excluded folders
		// ════════════════════════════════════════════════
		new Setting(containerEl)
			.setName("Excluded folders")
			.setHeading();

		containerEl.createEl("p", {
			text: "Notes inside these folders will not be tracked or shown. Subfolders are excluded automatically.",
			cls: "setting-item-description",
		});

		// Folder add row
		const folderAddRow = containerEl.createEl("div", { cls: "rn-add-row" });

		const folderInput = folderAddRow.createEl("input", { type: "text" });
		folderInput.placeholder = "e.g. Private or Work/Drafts";
		folderInput.addClass("rn-text-input");
		folderInput.setAttribute("list", "rn-folder-list");

		// Folder autocomplete datalist
		const folderDatalist = containerEl.createEl("datalist");
		folderDatalist.id = "rn-folder-list";
		this.plugin.app.vault
			.getAllLoadedFiles()
			.filter((f) => (f as any).children !== undefined && f.path !== "/")
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
				new (window as any).Notice(`"${val}" is already excluded.`);
				return;
			}
			this.plugin.settings.excludedFolders.push(val);
			await this.plugin.saveSettings();
			folderInput.value = "";
			this.display();
		};

		folderAddBtn.addEventListener("click", doAddFolder);
		folderInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") void doAddFolder();
		});

		// Folder list
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
		new Setting(containerEl)
			.setName("Excluded titles")
			.setHeading();

		containerEl.createEl("p", {
			text: "Hide notes whose filename contains (or exactly matches) the text you specify.",
			cls: "setting-item-description",
		});

		// Title add wrapper
		const titleAddWrapper = containerEl.createEl("div", { cls: "rn-title-add-wrapper" });

		const titleInputRow = titleAddWrapper.createEl("div", { cls: "rn-add-row" });

		const titleInput = titleInputRow.createEl("input", { type: "text" });
		titleInput.placeholder = "e.g. Untitled or Meeting Notes";
		titleInput.addClass("rn-text-input");

		const titleAddBtn = titleInputRow.createEl("button", {
			text: "Add filter",
			cls: "rn-add-btn",
		});

		// Exact match toggle row
		const exactRow = titleAddWrapper.createEl("div", { cls: "rn-exact-row" });

		let exactMatchEnabled = false;

		const exactToggle = exactRow.createEl("div", { cls: "rn-toggle" });
		const exactKnob = exactToggle.createEl("div", { cls: "rn-toggle-knob" });

		const exactLabel = exactRow.createEl("span", {
			text: "Exact match: off — hides notes whose title contains this text",
			cls: "rn-exact-label",
		});

		const updateToggleUI = () => {
			if (exactMatchEnabled) {
				exactToggle.addClass("rn-toggle-on");
				exactToggle.removeClass("rn-toggle-off");
				exactLabel.textContent =
					"Exact match: on — only hides notes whose full title equals this text";
			} else {
				exactToggle.addClass("rn-toggle-off");
				exactToggle.removeClass("rn-toggle-on");
				exactLabel.textContent =
					"Exact match: off — hides notes whose title contains this text";
			}
		};
		updateToggleUI();

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
				new (window as any).Notice(
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

		titleAddBtn.addEventListener("click", doAddTitle);
		titleInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") void doAddTitle();
		});

		// Title list
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
		new Setting(containerEl)
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

		// Dataview required notice
		containerEl.createEl("p", {
			text: "⚠ Requires the Dataview community plugin to be installed and enabled.",
			cls: "rn-warning-text",
		});
	}

	private renderListRow(
		containerEl: HTMLElement,
		iconText: string,
		labelText: string,
		onRemove: () => Promise<void>
	): void {
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

	private renderSnippet(containerEl: HTMLElement, lines: string[]): void {
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

// ── Main Plugin ───────────────────────────────────────

export default class RecentNotesPlugin extends Plugin {
	settings!: RecentNotesSettings;

	async onload() {
		await this.loadSettings();

		this.registerEvent(
			this.app.workspace.on("file-open", (file: TFile | null) => {
				if (file && file.extension === "md") {
					this.trackRecentFile(file.path);
				}
			})
		);

		this.addSettingTab(new RecentNotesSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			const dv = (this.app as any).plugins?.plugins?.["dataview"];
			if (!dv) {
				new (window as any).Notice(
					"Recent Notes for Dataview: Dataview plugin not found. Install it from Community Plugins.",
					8000
				);
			}
		});
	}

	onunload() {
		// nothing to clean up
	}

	trackRecentFile(path: string): void {
		if (
			isExcluded(
				path,
				this.settings.excludedFolders,
				this.settings.excludedTitles
			)
		)
			return;

		let files = this.settings.recentFiles.filter((f) => f !== path);
		files.unshift(path);
		files = files.slice(0, 10);
		this.settings.recentFiles = files;
		void this.saveSettings();
	}

	getRecentFiles(opts?: GetRecentFilesOptions): TFile[] {
		const max = this.settings.maxRecentNotes;
		const fromFolder = opts?.fromFolder
			? opts.fromFolder.replace(/\\/g, "/").replace(/\/+$/, "")
			: null;

		const result: TFile[] = [];

		for (const path of this.settings.recentFiles) {
			if (result.length >= max) break;
			if (
				isExcluded(
					path,
					this.settings.excludedFolders,
					this.settings.excludedTitles
				)
			)
				continue;
			if (fromFolder) {
				const norm = path.replace(/\\/g, "/");
				if (!(norm === fromFolder || norm.startsWith(fromFolder + "/")))
					continue;
			}
			const file = this.app.vault.getAbstractFileByPath(path);
			if (file instanceof TFile) result.push(file);
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
