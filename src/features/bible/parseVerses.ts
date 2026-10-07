export type BibleVerseLine = { number: string; text: string };

const MARKER = /<span\b[^>]*\bclass="[^"]*\byv-v\b[^"]*"[^>]*>/g;
const VERSE_NUMBER = /\bv="(\d+(?:[-,]\d+)*)"/;

const ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  mdash: '—',
  ndash: '–',
  hellip: '…',
};

// Letras acentuadas do português (&otilde; etc.), caso a API envie entidades em vez de UTF-8.
const ACCENTS: Record<string, string> = {
  a: 'áàâãä',
  e: 'éèêë',
  i: 'íìîï',
  o: 'óòôõö',
  u: 'úùûü',
};
for (const [base, chars] of Object.entries(ACCENTS)) {
  const suffixes = [
    'acute',
    'grave',
    'circ',
    base === 'a' || base === 'o' ? 'tilde' : 'uml',
    'uml',
  ];
  [...chars].forEach((char, i) => {
    ENTITIES[`${base}${suffixes[i]}`] = char;
    ENTITIES[`${base.toUpperCase()}${suffixes[i]}`] = char.toUpperCase();
  });
}
ENTITIES.ccedil = 'ç';
ENTITIES.Ccedil = 'Ç';

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code.startsWith('#x') || code.startsWith('#X')) {
      return String.fromCodePoint(parseInt(code.slice(2), 16));
    }
    if (code.startsWith('#')) return String.fromCodePoint(parseInt(code.slice(1), 10));
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<span\b[^>]*\byv-vlbl\b[^>]*>.*?<\/span>/gi, '')
      .replace(/<\/(p|div|br)>|<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Quebra o HTML de um capítulo da YouVersion em versículos, usando os
 * marcadores `<span class="yv-v" v="N">` do HTML bruto. Devolve lista vazia
 * quando não há marcadores (o chamador mostra o texto corrido).
 */
export function parseVerses(html: string): BibleVerseLine[] {
  const markers = Array.from(html.matchAll(MARKER));
  const verses: BibleVerseLine[] = [];

  markers.forEach((marker, index) => {
    const number = VERSE_NUMBER.exec(marker[0])?.[1];
    if (!number) return;
    const start = (marker.index ?? 0) + marker[0].length;
    const end = markers[index + 1]?.index ?? html.length;
    const text = htmlToText(html.slice(start, end));
    if (text) verses.push({ number, text });
  });

  return verses;
}

/** Texto corrido, sem marcações — alternativa quando o capítulo não traz marcadores de versículo. */
export function plainTextFromHtml(html: string): string {
  return htmlToText(html);
}
