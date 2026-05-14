import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { snippetCompletion } from '@codemirror/autocomplete';
import { COMMANDS } from './data/commands';
import { ENVIRONMENTS } from './data/environments';
import { SNIPPETS } from './data/snippets';
import { detectContext } from './context';
import { getProjectIndex } from './project-index';

const CMD_VALID = /^[a-zA-Z@]*$/;
const ENV_VALID = /^[A-Za-z*]*$/;
const KEY_VALID = /^[A-Za-z0-9_:-]*$/;

export function latexSource(context: CompletionContext): CompletionResult | null {
  const detected = detectContext(context);
  if (!detected) {
    if (!context.explicit) return null;
    return buildCommandResult(context.pos);
  }
  switch (detected.kind) {
    case 'envName':
      return buildEnvResult(detected.from);
    case 'cite':
      return buildCiteResult(detected.from);
    case 'ref':
      return buildRefResult(detected.from);
    case 'command':
      return buildCommandResult(detected.from);
  }
}

function buildCommandResult(from: number): CompletionResult {
  const options: Completion[] = [];

  for (const c of COMMANDS) {
    const label = `\\${c.name}`;
    if (c.template) {
      options.push(
        snippetCompletion(c.template, {
          label,
          detail: c.detail,
          info: c.info,
          type: 'function',
        }),
      );
    } else {
      options.push({ label, detail: c.detail, type: 'function' });
    }
  }

  for (const s of SNIPPETS) {
    options.push(
      snippetCompletion(s.template, {
        label: `\\${s.label}`,
        detail: s.detail,
        type: 'keyword',
      }),
    );
  }

  const idx = getProjectIndex();
  for (const lc of idx.localCommands) {
    options.push({
      label: `\\${lc.name}`,
      detail: `local · ${lc.file}`,
      type: 'function',
    });
  }

  return { from, options, validFor: CMD_VALID };
}

function buildEnvResult(from: number): CompletionResult {
  const options: Completion[] = ENVIRONMENTS.map((e) =>
    e.template
      ? snippetCompletion(e.template, {
          label: e.name,
          detail: e.detail,
          type: 'class',
        })
      : { label: e.name, detail: e.detail, type: 'class' },
  );
  return { from, options, validFor: ENV_VALID };
}

function buildCiteResult(from: number): CompletionResult | null {
  const idx = getProjectIndex();
  if (idx.bibEntries.length === 0) return null;
  const options: Completion[] = idx.bibEntries.map((b) => ({
    label: b.key,
    detail:
      b.author && b.year
        ? `${shortAuthor(b.author)} (${b.year})`
        : b.year ?? b.type,
    info: b.title,
    type: 'variable',
  }));
  return { from, options, validFor: KEY_VALID };
}

function buildRefResult(from: number): CompletionResult | null {
  const idx = getProjectIndex();
  if (idx.labels.length === 0) return null;
  const options: Completion[] = idx.labels.map((l) => ({
    label: l.name,
    detail: `${l.file}:${l.line}`,
    type: 'variable',
  }));
  return { from, options, validFor: KEY_VALID };
}

function shortAuthor(author: string): string {
  const first = author.split(/\s+and\s+/i)[0] ?? author;
  const parts = first.split(',');
  return (parts[0] ?? first).trim();
}
