import * as assert from 'assert';
import * as vscode from 'vscode';
import { parseShortcodeTemplate } from '../extension';

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

	test('returns empty args and positions when template has no .Get usage', () => {
		const uri = vscode.Uri.file('c:/repo/layouts/_shortcodes/plain.html');
		const parsed = parseShortcodeTemplate(uri, '<div>No shortcode params here</div>');

		assert.deepStrictEqual(parsed.args, []);
		assert.deepStrictEqual(parsed.positions, []);
	});
});
