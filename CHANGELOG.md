# Changelog
---
## [1.4.0] - 2026-04-27
### 🚀 New Features & Enhancements
- **100-Note Integration**: Integration with "Recent Notes" plugin by Kamil Rudnicki — up to 100 notes.
- **Dynamic Slider**: Slider max now 100 (with plugin) or 20 (without).
- **Live Status Banners**: Live status banner added in Settings.
- **Buffer Expansion**: Native buffer expanded to 100.
- **Hash Function**: Added `hash()` for consistent randomization across refreshes.
- **Array Slicing**: Introduced `slice()` for better array manipulation.
- **Task Interaction**: List items in task views are now clickable for enhanced navigation.
- **Image Sizing**: Support for `WxH` metadata in image embeds.
- **Markdown Headers**: Table headers now support full Markdown formatting and links.

### 🐞 Fixes
- **Sorting**: Null values are now sorted first for better consistency.
- **Tag Parsing**: Improved support for space-delimited tags in YAML.
---
## [1.3.0]
- All inline styles replaced with `styles.css`.
- Headings migrated to `Setting.setHeading()`.
- UI text corrected to sentence case.
- `console.log` removed.
- Promises properly handled with `void`.
- Unused imports removed.
---
## [1.2.0]
- Added Excluded Titles with contains/exact match toggle.
- Added `fromFolder` option to `getRecentFiles()`.
- Two snippets added in Settings.
---
## [1.1.0]
- Added Excluded Folders with autocomplete, recursive path matching, retroactive exclusion, and Clear all button.
---
## [1.0.0]
- Initial release. 
- Tracks recent `.md` files, configurable count slider (5–10), DataviewJS API via `getRecentFiles()`, persistent storage, mobile support.
