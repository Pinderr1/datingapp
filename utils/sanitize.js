export function sanitizeText(text) {
  if (!text) return '';
  let s = String(text);

  s = s.replace(/<[^>]*>?/g, '');
  s = s.replace(/[\$%{}<>]/g, '');
  const bad = ['fucking bitch', 'shit eater', 'bitch ass whore', 'asshole licker', 'dickhead'];
  if (bad.length) {
    const regex = new RegExp(`\\b(${bad.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
    s = s.replace(regex, '');
  }
  s = s.replace(/(.)\1{3,}/g, '$1$1$1');
  return s.trim();
}
