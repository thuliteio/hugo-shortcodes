# Change Log

All notable changes to the "Hugo Shortcodes" extension will be documented in this file.

## [Unreleased]

- Added completion support for all 11 Hugo embedded shortcodes (`details`, `figure`, `highlight`, `instagram`, `param`, `qr`, `ref`, `relref`, `vimeo`, `x`, `youtube`) with documented named and positional arguments.
- Workspace shortcode templates override built-ins with the same name, so Thulite's `details` and `figure` take priority when installed via Doks.
- Built-in shortcode completions are labelled **Hugo built-in** in the VS Code suggestion detail.
- Added argument discovery from `.Params.arg` access patterns (fixes Doks `link-card` and similar shortcodes).
- Added `@param` doc-comment argument discovery.
- Added closing shortcode name completion (for example `{{< /details >}}`).
- Added positional argument slot suggestions inferred from `.Get 0`, `.Get 1`, and similar patterns.
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
