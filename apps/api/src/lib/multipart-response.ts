import { randomBytes } from 'node:crypto';
import type { FastifyReply } from 'fastify';

export function sendPdfWithLog(
  reply: FastifyReply,
  pdf: Buffer,
  log: string,
  durationMs: number,
): void {
  const boundary = `jtex-${randomBytes(8).toString('hex')}`;
  const eol = '\r\n';

  const head = Buffer.from(
    `--${boundary}${eol}` +
      `Content-Type: application/pdf${eol}` +
      `Content-Disposition: form-data; name="pdf"; filename="out.pdf"${eol}${eol}`,
    'utf8',
  );
  const between = Buffer.from(
    `${eol}--${boundary}${eol}` +
      `Content-Type: text/plain; charset=utf-8${eol}` +
      `Content-Disposition: form-data; name="log"${eol}${eol}`,
    'utf8',
  );
  const tail = Buffer.from(`${eol}--${boundary}--${eol}`, 'utf8');
  const logBuf = Buffer.from(log, 'utf8');

  const body = Buffer.concat([head, pdf, between, logBuf, tail]);

  reply
    .status(200)
    .type(`multipart/mixed; boundary=${boundary}`)
    .header('X-Compile-Duration-Ms', String(durationMs))
    .send(body);
}
