export type Attachment = { name: string; url: string; size: number; mimeType: string };
const MAX_BYTES = 2 * 1024 * 1024;

export function validateAttachments(input: unknown): Attachment[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > 3) throw new Error('Можно прикрепить до трёх файлов');
  return input.map((file) => {
    if (!file || typeof file.name !== 'string' || file.name.length > 200 || typeof file.url !== 'string' || file.url.length > MAX_BYTES * 1.4) throw new Error('Некорректное вложение');
    const match = /^data:(image\/png|image\/jpeg|application\/pdf);base64,([A-Za-z0-9+/]+={0,2})$/.exec(file.url);
    if (!match) throw new Error('Разрешены только PNG, JPEG и PDF');
    const bytes = Buffer.from(match[2], 'base64');
    const valid = match[1] === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : match[1] === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : bytes.subarray(0, 5).toString() === '%PDF-';
    if (!valid || !bytes.length || bytes.length > MAX_BYTES) throw new Error('Проверьте формат и размер файла (до 2 МБ)');
    return { name: file.name.replace(/[\x00-\x1f/\\]/g, '_'), url: file.url, size: bytes.length, mimeType: match[1] };
  });
}
export function attachmentLinks<T extends { id: string; ticketId: string; attachments: Attachment[] | null }>(message: T) {
  return { ...message, attachments: (message.attachments || []).map((file, index) => ({ ...file, url: `/api/support/tickets/${encodeURIComponent(message.ticketId)}/attachments/${encodeURIComponent(message.id)}/${index}` })) };
}
