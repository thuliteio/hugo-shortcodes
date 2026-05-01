# Hugo Shortcodes

Syntax highlighting and intelligent completions for Hugo shortcodes inside Markdown.

This extension focuses on real Hugo shortcode templates found in your workspace and suggests shortcode names and arguments directly from those files.

## Features

![Demo](https://raw.githubusercontent.com/thuliteio/hugo-shortcodes/main/images/demo.gif)

- Highlights Hugo shortcode blocks in Markdown, including:
	- Delimiters (`{{< ... >}}`, `{{% ... %}}`)
	- Shortcode name
	- Named arguments
	- Strings and numeric literals
- Autocompletes shortcode names while typing in Markdown after trigger characters:
	- `%`, `<`, `-`
- Autocompletes named shortcode arguments based on `.Get "arg"` usage in shortcode templates.
- Watches shortcode template files and refreshes suggestions automatically when templates change.
- Includes default globs for Doks/Thulite shortcode templates:
	- `**/node_modules/@thulite/doks-core/layouts/_shortcodes/*.html`
	- `**/node_modules/@thulite/images/layouts/_shortcodes/*.html`
	- `**/node_modules/@thulite/inline-svg/layouts/_shortcodes/*.html`

## Shortcode Discovery

The extension scans these paths by default:

- `**/layouts/_shortcodes/*.html`
- `**/node_modules/@thulite/doks-core/layouts/_shortcodes/*.html`
- `**/node_modules/@thulite/images/layouts/_shortcodes/*.html`
- `**/node_modules/@thulite/inline-svg/layouts/_shortcodes/*.html`

You can add more glob patterns with settings (see below), including workspace-local module mounts and custom shortcode locations.

## Extension Settings

This extension contributes the following setting:

- `hugoShortcodes.additionalSearchGlobs`
	- Type: `string[]`
	- Default:
		- `**/node_modules/@thulite/doks-core/layouts/_shortcodes/*.html`
		- `**/node_modules/@thulite/images/layouts/_shortcodes/*.html`
		- `**/node_modules/@thulite/inline-svg/layouts/_shortcodes/*.html`
	- Purpose: Adds extra glob patterns for shortcode template discovery.

Example workspace configuration:

```json
{
	"hugoShortcodes.additionalSearchGlobs": [
		"**/layouts/shortcodes/*.html",
		"**/themes/*/layouts/_shortcodes/*.html"
	]
}
```

## Usage

1. Open a Markdown file in a Hugo/Thulite workspace.
2. Type `{{<` or `{{%` and start typing a shortcode name.
3. Select a suggested shortcode.
4. Press space inside the shortcode and start typing an argument key to get argument suggestions.

## How To Test Quickly

1. Start the watch build task (`npm run watch`) in the extension workspace.
2. Press `F5` to launch an Extension Development Host.
3. In that new window, open a Hugo/Thulite project containing shortcode templates.
4. Create or open a Markdown file and type `{{<`.
5. Confirm shortcode name suggestions appear from `layouts/_shortcodes` and Doks paths.
6. Select a shortcode, add a space, and verify argument suggestions appear.
7. Edit a shortcode template (`.Get "..."` arguments), save it, and verify suggestions refresh.

## Requirements

- VS Code `^1.117.0`
- A workspace containing Hugo shortcode templates (`layouts/_shortcodes/*.html` or configured paths)

## Known Limitations

- Suggestions are based on currently indexed files in the open workspace.
- Argument suggestions currently target named args discovered from `.Get "name"` patterns.
- External mounts outside the opened workspace are not scanned unless they are included via workspace folders/globs.

## Roadmap

- Positional argument suggestions inferred from `.Get 0`, `.Get 1`, and similar patterns.
- Better multiline shortcode context detection for completions.
- Optional documentation hovers for shortcode names and arguments.
- Broader shortcode discovery patterns for mixed Hugo layout conventions.

## Release Notes

### 0.0.1

- Initial release
- Hugo shortcode syntax highlighting for Markdown
- Shortcode name completion
- Shortcode argument completion from template parsing
- Doks/Thulite default shortcode glob support
