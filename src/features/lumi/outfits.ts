import type { JourneyMilestone } from './journey';

/** Eventos do calendário cristão que liberam itens (conquista do plano do evento). */
export type OutfitEvent = 'advento' | 'natal' | 'pascoa';

export type OutfitId =
  | 'scarf'
  | 'bow'
  | 'glasses'
  | 'sunglasses'
  | 'beanie'
  | 'flowers'
  | 'crown'
  | 'star'
  | 'cape'
  | 'wings'
  | 'glow'
  | 'rainbow'
  | 'wreath'
  | 'xmashat'
  | 'xmasstar'
  | 'lily'
  | 'dawn'
  | 'sprout'
  | 'bell'
  | 'backpack';

/** Um item de cada categoria pode ser usado ao mesmo tempo. */
export type OutfitSlot = 'neck' | 'face' | 'head' | 'back' | 'aura';

/** Ordem de exibição das categorias no guarda-roupa. */
export const OUTFIT_SLOTS: OutfitSlot[] = ['head', 'face', 'neck', 'back', 'aura'];

/** Movimento leve do Lumi quando veste o item (itens especiais, a partir de 50 dias). */
export type OutfitMotion = 'sway' | 'float' | 'pulse';

export type Outfit = {
  id: OutfitId;
  slot: OutfitSlot;
  motion?: OutfitMotion;
  /** Marco de sequência que libera o item (nunca se perde: vale pela maior sequência já alcançada). */
  milestone?: JourneyMilestone;
  /** Itens de evento: liberados pela conquista de terminar o plano do evento (nunca se perdem). */
  achievement?: string;
  event?: OutfitEvent;
  icon: string;
  /** Desenhado ATRÁS do corpo (capa, brilho). */
  back?: string;
  /** Desenhado POR CIMA do corpo e do rosto. */
  front?: string;
};

/** Estrela de 5 pontas centrada em (cx, cy), com raio externo `outer` e interno `inner`. */
function fivePointStar(cx: number, cy: number, outer: number, inner: number): string {
  const points = Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    return `${(cx + radius * Math.cos(angle)).toFixed(1)} ${(cy + radius * Math.sin(angle)).toFixed(1)}`;
  });
  return `M${points.join('L')}Z`;
}

const star = (x: number, y: number, r = 8) =>
  `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="#FFD35A" stroke-width="2"></path>`;

/**
 * Itens do Lumi, no mesmo viewBox 200x200 do mascote (ver svgs/lumiHappySvg.ts).
 * Um item de cada vez; evolução representa constância, não espiritualidade (briefing §8.7).
 */
export const OUTFITS: Outfit[] = [
  {
    id: 'sprout',
    slot: 'head',
    achievement: 'first_moment',
    icon: '🌱',
    front:
      '<path d="M100 52Q100 42 100 32" stroke-width="3.5"></path>' +
      '<path d="M100 38Q86 36 80 22Q96 22 100 38Z" fill="#6BD68A" stroke-width="3"></path>' +
      '<path d="M100 33Q114 31 120 17Q104 16 100 33Z" fill="#4CC46A" stroke-width="3"></path>',
  },
  {
    id: 'bell',
    slot: 'neck',
    milestone: 3,
    icon: '🔔',
    front:
      '<path d="M62 122Q100 138 138 122L139 131Q100 147 61 131Z" fill="#E8604C"></path>' +
      '<circle cx="100" cy="146" r="10" fill="#FFD35A" stroke-width="3"></circle>' +
      '<path d="M91 147h18" stroke-width="2.5"></path>' +
      '<circle cx="100" cy="153" r="2.5" fill="#3A2A22" stroke="none"></circle>',
  },
  {
    id: 'backpack',
    slot: 'back',
    milestone: 5,
    icon: '🎒',
    back:
      '<rect x="126" y="104" width="46" height="58" rx="16" fill="#7BAE4F"></rect>' +
      '<rect x="136" y="134" width="26" height="20" rx="7" fill="#5E8D38"></rect>' +
      '<path d="M142 104v-6q0-6 8-6t8 6v6" stroke-width="3"></path>',
    front:
      '<path d="M122 112Q96 124 70 118" stroke="#5E8D38" stroke-width="5"></path>' +
      '<path d="M126 124Q104 134 84 130" stroke="#5E8D38" stroke-width="5"></path>',
  },
  {
    id: 'scarf',
    slot: 'neck',
    milestone: 7,
    icon: '🧣',
    front:
      '<path d="M60 120Q100 134 140 120L142 136Q100 150 58 136Z" fill="#E8604C"></path>' +
      '<path d="M112 138l2 26q0 6 6 6l8-2-2-28z" fill="#E8604C"></path>' +
      '<path d="M84 126v12M100 128v12M116 126v12" stroke="#FFF7E8" stroke-width="3"></path>',
  },
  {
    id: 'glasses',
    slot: 'face',
    milestone: 14,
    icon: '👓',
    front:
      '<g stroke-width="3" fill="#FFFFFF" fill-opacity=".35"><circle cx="84" cy="86" r="14"></circle><circle cx="116" cy="86" r="14"></circle></g>' +
      '<path d="M98 86h4M70 84l-12-2M130 84l12-2" stroke-width="3"></path>',
  },
  {
    id: 'flowers',
    slot: 'head',
    milestone: 30,
    icon: '🌸',
    front:
      '<g fill="#4CC46A" stroke-width="2"><ellipse cx="70" cy="50" rx="6" ry="3" transform="rotate(-30 70 50)"></ellipse><ellipse cx="89" cy="40" rx="6" ry="3" transform="rotate(-10 89 40)"></ellipse><ellipse cx="111" cy="40" rx="6" ry="3" transform="rotate(10 111 40)"></ellipse><ellipse cx="130" cy="50" rx="6" ry="3" transform="rotate(30 130 50)"></ellipse></g>' +
      [
        [62, 58, '#FF8FB3'],
        [78, 44, '#FFFFFF'],
        [100, 38, '#FFD35A'],
        [122, 44, '#FFFFFF'],
        [138, 58, '#FF8FB3'],
      ]
        .map(
          ([x, y, color]) =>
            `<circle cx="${x}" cy="${y}" r="7" fill="${color}" stroke-width="2.5"></circle><circle cx="${x}" cy="${y}" r="2.5" fill="#F08A3C" stroke="none"></circle>`,
        )
        .join(''),
  },
  {
    id: 'cape',
    slot: 'back',
    motion: 'sway',
    milestone: 50,
    icon: '🦸',
    back: '<path d="M64 112L32 178Q100 200 168 178L136 112Z" fill="#3F6FE0"></path>',
    front:
      '<path d="M66 118Q100 134 134 118" stroke="#3F6FE0" stroke-width="5"></path>' +
      '<circle cx="100" cy="128" r="5" fill="#FFD35A" stroke-width="2.5"></circle>',
  },
  {
    id: 'glow',
    slot: 'aura',
    motion: 'pulse',
    milestone: 100,
    icon: '✨',
    back: '<circle cx="100" cy="100" r="94" fill="#FFE08A" fill-opacity=".4" stroke="none"></circle>',
    front: star(24, 44) + star(176, 54, 10) + star(30, 150, 7) + star(170, 144) + star(100, 10, 7),
  },
  {
    id: 'bow',
    slot: 'neck',
    milestone: 14,
    icon: '🎀',
    front:
      '<path d="M100 130L76 118Q70 130 76 142Z" fill="#7C5CFF"></path>' +
      '<path d="M100 130L124 118Q130 130 124 142Z" fill="#7C5CFF"></path>' +
      '<circle cx="100" cy="130" r="6" fill="#5B3FD6" stroke-width="3"></circle>',
  },
  {
    id: 'beanie',
    slot: 'head',
    milestone: 21,
    icon: '🧶',
    front:
      '<path d="M70 56Q68 22 100 20Q132 22 130 56Z" fill="#F08A3C"></path>' +
      '<rect x="66" y="48" width="68" height="12" rx="6" fill="#FFF7E8"></rect>' +
      '<path d="M82 28v18M100 24v22M118 28v18" stroke-width="2.5" stroke-opacity=".5"></path>' +
      '<circle cx="100" cy="16" r="7" fill="#FFF7E8"></circle>',
  },
  {
    id: 'sunglasses',
    slot: 'face',
    milestone: 30,
    icon: '😎',
    front:
      '<rect x="68" y="76" width="30" height="22" rx="9" fill="#2B2B33"></rect>' +
      '<rect x="102" y="76" width="30" height="22" rx="9" fill="#2B2B33"></rect>' +
      '<path d="M98 86h4M68 84l-12-2M132 84l12-2" stroke-width="3"></path>' +
      '<path d="M74 82l8-2M108 82l8-2" stroke="#FFFFFF" stroke-width="2.5" stroke-opacity=".6"></path>',
  },
  {
    id: 'wings',
    slot: 'back',
    milestone: 50,
    motion: 'float',
    icon: '🪽',
    back:
      '<path d="M62 116Q16 96 14 144Q34 134 38 156Q52 144 66 152Z" fill="#D6E8FF"></path>' +
      '<path d="M138 116Q184 96 186 144Q166 134 162 156Q148 144 134 152Z" fill="#D6E8FF"></path>',
  },
  {
    id: 'crown',
    slot: 'head',
    milestone: 100,
    icon: '👑',
    front:
      '<path d="M74 54L78 28L92 42L100 22L108 42L122 28L126 54Z" fill="#FFD35A"></path>' +
      '<rect x="74" y="48" width="52" height="9" rx="4" fill="#F0B73C"></rect>' +
      '<circle cx="100" cy="30" r="3.5" fill="#E8604C" stroke-width="2"></circle>' +
      '<circle cx="82" cy="40" r="2.5" fill="#3F6FE0" stroke-width="1.5"></circle>' +
      '<circle cx="118" cy="40" r="2.5" fill="#4CC46A" stroke-width="1.5"></circle>',
  },
  {
    id: 'rainbow',
    slot: 'aura',
    milestone: 200,
    motion: 'pulse',
    icon: '🌈',
    back: '<g fill="none" stroke-width="7" stroke-opacity=".85"><path d="M10 150A90 90 0 0 1 190 150" stroke="#FF6B6B"></path><path d="M20 150A80 80 0 0 1 180 150" stroke="#FFB84D"></path><path d="M30 150A70 70 0 0 1 170 150" stroke="#FFE066"></path><path d="M40 150A60 60 0 0 1 160 150" stroke="#6BD68A"></path><path d="M50 150A50 50 0 0 1 150 150" stroke="#5B9BFF"></path></g>',
  },
  {
    id: 'star',
    slot: 'head',
    milestone: 365,
    motion: 'float',
    icon: '⭐',
    front: `<path d="${fivePointStar(100, 15, 15, 6.5)}" fill="#FFD35A" stroke-width="3"></path>`,
  },
  {
    id: 'wreath',
    slot: 'head',
    achievement: 'event_advento',
    event: 'advento',
    icon: '🕯️',
    front:
      '<path d="M60 54Q100 22 140 54" stroke="#3E9B57" stroke-width="11"></path>' +
      '<g fill="#2F7D45" stroke-width="2"><ellipse cx="66" cy="50" rx="7" ry="3.5" transform="rotate(-50 66 50)"></ellipse><ellipse cx="82" cy="40" rx="7" ry="3.5" transform="rotate(-30 82 40)"></ellipse><ellipse cx="118" cy="40" rx="7" ry="3.5" transform="rotate(30 118 40)"></ellipse><ellipse cx="134" cy="50" rx="7" ry="3.5" transform="rotate(50 134 50)"></ellipse></g>' +
      '<g fill="#E8604C" stroke-width="2"><circle cx="100" cy="35" r="3.5"></circle><circle cx="95" cy="38" r="3"></circle><circle cx="105" cy="38" r="3"></circle></g>' +
      [
        [71.2, 46.3, '#7C5CFF'],
        [90.4, 38.9, '#7C5CFF'],
        [109.6, 38.9, '#FF8FB3'],
        [128.8, 46.3, '#7C5CFF'],
      ]
        .map(
          ([x, y, color]) =>
            `<rect x="${Number(x) - 3.5}" y="${Number(y) - 20}" width="7" height="17" rx="2" fill="${color}" stroke-width="2.2"></rect>` +
            `<path d="M${x} ${Number(y) - 31}Q${Number(x) + 5} ${Number(y) - 25} ${x} ${Number(y) - 21}Q${Number(x) - 5} ${Number(y) - 25} ${x} ${Number(y) - 31}Z" fill="#FFD35A" stroke-width="1.8"></path>`,
        )
        .join(''),
  },
  {
    id: 'xmashat',
    slot: 'head',
    achievement: 'event_natal',
    event: 'natal',
    icon: '🎅',
    front:
      '<path d="M68 56Q70 18 106 18Q134 20 152 46L140 58Z" fill="#D9382F"></path>' +
      '<rect x="62" y="50" width="86" height="15" rx="7.5" fill="#FFFDF6"></rect>' +
      '<circle cx="154" cy="48" r="8" fill="#FFFDF6"></circle>' +
      '<path d="M84 30Q96 26 108 28" stroke="#FFFFFF" stroke-width="3" stroke-opacity=".45"></path>',
  },
  {
    id: 'xmasstar',
    slot: 'aura',
    motion: 'float',
    achievement: 'event_natal',
    event: 'natal',
    icon: '🌟',
    back:
      '<path d="M150 30L118 78L132 84Z" fill="#FFE08A" fill-opacity=".55" stroke="none"></path>' +
      '<path d="M150 30L96 52L100 66Z" fill="#FFE08A" fill-opacity=".4" stroke="none"></path>',
    front:
      '<path d="M150 8Q152 28 172 30Q152 32 150 52Q148 32 128 30Q148 28 150 8Z" fill="#FFD35A" stroke-width="2.5"></path>' +
      star(26, 30, 7) +
      star(30, 128, 6) +
      star(176, 120, 7),
  },
  {
    id: 'lily',
    slot: 'neck',
    achievement: 'event_pascoa',
    event: 'pascoa',
    icon: '🌷',
    front:
      '<g fill="#4CC46A" stroke-width="2.2"><ellipse cx="104" cy="152" rx="4" ry="11" transform="rotate(35 104 152)"></ellipse><ellipse cx="126" cy="152" rx="4" ry="11" transform="rotate(-35 126 152)"></ellipse></g>' +
      '<g transform="translate(115 134)" stroke-width="2.2" fill="#FFFFFF">' +
      [0, 72, 144, 216, 288]
        .map(
          (angle) =>
            `<ellipse cx="0" cy="-9" rx="5.5" ry="10" transform="rotate(${angle})"></ellipse>`,
        )
        .join('') +
      '<circle cx="0" cy="0" r="3.5" fill="#FFD35A"></circle></g>',
  },
  {
    id: 'dawn',
    slot: 'aura',
    motion: 'pulse',
    achievement: 'event_pascoa',
    event: 'pascoa',
    icon: '🌅',
    back:
      '<circle cx="100" cy="150" r="74" fill="#FFD35A" fill-opacity=".45" stroke="none"></circle>' +
      '<g stroke="#FFB84D" stroke-width="5" stroke-opacity=".7">' +
      [200, 220, 240, 260, 280, 300, 320, 340]
        .map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return `<path d="M${(100 + 82 * Math.cos(rad)).toFixed(1)} ${(150 + 82 * Math.sin(rad)).toFixed(1)}L${(100 + 98 * Math.cos(rad)).toFixed(1)} ${(150 + 98 * Math.sin(rad)).toFixed(1)}"></path>`;
        })
        .join('') +
      '</g>',
  },
];

export function outfitById(id: string): Outfit | undefined {
  return OUTFITS.find((outfit) => outfit.id === id);
}

/** Itens liberados exatamente neste marco (a tela de conclusão comemora cada um). */
export function outfitsForMilestone(milestone: number): Outfit[] {
  return OUTFITS.filter((outfit) => outfit.milestone === milestone);
}

/** Itens de evento liberados por estas conquistas (a tela de conclusão comemora cada um). */
export function outfitsForAchievements(codes: readonly string[]): Outfit[] {
  return OUTFITS.filter((outfit) => outfit.achievement && codes.includes(outfit.achievement));
}

/**
 * O item está liberado? Itens comuns vêm dos marcos de sequência; itens de evento, da conquista do plano
 * do evento. Nenhum se perde quando a sequência quebra.
 */
export function isOutfitUnlocked(
  outfit: Outfit,
  reachedMilestones: readonly number[],
  achievementCodes: ReadonlySet<string>,
): boolean {
  if (outfit.milestone !== undefined && reachedMilestones.includes(outfit.milestone)) return true;
  return outfit.achievement !== undefined && achievementCodes.has(outfit.achievement);
}

/** Ordem em que as categorias são desenhadas: de trás para a frente. */
const BACK_ORDER: OutfitSlot[] = ['aura', 'back'];
const FRONT_ORDER: OutfitSlot[] = ['aura', 'back', 'neck', 'face', 'head'];

/**
 * Aplica os itens ao SVG base do mascote: o que fica atrás entra logo depois da abertura do
 * <svg>, o que fica por cima, antes do fechamento.
 */
export function applyOutfits(svg: string, outfitIds: readonly OutfitId[]): string {
  const worn = outfitIds.map(outfitById).filter((outfit): outfit is Outfit => !!outfit);
  if (worn.length === 0) return svg;
  const bySlot = (slot: OutfitSlot) => worn.filter((outfit) => outfit.slot === slot);
  const back = BACK_ORDER.flatMap(bySlot)
    .map((outfit) => outfit.back ?? '')
    .join('');
  const front = FRONT_ORDER.flatMap(bySlot)
    .map((outfit) => outfit.front ?? '')
    .join('');
  let result = svg;
  if (back) result = result.replace('>', `>${back}`);
  if (front) result = result.replace('</svg>', `${front}</svg>`);
  return result;
}

/** Movimento a aplicar ao mascote, dado o que ele veste (o primeiro item animado vence). */
export function motionFor(outfitIds: readonly OutfitId[]): OutfitMotion | null {
  for (const id of outfitIds) {
    const motion = outfitById(id)?.motion;
    if (motion) return motion;
  }
  return null;
}

/** Liga ou desliga um item; vestir um item tira o que estava na mesma categoria. */
export function toggleOutfit(current: readonly OutfitId[], id: OutfitId): OutfitId[] {
  if (current.includes(id)) return current.filter((item) => item !== id);
  const slot = outfitById(id)?.slot;
  if (!slot) return [...current];
  return [...current.filter((item) => outfitById(item)?.slot !== slot), id];
}
