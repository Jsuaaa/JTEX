import { describe, expect, it } from 'vitest';
import { parseBib } from '../bib-parser';

describe('parseBib', () => {
  it('returns empty array for empty content', () => {
    expect(parseBib('')).toEqual([]);
  });

  it('parses a single article entry', () => {
    const bib = `@article{einstein1905,
  author = {Albert Einstein},
  title = {Zur Elektrodynamik bewegter Körper},
  year = {1905}
}`;
    const result = parseBib(bib);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      key: 'einstein1905',
      type: 'article',
      author: 'Albert Einstein',
      year: '1905',
    });
    expect(result[0]?.title).toContain('Zur Elektrodynamik');
  });

  it('parses multiple entries', () => {
    const bib = `@book{knuth1984,
  author = {Donald Knuth},
  title = {The TeXbook},
  year = {1984}
}

@inproceedings{turing1950,
  author = {Alan Turing},
  title = {Computing Machinery and Intelligence},
  year = {1950}
}`;
    const result = parseBib(bib);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.key).sort()).toEqual(['knuth1984', 'turing1950']);
  });

  it('handles quoted field values', () => {
    const bib = `@misc{foo,
  author = "Doe, Jane",
  year = "2024"
}`;
    const result = parseBib(bib);
    expect(result[0]?.author).toBe('Doe, Jane');
    expect(result[0]?.year).toBe('2024');
  });

  it('skips @string and @preamble entries', () => {
    const bib = `@string{publisher = "ACM"}
@preamble{"\\newcommand{\\foo}{bar}"}
@article{real,
  author = {X},
  year = {2020}
}`;
    const result = parseBib(bib);
    expect(result).toHaveLength(1);
    expect(result[0]?.key).toBe('real');
  });

  it('skips comment lines starting with %', () => {
    const bib = `% this is a comment
@article{x, year = {2020}}`;
    const result = parseBib(bib);
    expect(result).toHaveLength(1);
    expect(result[0]?.key).toBe('x');
  });

  it('tolerates malformed entries', () => {
    const bib = `@article{good,
  year = {2020}
}

@incomplete{bad
  not really an entry

@misc{good2, year = {2021}}`;
    const result = parseBib(bib);
    expect(result.map((e) => e.key)).toContain('good');
    expect(result.map((e) => e.key)).toContain('good2');
  });

  it('extracts entries even without author/year', () => {
    const bib = `@misc{key1, title = {Only Title}}`;
    const result = parseBib(bib);
    expect(result).toHaveLength(1);
    expect(result[0]?.key).toBe('key1');
    expect(result[0]?.title).toBe('Only Title');
  });
});
