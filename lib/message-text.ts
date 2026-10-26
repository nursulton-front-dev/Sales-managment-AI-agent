/** Plain text rendering for channel messages; never inserts untrusted HTML. */
export function messageText(value: string) {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity: string) => {
    if (!entity.startsWith('#')) return entities[entity.toLowerCase()] || match;
    const number = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : match;
  }).replace(/<br\s*\/?>/gi, '\n').replace(/<\/?(?:b|strong|i|em|p|div)>/gi, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '').replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 ($2)')
    .replace(/\bundefined\s*ms\b/g, '').trim();
}
