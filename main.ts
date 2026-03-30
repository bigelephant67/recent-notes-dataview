import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	WorkspaceLeaf,
} from "obsidian";

interface RecentNotesSettings {
	maxRecentNotes: number;
	recentFiles: string[];
}

const DEFAULT_SETTINGS: RecentNotesSettings = {
	maxRecentNotes: 5,
	recentFiles: [],
};

export default class RecentNotesPlugin extends Plugin {
	settings: RecentNotesSettings;

	async onload() {
		await this.loadSettings();

		// Track file opens
		this.registerEvent(
			this.app.workspace.on("file-open", (file: TFile | null) => {
				if (file && file.extension === "md") {
					this.trackRecentFile(file.path);
				}
			})
		);

		// Register dataview query source
		this.registerDataviewSource();

		// Add settings tab
		this.addSettingTab(new RecentNotesSettingTab(this.app, this));

		console.log("Recent Notes Plugin loaded");
	}

	onunload() {
		console.log("Recent Notes Plugin unloaded");
	}

	trackRecentFile(path: string) {
		let files = this.settings.recentFiles.filter((f) => f !== path);
		files.unshift(path);
		files = files.slice(0, Math.max(this.settings.maxRecentNotes, 10)); // Keep buffer
		this.settings.recentFiles = files;
		this.saveSettings();
	}

	getRecentFiles(): TFile[] {
		const max = this.settings.maxRecentNotes;
		const result: TFile[] = [];

		for (const path of this.settings.recentFiles) {
			if (result.length >= max) break;
			const file = this.app.vault.getAbstractFileByPath(path);
			if (file instanceof TFile) {
				result.push(file);
			}
		}

		return result;
	}

	registerDataviewSource() {
		// Wait for dataview to be ready
		this.app.workspace.onLayoutReady(() => {
			// @ts-ignore - Dataview API
			const dvPlugin = this.app.plugins?.plugins?.["dataview"];
			if (!dvPlugin?.api) {
				console.warn(
					"Dataview plugin not found. Install Dataview to use query features."
				);
				return;
			}

			console.log("Dataview detected. Recent Notes source registered.");
		});
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

class RecentNotesSettingTab extends PluginSettingTab {
	plugin: RecentNotesPlugin;

	constructor(app: App, plugin: RecentNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Recent Notes Settings" });

		new Setting(containerEl)
			.setName("Number of recent notes")
			.setDesc(
				"How many recently opened notes to track and show (5–10)."
			)
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

		containerEl.createEl("h3", { text: "How to use in Dataview" });

		const codeWrapper = containerEl.createEl("div", {
			cls: "recent-notes-code-block",
		});
		codeWrapper.style.cssText =
			"background: var(--background-secondary); border-radius: 6px; padding: 12px 16px; margin-top: 8px;";

		const pre = codeWrapper.createEl("pre");
		pre.style.cssText = "margin: 0; font-size: 13px; overflow-x: auto;";
		pre.createEl("code", {
			text: "```dataviewjs\n// Recent Notes - powered by Recent Notes Plugin\nconst recentPlugin = app.plugins.plugins[\"recent-notes-dataview\"];\nconst files = recentPlugin.getRecentFiles();\n\nif (files.length === 0) {\n  dv.paragraph(\"No recent notes yet. Open some notes!\");\n} else {\n  dv.table(\n    [\"Note\", \"Last Modified\", \"Folder\"],\n    files.map(f => [\n      dv.fileLink(f.path),\n      new Date(f.stat.mtime).toLocaleString(),\n      f.parent?.path || \"/\"\n    ])\n  );\n}\n```",
		});

		containerEl.createEl("p", {
			text: '⚠ Requires the Dataview plugin to be installed and enabled. Use the "dataviewjs" block type shown above.',
			cls: "mod-warning",
		});
	}
}
