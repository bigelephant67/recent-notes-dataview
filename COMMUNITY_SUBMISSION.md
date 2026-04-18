# Community Plugin Submission — Recent Notes for Dataview

This file contains the exact text to paste into the Pull Request when submitting
to https://github.com/obsidianmd/obsidian-releases

---

## PR Title

Add plugin: Recent Notes for Dataview

---

## PR Body (paste this exactly)

---

**Plugin ID:** `recent-notes-dataview`
**Plugin Name:** Recent Notes for Dataview
**Author:** Fat Elephant aka Waghmare
**GitHub URL:** https://github.com/sujit-waghmare/recent-notes-dataview
**Description:** Tracks your recently opened notes and displays them in Dataview queries. Supports configurable count (5–10) and folder exclusions.

### Checklist (required by Obsidian)

- [x] My plugin does not use `innerHTML`, `outerHTML`, or `insertAdjacentHTML`
- [x] My plugin does not make any network requests
- [x] My plugin works on mobile (isDesktopOnly: false)
- [x] I have tested the plugin in Obsidian and it works correctly
- [x] `manifest.json` version matches the latest GitHub release tag
- [x] `versions.json` is present and correct
- [x] Plugin code is available at the repository root
- [x] README contains installation and usage instructions
- [x] The plugin has an MIT license

---

## Steps to submit to the Obsidian community

1. Make sure your repo is public at: https://github.com/sujit-waghmare/recent-notes-dataview
2. Create a release tagged exactly `1.1.0` on GitHub (the GitHub Actions workflow does this automatically when you push the tag)
3. Fork the official releases repo: https://github.com/obsidianmd/obsidian-releases
4. In your fork, open `community-plugins.json`
5. Add this entry to the JSON array (in alphabetical order by `id`):

```json
{
  "id": "recent-notes-dataview",
  "name": "Recent Notes for Dataview",
  "author": "Waghmare",
  "description": "Tracks your recently opened notes and displays them in Dataview queries. Supports configurable count (5–10) and folder exclusions.",
  "repo": "sujit-waghmare/recent-notes-dataview"
}
```

6. Commit that change with message: `Add plugin: Recent Notes for Dataview`
7. Open a Pull Request to `obsidianmd/obsidian-releases` with the PR title and body from above
8. Wait for Obsidian team review (usually 1–4 weeks)
