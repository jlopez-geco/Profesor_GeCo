export const DUPLICATE_THRESHOLD = 0.8

export function normalizeText(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[`*_#>\[\]()¿?¡!.,;:"'“”]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function trigrams(text: string) {
  const s = `  ${normalizeText(text)} `
  const set = new Set<string>()
  for (let i = 0; i < s.length - 2; i++) set.add(s.slice(i, i + 3))
  return set
}

export function similarity(a: string, b: string) {
  const na = normalizeText(a)
  const nb = normalizeText(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  const ta = trigrams(a)
  const tb = trigrams(b)
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  return inter / (ta.size + tb.size - inter)
}
