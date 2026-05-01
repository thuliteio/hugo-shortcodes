# Change Log

All notable changes to the "Hugo Shortcodes" extension will be documented in this file.

## [Unreleased]

- Added default shortcode discovery globs for `@thulite/images` and `@thulite/inline-svg`:
	- `**/node_modules/@thulite/images/layouts/_shortcodes/*.html`
	- `**/node_modules/@thulite/inline-svg/layouts/_shortcodes/*.html`

## [0.0.1]

- Initial release.
- Hugo shortcode syntax highlighting in Markdown.
- Shortcode name completions triggered while typing shortcode delimiters.
- Named argument completions based on `.Get "arg"` usage in shortcode templates.
- Automatic shortcode index refresh when template files change.
- Default Doks/Thulite shortcode discovery glob:
	- `**/node_modules/@thulite/doks-core/layouts/_shortcodes/*.html`