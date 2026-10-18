/**
 * Meta progression (as in Royal Match's castle): stars earned on levels are
 * spent on building a little town, one district at a time. Finishing a
 * district pays out a big booster pack.
 */
export interface TownItem { id: string; icon: string; name: string; cost: number }
export interface TownArea { id: string; icon: string; name: string; items: TownItem[] }

const area = (i: number, id: string, icon: string, name: string, items: [string, string][]): TownArea => ({
  id, icon, name,
  items: items.map(([ic, nm], k) => ({ id: `${id}-${k}`, icon: ic, name: nm, cost: [3, 4, 5, 6, 8][k] + i * 2 })),
});

export const TOWN: TownArea[] = [
  area(0, 'dom', '🏡', 'Domek', [['🚪', 'Drzwi'], ['🪟', 'Okna'], ['🌷', 'Ogródek'], ['🛋️', 'Kanapa'], ['🏠', 'Dach']]),
  area(1, 'park', '🌳', 'Park', [['🌲', 'Drzewa'], ['🦋', 'Motyle'], ['🛝', 'Zjeżdżalnia'], ['⛲', 'Fontanna'], ['🎠', 'Karuzela']]),
  area(2, 'plaza', '🏖️', 'Plaża', [['🐚', 'Muszelki'], ['⛱️', 'Parasol'], ['🏰', 'Zamek z piasku'], ['🚤', 'Motorówka'], ['⛵', 'Żaglówka']]),
  area(3, 'wesole', '🎪', 'Wesołe miasteczko', [['🍭', 'Lizaki'], ['🎪', 'Namiot'], ['🎡', 'Diabelski młyn'], ['🎢', 'Kolejka'], ['🎆', 'Fajerwerki']]),
  area(4, 'miasto', '🏙️', 'Miasto', [['🏪', 'Sklep'], ['🚌', 'Autobus'], ['🏫', 'Szkoła'], ['🏥', 'Szpital'], ['🗼', 'Wieża']]),
  area(5, 'kosmos', '🚀', 'Kosmodrom', [['🔭', 'Teleskop'], ['🛰️', 'Satelita'], ['👽', 'Goście'], ['🪐', 'Planeta'], ['🚀', 'Rakieta']]),
];

export const ALL_TOWN_ITEMS = TOWN.flatMap(a => a.items);

/** First district that is not finished yet (null when the whole town stands). */
export function currentArea(built: string[]): TownArea | null {
  return TOWN.find(a => a.items.some(it => !built.includes(it.id))) ?? null;
}

export function isAreaDone(a: TownArea, built: string[]): boolean {
  return a.items.every(it => built.includes(it.id));
}

/** Pack paid out for finishing a district (bigger for later districts). */
export function areaReward(index: number) {
  const n = 2 + Math.floor(index / 2);
  return { hammer: n, extraMoves: n, colorBomb: n, rocket: n, bomb: n, disco: Math.max(1, n - 1) };
}
