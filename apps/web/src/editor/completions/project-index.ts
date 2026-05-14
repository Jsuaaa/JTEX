import { useProject } from '../../store/project';
import type { BibEntry, LabelDef, LocalCommandDef } from './types';
import { scanDocument } from './doc-scanner';
import { parseBib } from './bib-parser';

interface CachedTex {
  kind: 'tex';
  updatedAt: number;
  labels: LabelDef[];
  localCommands: LocalCommandDef[];
}

interface CachedBib {
  kind: 'bib';
  updatedAt: number;
  bibEntries: BibEntry[];
}

type CachedFile = CachedTex | CachedBib;

const cache = new Map<string, CachedFile>();

export interface ProjectIndex {
  labels: LabelDef[];
  localCommands: LocalCommandDef[];
  bibEntries: BibEntry[];
}

export function getProjectIndex(): ProjectIndex {
  const files = useProject.getState().files;
  const labels: LabelDef[] = [];
  const localCommands: LocalCommandDef[] = [];
  const bibEntries: BibEntry[] = [];
  const seen = new Set<string>();

  for (const entry of files.values()) {
    if (entry.kind !== 'text') continue;
    seen.add(entry.path);
    const lower = entry.path.toLowerCase();
    const isBib = lower.endsWith('.bib');
    const isTex =
      lower.endsWith('.tex') ||
      lower.endsWith('.sty') ||
      lower.endsWith('.cls') ||
      lower.endsWith('.bst');

    if (!isBib && !isTex) continue;

    const cached = cache.get(entry.path);
    if (isTex) {
      if (cached && cached.kind === 'tex' && cached.updatedAt === entry.updatedAt) {
        labels.push(...cached.labels);
        localCommands.push(...cached.localCommands);
      } else {
        const scan = scanDocument(entry.path, entry.content);
        cache.set(entry.path, {
          kind: 'tex',
          updatedAt: entry.updatedAt,
          labels: scan.labels,
          localCommands: scan.localCommands,
        });
        labels.push(...scan.labels);
        localCommands.push(...scan.localCommands);
      }
    } else {
      if (cached && cached.kind === 'bib' && cached.updatedAt === entry.updatedAt) {
        bibEntries.push(...cached.bibEntries);
      } else {
        const parsed = parseBib(entry.content);
        cache.set(entry.path, {
          kind: 'bib',
          updatedAt: entry.updatedAt,
          bibEntries: parsed,
        });
        bibEntries.push(...parsed);
      }
    }
  }

  for (const path of cache.keys()) {
    if (!seen.has(path)) cache.delete(path);
  }

  return { labels, localCommands, bibEntries };
}

export function resetProjectIndexCache(): void {
  cache.clear();
}
