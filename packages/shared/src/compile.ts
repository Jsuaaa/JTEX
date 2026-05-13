import { z } from 'zod';

export const Engine = z.enum(['tectonic', 'pdflatex', 'xelatex', 'lualatex']);
export type Engine = z.infer<typeof Engine>;

export const CompileErrorBody = z.object({
  status: z.literal('error'),
  log: z.string(),
  errorSummary: z.string(),
});

export const CompileTimeoutBody = z.object({
  status: z.literal('timeout'),
  log: z.string(),
  durationMs: z.number(),
});

export const CompileInvalidBody = z.object({
  status: z.literal('invalid'),
  reason: z.string(),
});

export type CompileErrorBody = z.infer<typeof CompileErrorBody>;
export type CompileTimeoutBody = z.infer<typeof CompileTimeoutBody>;
export type CompileInvalidBody = z.infer<typeof CompileInvalidBody>;

export type CompileResult =
  | { status: 'success'; pdf: Blob; log: string; durationMs: number }
  | CompileErrorBody
  | CompileTimeoutBody
  | CompileInvalidBody
  | { status: 'rate_limited' }
  | { status: 'busy' };
