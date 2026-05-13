import * as vscode from 'vscode';

export type ShortcodeDefinition = {
	name: string;
	args: string[];
	positions: number[];
	uri: vscode.Uri;
	isBuiltin?: boolean;
};

type BuiltinShortcode = { args: string[]; positions: number[] };

export const HUGO_BUILTIN_SHORTCODES: Record<string, BuiltinShortcode> = {
	// https://gohugo.io/shortcodes/details/
	details: {
		args: ['class', 'name', 'open', 'summary', 'title'],
		positions: [],
	},
	// https://gohugo.io/shortcodes/figure/
	figure: {
		args: ['alt', 'attr', 'attrlink', 'caption', 'class', 'height', 'link', 'loading', 'rel', 'src', 'target', 'title', 'width'],
		positions: [],
	},
	// https://gohugo.io/shortcodes/highlight/
	highlight: {
		args: [],
		positions: [0, 1], // LANG, OPTIONS
	},
	// https://gohugo.io/shortcodes/instagram/
	instagram: {
		args: [],
		positions: [0], // post ID
	},
	// https://gohugo.io/shortcodes/param/
	param: {
		args: [],
		positions: [0], // param key
	},
	// https://gohugo.io/shortcodes/qr/
	qr: {
		args: ['alt', 'class', 'id', 'level', 'loading', 'scale', 'targetDir', 'text', 'title'],
		positions: [],
	},
	// https://gohugo.io/shortcodes/ref/
	ref: {
		args: ['lang', 'outputFormat', 'path'],
		positions: [0], // path
	},
	// https://gohugo.io/shortcodes/relref/
	relref: {
		args: ['lang', 'outputFormat', 'path'],
		positions: [0], // path
	},
	// https://gohugo.io/shortcodes/vimeo/
	vimeo: {
		args: ['allowFullScreen', 'class', 'id', 'loading', 'title'],
		positions: [0], // video ID
	},
	// https://gohugo.io/shortcodes/x/
	x: {
		args: ['id', 'user'],
		positions: [],
	},
	// https://gohugo.io/shortcodes/youtube/
	youtube: {
		args: ['allowFullScreen', 'autoplay', 'class', 'controls', 'end', 'id', 'loading', 'loop', 'mute', 'start', 'title'],
		positions: [0], // video ID
	},
};

class ShortcodeIndex {
	private readonly shortcodes = new Map<string, ShortcodeDefinition>();
	private refreshTimer: NodeJS.Timeout | undefined;

	public async refresh(): Promise<void> {
		const files = await this.findTemplateFiles();
		const next = new Map<string, ShortcodeDefinition>();

		// Seed built-ins first; workspace files below will override any with the same name.
		const builtinUri = vscode.Uri.parse('hugo:embedded');
		for (const [name, builtin] of Object.entries(HUGO_BUILTIN_SHORTCODES)) {
			next.set(name, { name, ...builtin, uri: builtinUri, isBuiltin: true });
		}

		for (const uri of files) {
			try {
				const content = (await vscode.workspace.fs.readFile(uri)).toString();
				const parsed = parseShortcodeTemplate(uri, content);
				next.set(parsed.name, parsed);
			} catch (error) {
				console.warn(`Failed to parse shortcode template ${uri.fsPath}`, error);
			}
		}

		this.shortcodes.clear();
		next.forEach((definition, name) => this.shortcodes.set(name, definition));
	}

	public scheduleRefresh(): void {
		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
		}

		this.refreshTimer = setTimeout(() => {
			void this.refresh();
		}, 250);
	}

	public all(): ShortcodeDefinition[] {
		return [...this.shortcodes.values()].sort((a, b) => a.name.localeCompare(b.name));
	}

	public byName(name: string): ShortcodeDefinition | undefined {
		return this.shortcodes.get(name);
	}

	private async findTemplateFiles(): Promise<vscode.Uri[]> {
		const configured = vscode.workspace
			.getConfiguration('hugoShortcodes')
			.get<string[]>('additionalSearchGlobs', []);

		const searchGlobs = [
			'**/layouts/_shortcodes/*.html',
			...configured,
		];

		const results = await Promise.all(
			searchGlobs.map((glob) =>
				vscode.workspace.findFiles(glob, '{**/.git/**,**/.turbo/**}')
			)
		);

		const unique = new Map<string, vscode.Uri>();
		for (const uris of results) {
			for (const uri of uris) {
				unique.set(uri.toString(), uri);
			}
		}

		return [...unique.values()];
	}
}

export async function activate(context: vscode.ExtensionContext) {
	const index = new ShortcodeIndex();
	await index.refresh();

	const watchers = [
		vscode.workspace.createFileSystemWatcher('**/layouts/_shortcodes/*.html'),
	];

	for (const watcher of watchers) {
		watcher.onDidCreate(() => index.scheduleRefresh());
		watcher.onDidChange(() => index.scheduleRefresh());
		watcher.onDidDelete(() => index.scheduleRefresh());
		context.subscriptions.push(watcher);
	}

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration('hugoShortcodes.additionalSearchGlobs')) {
				index.scheduleRefresh();
			}
		})
	);

	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			{ language: 'markdown' },
			{
				provideCompletionItems(document, position) {
					const nameItems = provideShortcodeNameCompletions(document, position, index);
					if (nameItems.length > 0) {
						return nameItems;
					}

					const argItems = provideShortcodeArgCompletions(document, position, index);
					return argItems;
				},
			},
			'%',
			'<',
			'-',
			' '
		)
	);
}

function provideShortcodeNameCompletions(
	document: vscode.TextDocument,
	position: vscode.Position,
	index: ShortcodeIndex
): vscode.CompletionItem[] {
	const line = document.lineAt(position.line).text.slice(0, position.character);
	const context = parseShortcodeNameCompletionContext(line);
	if (!context) {
		return [];
	}

	const typed = context.typed;
	const range = new vscode.Range(
		new vscode.Position(position.line, position.character - typed.length),
		position
	);

	return index
		.all()
		.filter((shortcode) => shortcode.name.startsWith(typed))
		.map((shortcode) => {
			const item = new vscode.CompletionItem(shortcode.name, vscode.CompletionItemKind.Function);
			item.range = range;
			item.insertText = shortcode.name;
			item.documentation = new vscode.MarkdownString(
				shortcode.isBuiltin
					? `Hugo embedded shortcode`
					: `Source: ${shortcode.uri.fsPath.replace(/\\/g, '/')}`
			);
			if (context.isClosing) {
				item.detail = 'Closing shortcode';
			} else if (shortcode.isBuiltin) {
				item.detail = 'Hugo built-in';
			}
			item.sortText = `0_${shortcode.name}`;
			return item;
		});
}

export function parseShortcodeNameCompletionContext(
	linePrefix: string
): { typed: string; isClosing: boolean } | undefined {
	const match = linePrefix.match(/{{[%<]-?\s*(\/?)\s*([A-Za-z0-9_-]*)$/);
	if (!match) {
		return undefined;
	}

	return {
		isClosing: match[1] === '/',
		typed: match[2] ?? '',
	};
}

function provideShortcodeArgCompletions(
	document: vscode.TextDocument,
	position: vscode.Position,
	index: ShortcodeIndex
): vscode.CompletionItem[] {
	const line = document.lineAt(position.line).text.slice(0, position.character);
	const match = line.match(/{{[%<]-?\s*([A-Za-z0-9_-]+)\s+([^}]*)$/);
	if (!match) {
		return [];
	}

	const shortcodeName = match[1];
	const definition = index.byName(shortcodeName);
	if (!definition || (definition.args.length === 0 && definition.positions.length === 0)) {
		return [];
	}
	const parsedInvocation = parseShortcodeInvocationArgs(match[2]);
	const usedArgs = new Set<string>(parsedInvocation.namedArgs);

	const range = document.getWordRangeAtPosition(position, /[A-Za-z0-9_-]+/) ??
		new vscode.Range(position, position);
	const items: vscode.CompletionItem[] = [];

	for (const arg of definition.args.filter((candidate) => !usedArgs.has(candidate))) {
		const item = new vscode.CompletionItem(arg, vscode.CompletionItemKind.Property);
		item.range = range;
		item.insertText = new vscode.SnippetString(`${arg}="$1"`);
		item.documentation = new vscode.MarkdownString(
			definition.isBuiltin
				? `Hugo embedded shortcode argument`
				: `Argument from ${definition.uri.fsPath.replace(/\\/g, '/')}`
		);
		item.sortText = `1_${arg}`;
		items.push(item);
	}

	const nextPositional = nextPositionalIndex(definition.positions, parsedInvocation.positionalCount);
	if (nextPositional !== undefined) {
		for (const suggestion of buildPositionalSuggestions(shortcodeName, nextPositional, definition.uri)) {
			suggestion.range = range;
			items.push(suggestion);
		}
	}

	return items;
}

export function parseShortcodeInvocationArgs(rawArgs: string): { namedArgs: string[]; positionalCount: number } {
	const tokens = splitInvocationTokens(rawArgs);
	const namedArgs = new Set<string>();
	let positionalCount = 0;

	for (const token of tokens) {
		const namedMatch = token.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*=/);
		if (namedMatch) {
			namedArgs.add(namedMatch[1]);
			continue;
		}

		if (token.length > 0) {
			positionalCount += 1;
		}
	}

	return {
		namedArgs: [...namedArgs].sort(),
		positionalCount,
	};
}

function splitInvocationTokens(rawArgs: string): string[] {
	const tokens: string[] = [];
	let current = '';
	let quote: '"' | "'" | undefined;

	for (const char of rawArgs) {
		if (quote) {
			current += char;
			if (char === quote) {
				quote = undefined;
			}
			continue;
		}

		if (char === '"' || char === "'") {
			quote = char;
			current += char;
			continue;
		}

		if (/\s/.test(char)) {
			if (current.length > 0) {
				tokens.push(current);
				current = '';
			}
			continue;
		}

		current += char;
	}

	if (current.length > 0) {
		tokens.push(current);
	}

	return tokens;
}

function nextPositionalIndex(positions: number[], positionalCount: number): number | undefined {
	const sorted = [...positions].sort((a, b) => a - b);
	return sorted[positionalCount];
}

function buildPositionalSuggestions(
	shortcodeName: string,
	positionIndex: number,
	uri: vscode.Uri
): vscode.CompletionItem[] {
	const source = uri.fsPath.replace(/\\/g, '/');
	const items: vscode.CompletionItem[] = [];

	if (shortcodeName === 'details' && positionIndex === 1) {
		const openItem = new vscode.CompletionItem('open', vscode.CompletionItemKind.Value);
		openItem.insertText = 'open';
		openItem.documentation = new vscode.MarkdownString(`Positional argument #1 from ${source}`);
		openItem.sortText = '2_0_open';
		items.push(openItem);
	}

	const positionalItem = new vscode.CompletionItem(`arg${positionIndex}`, vscode.CompletionItemKind.Value);
	positionalItem.insertText = new vscode.SnippetString(
		positionIndex === 0 ? '"$1"' : '$1'
	);
	positionalItem.documentation = new vscode.MarkdownString(
		`Positional argument #${positionIndex} from ${source}`
	);
	positionalItem.sortText = `2_1_arg${positionIndex}`;
	items.push(positionalItem);

	return items;
}

export function parseShortcodeTemplate(uri: vscode.Uri, content: string): ShortcodeDefinition {
	const fileName = uri.path.split('/').pop() ?? '';
	const name = fileName.replace(/\.html$/i, '');
	const args = new Set<string>();
	const positions = new Set<number>();

	if (name === 'inline-svg') {
		for (const arg of [
			'src',
			'id',
			'class',
			'role',
			'title',
			'desc',
			'ariaLabelledby',
			'ariaDescribedby',
			'width',
			'height',
		]) {
			args.add(arg);
		}
	}

	for (const match of content.matchAll(/@param\s+\{[^}]+\}\s+\[([^\]]+)\]/g)) {
		args.add(match[1]);
	}

	for (const match of content.matchAll(/\.Params\.([A-Za-z_][A-Za-z0-9_-]*)/g)) {
		args.add(match[1]);
	}

	for (const match of content.matchAll(/\.Get\s+(?:\"([^\"]+)\"|'([^']+)'|(\d+))/g)) {
		const named = match[1] ?? match[2];
		if (named) {
			args.add(named);
		}
		const positional = match[3];
		if (positional) {
			positions.add(Number(positional));
		}
	}

	return {
		name,
		args: [...args].sort(),
		positions: [...positions].sort((a, b) => a - b),
		uri,
	};
}

export function deactivate() {}
