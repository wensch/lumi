import type { LanguageCode } from '@/i18n';

/** Códigos USFM (como a YouVersion usa) -> nome do livro em português e inglês. */
const BOOKS: Record<string, [pt: string, en: string]> = {
  GEN: ['Gênesis', 'Genesis'],
  EXO: ['Êxodo', 'Exodus'],
  LEV: ['Levítico', 'Leviticus'],
  NUM: ['Números', 'Numbers'],
  DEU: ['Deuteronômio', 'Deuteronomy'],
  JOS: ['Josué', 'Joshua'],
  JDG: ['Juízes', 'Judges'],
  RUT: ['Rute', 'Ruth'],
  '1SA': ['1 Samuel', '1 Samuel'],
  '2SA': ['2 Samuel', '2 Samuel'],
  '1KI': ['1 Reis', '1 Kings'],
  '2KI': ['2 Reis', '2 Kings'],
  '1CH': ['1 Crônicas', '1 Chronicles'],
  '2CH': ['2 Crônicas', '2 Chronicles'],
  EZR: ['Esdras', 'Ezra'],
  NEH: ['Neemias', 'Nehemiah'],
  EST: ['Ester', 'Esther'],
  JOB: ['Jó', 'Job'],
  PSA: ['Salmos', 'Psalms'],
  PRO: ['Provérbios', 'Proverbs'],
  ECC: ['Eclesiastes', 'Ecclesiastes'],
  SNG: ['Cantares', 'Song of Solomon'],
  ISA: ['Isaías', 'Isaiah'],
  JER: ['Jeremias', 'Jeremiah'],
  LAM: ['Lamentações', 'Lamentations'],
  EZK: ['Ezequiel', 'Ezekiel'],
  DAN: ['Daniel', 'Daniel'],
  HOS: ['Oseias', 'Hosea'],
  JOL: ['Joel', 'Joel'],
  AMO: ['Amós', 'Amos'],
  OBA: ['Obadias', 'Obadiah'],
  JON: ['Jonas', 'Jonah'],
  MIC: ['Miqueias', 'Micah'],
  NAM: ['Naum', 'Nahum'],
  HAB: ['Habacuque', 'Habakkuk'],
  ZEP: ['Sofonias', 'Zephaniah'],
  HAG: ['Ageu', 'Haggai'],
  ZEC: ['Zacarias', 'Zechariah'],
  MAL: ['Malaquias', 'Malachi'],
  MAT: ['Mateus', 'Matthew'],
  MRK: ['Marcos', 'Mark'],
  LUK: ['Lucas', 'Luke'],
  JHN: ['João', 'John'],
  ACT: ['Atos', 'Acts'],
  ROM: ['Romanos', 'Romans'],
  '1CO': ['1 Coríntios', '1 Corinthians'],
  '2CO': ['2 Coríntios', '2 Corinthians'],
  GAL: ['Gálatas', 'Galatians'],
  EPH: ['Efésios', 'Ephesians'],
  PHP: ['Filipenses', 'Philippians'],
  COL: ['Colossenses', 'Colossians'],
  '1TH': ['1 Tessalonicenses', '1 Thessalonians'],
  '2TH': ['2 Tessalonicenses', '2 Thessalonians'],
  '1TI': ['1 Timóteo', '1 Timothy'],
  '2TI': ['2 Timóteo', '2 Timothy'],
  TIT: ['Tito', 'Titus'],
  PHM: ['Filemom', 'Philemon'],
  HEB: ['Hebreus', 'Hebrews'],
  JAS: ['Tiago', 'James'],
  '1PE': ['1 Pedro', '1 Peter'],
  '2PE': ['2 Pedro', '2 Peter'],
  '1JN': ['1 João', '1 John'],
  '2JN': ['2 João', '2 John'],
  '3JN': ['3 João', '3 John'],
  JUD: ['Judas', 'Jude'],
  REV: ['Apocalipse', 'Revelation'],
};

/** "PSA.23.1-3" -> "Salmos 23:1-3". Se não reconhecer o formato, devolve o texto como veio. */
export function formatPassageReference(reference: string | null, language: LanguageCode): string {
  if (!reference) return '';
  const match = /^([1-3]?[A-Z]{2,3})\.(\d+)(?:\.(\d+(?:-\d+)?))?$/.exec(reference.trim());
  if (!match) return reference;
  const [, code, chapter, verses] = match;
  const book = BOOKS[code];
  if (!book) return reference;
  const name = language === 'en' ? book[1] : book[0];
  return verses ? `${name} ${chapter}:${verses}` : `${name} ${chapter}`;
}
