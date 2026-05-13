import * as assert from 'assert';
import * as vscode from 'vscode';
import {
	HUGO_BUILTIN_SHORTCODES,
	parseShortcodeInvocationArgs,
	parseShortcodeNameCompletionContext,
	parseShortcodeTemplate,
} from '../extension';

suite('Hugo Shortcodes', () => {
	test('parses shortcode name from template filename', () => {
		const uri = vscode.Uri.file('c:/repo/layouts/_shortcodes/hero.html');
		const parsed = parseShortcodeTemplate(uri, '{{ .Get "title" }}');

		assert.strictEqual(parsed.name, 'hero');
	});

	test('parses unique named args and positional args', () => {
		const uri = vscode.Uri.file('c:/repo/layouts/_shortcodes/card.html');
		const template = [
			'{{ .Get "title" }}',
			'{{ .Get "icon" }}',
			'{{ .Get "title" }}',
			'{{ .Get 2 }}',
			'{{ .Get 0 }}',
			'{{ .Get 2 }}',
		].join('\n');

		const parsed = parseShortcodeTemplate(uri, template);
		assert.deepStrictEqual(parsed.args, ['icon', 'title']);
		assert.deepStrictEqual(parsed.positions, [0, 2]);
	});

	test('supports single-quoted args', () => {
		const uri = vscode.Uri.file('c:/repo/layouts/_shortcodes/badge.html');
		const parsed = parseShortcodeTemplate(uri, "{{ .Get 'variant' }}\\n{{ .Get 'label' }}");

		assert.deepStrictEqual(parsed.args, ['label', 'variant']);
		assert.deepStrictEqual(parsed.positions, []);
	});

	test('parses documented params from shortcode comments', () => {
		const uri = vscode.Uri.file('c:/repo/layouts/_shortcodes/img.html');
		const template = [
			'@param {string} [src] The path to the image.',
			'@param {int} [width] The display width of the image.',
			'{{ with .Get "formats" }}{{ end }}',
		].join('\n');

		const parsed = parseShortcodeTemplate(uri, template);

		assert.deepStrictEqual(parsed.args, ['formats', 'src', 'width']);
	});

	test('parses documented inline-svg args', () => {
		const uri = vscode.Uri.file('c:/repo/layouts/_shortcodes/inline-svg.html');
		const template = [
			'{{ $svg := .src }}',
			'{{ $id := .id | default (print "svg-" (path.Base $path)) }}',
			'{{ $role := .role | default "img" }}',
			'{{ with $.title }}{{ end }}',
			'{{ with $.desc }}{{ end }}',
			'{{ with $.class }}{{ end }}',
		].join('\n');

		const parsed = parseShortcodeTemplate(uri, template);

		assert.deepStrictEqual(parsed.args, [
			'ariaDescribedby',
			'ariaLabelledby',
			'class',
			'desc',
			'height',
			'id',
			'role',
			'src',
			'title',
			'width',
		]);
		assert.ok(!parsed.args.includes('Page'));
		assert.ok(!parsed.args.includes('Params'));
		assert.ok(!parsed.args.includes('svg'));
	});

	test('parses args from .Params access pattern', () => {
		const uri = vscode.Uri.file('c:/repo/layouts/_shortcodes/link-card.html');
		const template = [
			'{{- $opts := dict',
			'  "src" .Params.src',
			'  "href" .Params.href',
			'  "title" .Params.title',
			'  "description" .Params.description',
			'  "target" .Params.target',
			'  "class" .Params.class',
			'  "rel" .Params.rel',
			'}}',
		].join('\n');

		const parsed = parseShortcodeTemplate(uri, template);

		assert.deepStrictEqual(parsed.args, [
			'class',
			'description',
			'href',
			'rel',
			'src',
			'target',
			'title',
		]);
	});

	test('returns empty args and positions when template has no .Get usage', () => {
		const uri = vscode.Uri.file('c:/repo/layouts/_shortcodes/plain.html');
		const parsed = parseShortcodeTemplate(uri, '<div>No shortcode params here</div>');

		assert.deepStrictEqual(parsed.args, []);
		assert.deepStrictEqual(parsed.positions, []);
	});

	test('HUGO_BUILTIN_SHORTCODES covers all 11 embedded shortcodes', () => {
		const expected = ['details', 'figure', 'highlight', 'instagram', 'param', 'qr', 'ref', 'relref', 'vimeo', 'x', 'youtube'];
		for (const name of expected) {
			assert.ok(name in HUGO_BUILTIN_SHORTCODES, `Missing built-in: ${name}`);
		}
		assert.strictEqual(Object.keys(HUGO_BUILTIN_SHORTCODES).length, expected.length);
	});

	test('HUGO_BUILTIN_SHORTCODES figure has expected named args', () => {
		assert.deepStrictEqual(HUGO_BUILTIN_SHORTCODES['figure'].args, [
			'alt', 'attr', 'attrlink', 'caption', 'class', 'height',
			'link', 'loading', 'rel', 'src', 'target', 'title', 'width',
		]);
		assert.deepStrictEqual(HUGO_BUILTIN_SHORTCODES['figure'].positions, []);
	});

	test('HUGO_BUILTIN_SHORTCODES details has named args including open', () => {
		assert.ok(HUGO_BUILTIN_SHORTCODES['details'].args.includes('open'));
		assert.ok(HUGO_BUILTIN_SHORTCODES['details'].args.includes('summary'));
	});

	test('HUGO_BUILTIN_SHORTCODES highlight uses positional args only', () => {
		assert.deepStrictEqual(HUGO_BUILTIN_SHORTCODES['highlight'].args, []);
		assert.deepStrictEqual(HUGO_BUILTIN_SHORTCODES['highlight'].positions, [0, 1]);
	});

	test('parses invocation args with named and positional values', () => {
		const parsed = parseShortcodeInvocationArgs('"Start in open state" open class="prose"');

		assert.deepStrictEqual(parsed.namedArgs, ['class']);
		assert.strictEqual(parsed.positionalCount, 2);
	});

	test('parses invocation args with incomplete quoted values', () => {
		const parsed = parseShortcodeInvocationArgs('title="Install guide class="lead" open');

		assert.deepStrictEqual(parsed.namedArgs, ['title']);
		assert.strictEqual(parsed.positionalCount, 0);
	});

	test('parses opening shortcode name completion context', () => {
		const parsed = parseShortcodeNameCompletionContext('{{< det');

		assert.deepStrictEqual(parsed, { typed: 'det', isClosing: false });
	});

	test('parses closing shortcode name completion context', () => {
		const parsed = parseShortcodeNameCompletionContext('{{< /det');

		assert.deepStrictEqual(parsed, { typed: 'det', isClosing: true });
	});
});
