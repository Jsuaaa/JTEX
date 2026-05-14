export async function parseMultipartMixed(res: Response): Promise<{ pdf: Blob; log: string }> {
  const contentType = res.headers.get('content-type') ?? '';
  const match = /boundary=([^;]+)/i.exec(contentType);
  if (!match) throw new Error('missing boundary');
  const boundary = match[1]!.trim().replace(/^"|"$/g, '');

  const body = new Uint8Array(await res.arrayBuffer());
  const delim = new TextEncoder().encode('--' + boundary);
  const eol = 0x0d; // \r
  const eol2 = 0x0a; // \n

  const positions: number[] = [];
  for (let i = 0; i <= body.length - delim.length; i++) {
    let match = true;
    for (let j = 0; j < delim.length; j++) {
      if (body[i + j] !== delim[j]) {
        match = false;
        break;
      }
    }
    if (match) positions.push(i);
  }

  let pdf: Blob | null = null;
  let log = '';

  for (let p = 0; p < positions.length - 1; p++) {
    let start = positions[p]! + delim.length;
    if (body[start] === eol && body[start + 1] === eol2) start += 2;
    if (body[start] === 0x2d && body[start + 1] === 0x2d) continue;

    let headerEnd = start;
    while (headerEnd < body.length - 3) {
      if (
        body[headerEnd] === eol &&
        body[headerEnd + 1] === eol2 &&
        body[headerEnd + 2] === eol &&
        body[headerEnd + 3] === eol2
      ) {
        break;
      }
      headerEnd++;
    }
    const headerText = new TextDecoder().decode(body.slice(start, headerEnd));
    const bodyStart = headerEnd + 4;
    let bodyEnd = positions[p + 1]!;
    if (body[bodyEnd - 2] === eol && body[bodyEnd - 1] === eol2) bodyEnd -= 2;

    const isPdf = /content-type:\s*application\/pdf/i.test(headerText);
    if (isPdf) {
      pdf = new Blob([body.slice(bodyStart, bodyEnd)], { type: 'application/pdf' });
    } else if (/name="log"/i.test(headerText)) {
      log = new TextDecoder().decode(body.slice(bodyStart, bodyEnd));
    }
  }

  if (!pdf) throw new Error('no pdf part in multipart response');
  return { pdf, log };
}
