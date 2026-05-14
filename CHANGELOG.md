# Change Log

All notable changes to the "Hugo Shortcodes" extension will be documented in this file.

## 0.1.0

- Initial release.
- Hugo shortcode syntax highlighting in Markdown.
- Shortcode name completions triggered while typing shortcode delimiters.
- Shortcode argument completion from template parsing.
- Named argument completions based on `.Get "arg"` usage in shortcode templates.
- Automatic shortcode index refresh when template files change.
- Default Doks/Thulite shortcode discovery glob:
  - `**/node_modules/@thulite/doks-core/layouts/_shortcodes/*.html`
