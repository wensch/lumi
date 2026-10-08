import { lumiHappySvg } from './lumiHappySvg';

/**
 * Expressões do Lumi (briefing §8.6). O corpo, a lã e os fones são os mesmos da ilustração feliz
 * (tudo até as bochechas); cada expressão troca só o rosto. Mesmo viewBox 200x200, então os itens
 * do guarda-roupa (outfits.ts) valem em qualquer expressão.
 */
export type LumiFace =
  | 'happy'
  | 'celebrating'
  | 'proud'
  | 'waiting'
  | 'thoughtful'
  | 'determined'
  | 'sassy'
  | 'surprised'
  | 'suspicious'
  | 'sleepy'
  | 'sad';

const CHEEKS = (opacity = 0.65) =>
  `<circle cx="74" cy="100" r="6.5" fill="#FF8FA3" fill-opacity="${opacity}" stroke="none"></circle><circle cx="126" cy="100" r="6.5" fill="#FF8FA3" fill-opacity="${opacity}" stroke="none"></circle>`;
const NOSE =
  '<ellipse cx="100" cy="95" rx="4.5" ry="3.2" fill="#F08A8A" stroke-width="2.5"></ellipse>';
const dot = (x: number, y: number, r = 4.5) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#3A2A22" stroke="none"></circle><circle cx="${x + r * 0.35}" cy="${y - r * 0.4}" r="${r * 0.35}" fill="#FFFFFF" stroke="none"></circle>`;
const star = (x: number, y: number, r = 7) =>
  `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="#FFD35A" stroke-width="2"></path>`;

const FACES: Record<LumiFace, string> = {
  happy:
    CHEEKS() +
    '<path d="M76 86q8-10 16 0M108 86q8-10 16 0"></path><path d="M90 102q10 10 20 0"></path>' +
    NOSE,
  // Sorriso aberto e estrelinhas: o momento de comemorar.
  celebrating:
    CHEEKS(0.8) +
    '<path d="M76 86q8-10 16 0M108 86q8-10 16 0"></path>' +
    '<path d="M86 101q14 20 28 0z" fill="#F08A8A"></path><path d="M93 108q7 5 14 0" stroke-width="2.5"></path>' +
    NOSE +
    star(30, 36) +
    star(172, 40, 9) +
    star(158, 18, 5),
  // Orgulhoso: olhos fechados, queixo para cima, sorriso largo e uma estrela.
  proud:
    CHEEKS(0.85) +
    '<path d="M76 84q8-9 16 0M108 84q8-9 16 0"></path><path d="M88 102q12 12 24 0"></path>' +
    NOSE +
    star(166, 38),
  // Esperando: olhos abertos olhando para cima, sorriso pequeno.
  waiting:
    CHEEKS() + dot(84, 84, 5) + dot(116, 84, 5) + '<path d="M92 104q8 6 16 0"></path>' + NOSE,
  // Pensativo: olhos de lado, boca reta e balõezinhos de pensamento.
  thoughtful:
    CHEEKS(0.5) +
    dot(88, 85) +
    dot(120, 85) +
    '<path d="M72 74q10-5 18-1M110 73q10-4 18 1"></path><path d="M94 105q6-2 12 1"></path>' +
    NOSE +
    '<circle cx="150" cy="30" r="3" fill="#FFFFFF" stroke-width="2"></circle><circle cx="158" cy="20" r="4.5" fill="#FFFFFF" stroke-width="2"></circle>',
  // Determinado: sobrancelhas firmes e sorriso de quem vai conseguir.
  determined:
    CHEEKS() +
    dot(84, 87) +
    dot(116, 87) +
    '<path d="M70 76l18 5M130 76l-18 5" stroke-width="4"></path><path d="M90 103q10 9 20 0"></path>' +
    NOSE,
  // Debochado: uma sobrancelha levantada e sorriso de canto.
  sassy:
    CHEEKS() +
    '<path d="M76 88q8-9 16 0"></path><path d="M110 86h14"></path>' +
    '<path d="M108 72q10-8 20-2" stroke-width="3.5"></path><path d="M74 78h16" stroke-width="3.5"></path>' +
    '<path d="M90 104q12 7 24-5"></path>' +
    NOSE,
  // Surpreso: olhos grandes, sobrancelhas no alto e boca em "o".
  surprised:
    CHEEKS(0.5) +
    '<circle cx="84" cy="86" r="8" fill="#FFFFFF"></circle><circle cx="116" cy="86" r="8" fill="#FFFFFF"></circle>' +
    '<circle cx="84" cy="87" r="3.5" fill="#3A2A22" stroke="none"></circle><circle cx="116" cy="87" r="3.5" fill="#3A2A22" stroke="none"></circle>' +
    '<path d="M66 70q9-7 18-2M116 68q9-5 18 2"></path>' +
    '<ellipse cx="100" cy="109" rx="5.5" ry="7" fill="#F08A8A"></ellipse>' +
    NOSE,
  // Desconfiado: olhos meio fechados de lado e boca torta.
  suspicious:
    CHEEKS(0.5) +
    '<path d="M74 87h16M110 87h16" stroke-width="4"></path><circle cx="86" cy="87" r="2.5" fill="#3A2A22" stroke="none"></circle><circle cx="120" cy="87" r="2.5" fill="#3A2A22" stroke="none"></circle>' +
    '<path d="M72 78l18 3M128 78l-18 3"></path><path d="M92 105q4-4 8 0t8 0"></path>' +
    NOSE,
  // Sonolento: olhos fechados caídos e os "z" subindo.
  sleepy:
    CHEEKS(0.5) +
    '<path d="M76 88q8 7 16 0M108 88q8 7 16 0"></path><ellipse cx="100" cy="106" rx="4" ry="3.2" fill="#F08A8A" stroke-width="2.5"></ellipse>' +
    NOSE +
    '<path d="M148 44h10l-10 12h10M164 24h8l-8 9h8" stroke-width="3"></path>',
  sad:
    CHEEKS() +
    '<path d="M76 84q8 9 16 0M108 84q8 9 16 0"></path><path d="M72 76l16 4M128 76l-16 4"></path><path d="M91 108q9-8 18 0"></path>' +
    NOSE,
};

const BODY = lumiHappySvg.slice(0, lumiHappySvg.indexOf('<circle cx="74" cy="100"'));

const cache = new Map<LumiFace, string>();

/** SVG completo do Lumi com a expressão pedida (montado uma vez e guardado). */
export function lumiSvgWithFace(face: LumiFace): string {
  let svg = cache.get(face);
  if (!svg) {
    svg = `${BODY}${FACES[face]}\n</svg>`;
    cache.set(face, svg);
  }
  return svg;
}
