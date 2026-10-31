export class RequestBodyError extends Error {
  constructor(public readonly status: number) { super(status === 413 ? 'Слишком большой запрос' : 'Некорректное содержимое запроса'); }
}
export async function readLimitedText(request: Request, maximum: number) {
  if (Number(request.headers.get('content-length')) > maximum) throw new RequestBodyError(413);
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximum) { await reader.cancel(); throw new RequestBodyError(413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)); }
  catch { throw new RequestBodyError(400); }
}
