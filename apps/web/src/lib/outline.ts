export type OutlineEntry = { label: string; level: number; line: number };

const RULES: { re: RegExp; level: number }[] = [
  { re: /^\s*\\section\*?\{([^}]+)\}/, level: 1 },
  { re: /^\s*\\subsection\*?\{([^}]+)\}/, level: 2 },
  { re: /^\s*\\subsubsection\*?\{([^}]+)\}/, level: 3 },
  { re: /^\s*\\paragraph\*?\{([^}]+)\}/, level: 3 },
  { re: /^\s*\\chapter\*?\{([^}]+)\}/, level: 1 },
];

export function parseOutline(source: string): OutlineEntry[] {
  const lines = source.split(/\r?\n/);
  const out: OutlineEntry[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    for (const r of RULES) {
      const m = r.re.exec(line);
      if (m) {
        out.push({ label: m[1] ?? '', level: r.level, line: i + 1 });
        break;
      }
    }
  }
  return out;
}
