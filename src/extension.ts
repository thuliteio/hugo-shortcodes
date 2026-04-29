import * as vscode from 'vscode';

export type ShortcodeDefinition = {
	name: string;
	args: string[];
	positions: number[];
	uri: vscode.Uri;
};

class ShortcodeIndex {
	private readonly shortcodes = new Map<string, ShortcodeDefinition>();
	private refreshTimer: NodeJS.Timeout | undefined;

	public async refresh(): Promise<void> {
		const files = await this.findTemplateFiles();
		const next = new Map<string, ShortcodeDefinition>();

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
	const match = line.match(/{{[%<]-?\s*\/?([A-Za-z0-9_-]*)$/);
	if (!match || line.includes('{{</')) {
		return [];
	}

	const typed = match[1] ?? '';
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
				`Source: ${shortcode.uri.fsPath.replace(/\\/g, '/')}`
			);
			item.sortText = `0_${shortcode.name}`;
			return item;
		});
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
	if (!definition || definition.args.length === 0) {
		return [];
	}

	const usedArgs = new Set<string>();
	for (const argMatch of match[2].matchAll(/([A-Za-z_][A-Za-z0-9_-]*)\s*=/g)) {
		usedArgs.add(argMatch[1]);
	}

	const range = document.getWordRangeAtPosition(position, /[A-Za-z0-9_-]+/) ??
		new vscode.Range(position, position);

	return definition.args
		.filter((arg) => !usedArgs.has(arg))
		.map((arg) => {
			const item = new vscode.CompletionItem(arg, vscode.CompletionItemKind.Property);
			item.range = range;
			item.insertText = new vscode.SnippetString(`${arg}=\"$1\"`);
			item.documentation = new vscode.MarkdownString(
				`Argument from ${definition.uri.fsPath.replace(/\\/g, '/')}`
			);
			item.sortText = `1_${arg}`;
			return item;
		});
}

export function parseShortcodeTemplate(uri: vscode.Uri, content: string): ShortcodeDefinition {
	const fileName = uri.path.split('/').pop() ?? '';
	const name = fileName.replace(/\.html$/i, '');
	const args = new Set<string>();
	const positions = new Set<number>();

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
