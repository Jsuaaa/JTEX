import type { CompletionContext } from '@codemirror/autocomplete';

export type ContextKind = 'cite' | 'ref' | 'envName' | 'command';

export interface DetectResult {
  kind: ContextKind;
  token: string;
  from: number;
}

const TOKEN_CHARS = String.raw`[A-Za-z0-9_:\-]`;
const CITE_CMDS =
  'cite|citep|citet|citeauthor|citeyear|nocite|parencite|textcite|Citep|Citet|fullcite|footcite|smartcite';
const REF_CMDS = 'ref|eqref|autoref|pageref|nameref|cref|Cref|vref|Vref';

const CITE_RE = new RegExp(
  String.raw`\\(?:${CITE_CMDS})\*?(?:\[[^\]]*\])*\{(?:[^}]*[,\s])?(${TOKEN_CHARS}*)$`,
);
const REF_RE = new RegExp(
  String.raw`\\(?:${REF_CMDS})\*?\{(${TOKEN_CHARS}*)$`,
);
const ENV_RE = /\\(?:begin|end)\{([A-Za-z*]*)$/;
const CMD_RE = /\\([a-zA-Z@]*)$/;

export function detectContext(ctx: CompletionContext): DetectResult | null {
  const cite = ctx.matchBefore(CITE_RE);
  if (cite) {
    const m = CITE_RE.exec(cite.text);
    if (m) {
      const token = m[1] ?? '';
      return { kind: 'cite', token, from: cite.to - token.length };
    }
  }

  const ref = ctx.matchBefore(REF_RE);
  if (ref) {
    const m = REF_RE.exec(ref.text);
    if (m) {
      const token = m[1] ?? '';
      return { kind: 'ref', token, from: ref.to - token.length };
    }
  }

  const env = ctx.matchBefore(ENV_RE);
  if (env) {
    const m = ENV_RE.exec(env.text);
    if (m) {
      const token = m[1] ?? '';
      return { kind: 'envName', token, from: env.to - token.length };
    }
  }

  const cmd = ctx.matchBefore(CMD_RE);
  if (cmd) {
    const m = CMD_RE.exec(cmd.text);
    if (m) {
      const token = m[1] ?? '';
      return { kind: 'command', token, from: cmd.to - token.length };
    }
  }

  return null;
}
