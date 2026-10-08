import type { JourneyMilestone } from './journey';

export type OutfitId = 'scarf' | 'glasses' | 'flowers' | 'cape' | 'glow';

export type Outfit = {
  id: OutfitId;
  /** Marco de sequência que libera o item (nunca se perde: vale pela maior sequência já alcançada). */
  milestone: JourneyMilestone;
  icon: string;
  /** Desenhado ATRÁS do corpo (capa, brilho). */
  back?: string;
  /** Desenhado POR CIMA do corpo e do rosto. */
  front?: string;
};

const star = (x: number, y: number, r = 8) =>
  `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="#FFD35A" stroke-width="2"></path>`;

/**
 * Itens do Lumi, no mesmo viewBox 200x200 do mascote (ver svgs/lumiHappySvg.ts).
 * Um item de cada vez; evolução representa constância, não espiritualidade (briefing §8.7).
 */
export const OUTFITS: Outfit[] = [
  {
    id: 'scarf',
    milestone: 7,
    icon: '🧣',
    front:
      '<path d="M60 120Q100 134 140 120L142 136Q100 150 58 136Z" fill="#E8604C"></path>' +
      '<path d="M112 138l2 26q0 6 6 6l8-2-2-28z" fill="#E8604C"></path>' +
      '<path d="M84 126v12M100 128v12M116 126v12" stroke="#FFF7E8" stroke-width="3"></path>',
  },
  {
    id: 'glasses',
    milestone: 14,
    icon: '👓',
    front:
      '<g stroke-width="3" fill="#FFFFFF" fill-opacity=".35"><circle cx="84" cy="86" r="14"></circle><circle cx="116" cy="86" r="14"></circle></g>' +
      '<path d="M98 86h4M70 84l-12-2M130 84l12-2" stroke-width="3"></path>',
  },
  {
    id: 'flowers',
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
    milestone: 50,
    icon: '🦸',
    back: '<path d="M64 112L32 178Q100 200 168 178L136 112Z" fill="#3F6FE0"></path>',
    front:
      '<path d="M66 118Q100 134 134 118" stroke="#3F6FE0" stroke-width="5"></path>' +
      '<circle cx="100" cy="128" r="5" fill="#FFD35A" stroke-width="2.5"></circle>',
  },
  {
    id: 'glow',
    milestone: 100,
    icon: '✨',
    back: '<circle cx="100" cy="100" r="94" fill="#FFE08A" fill-opacity=".4" stroke="none"></circle>',
    front: star(24, 44) + star(176, 54, 10) + star(30, 150, 7) + star(170, 144) + star(100, 10, 7),
  },
];

export function outfitForMilestone(milestone: number): Outfit | undefined {
  return OUTFITS.find((outfit) => outfit.milestone === milestone);
}

/** Aplica o item ao SVG base do mascote (insere a parte de trás e a da frente). */
export function applyOutfit(svg: string, outfitId: OutfitId | null): string {
  const outfit = OUTFITS.find((item) => item.id === outfitId);
  if (!outfit) return svg;
  let result = svg;
  if (outfit.back) result = result.replace('>', `>${outfit.back}`);
  if (outfit.front) result = result.replace('</svg>', `${outfit.front}</svg>`);
  return result;
}
