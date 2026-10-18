/**
 * Weekly event: one goal per calendar week (Monday to Sunday, local time),
 * rotating through a fixed list so every week feels different. Progress resets
 * with the week; the reward can be claimed once.
 */
export type EventKind = 'powerUps' | 'balloons' | 'stars' | 'crates' | 'ducks' | 'levels' | 'combos';

export interface WeeklyEventDef {
  kind: EventKind;
  icon: string;
  title: string;
  description: string;
  goal: number;
}

export const WEEKLY_EVENTS: WeeklyEventDef[] = [
  { kind: 'powerUps', icon: '🚀', title: 'Tydzień rakiet', description: 'Odpal 40 power-upów', goal: 40 },
  { kind: 'balloons', icon: '🎈', title: 'Balonowy festyn', description: 'Pęknij 60 balonów', goal: 60 },
  { kind: 'stars', icon: '⭐', title: 'Gwiezdny tydzień', description: 'Zdobądź 25 gwiazdek', goal: 25 },
  { kind: 'crates', icon: '📦', title: 'Tydzień drwala', description: 'Zniszcz 50 skrzyń', goal: 50 },
  { kind: 'ducks', icon: '🦆', title: 'Kaczy tydzień', description: 'Uratuj 15 kaczek', goal: 15 },
  { kind: 'levels', icon: '🏁', title: 'Maraton', description: 'Wygraj 10 poziomów', goal: 10 },
  { kind: 'combos', icon: '💥', title: 'Mistrz combo', description: 'Wywołaj 8 mega combo', goal: 8 },
];

export interface EventState { week: number; progress: number; claimed: boolean }

const DAY = 86_400_000;
/** Monday 5 Jan 1970 — weeks are counted from a Monday, in local time. */
const EPOCH_MONDAY = new Date(1970, 0, 5).getTime();

export function weekNumber(now = Date.now()): number {
  return Math.floor((now - EPOCH_MONDAY) / (7 * DAY));
}

export function eventForWeek(week: number): WeeklyEventDef {
  return WEEKLY_EVENTS[((week % WEEKLY_EVENTS.length) + WEEKLY_EVENTS.length) % WEEKLY_EVENTS.length];
}

/** Whole days until the event (this week) ends, at least 1. */
export function daysLeft(now = Date.now()): number {
  const end = EPOCH_MONDAY + (weekNumber(now) + 1) * 7 * DAY;
  return Math.max(1, Math.ceil((end - now) / DAY));
}

/** The stored event state, reset when a new week has started. */
export function currentEventState(saved: EventState | undefined, now = Date.now()): EventState {
  const week = weekNumber(now);
  return saved && saved.week === week ? saved : { week, progress: 0, claimed: false };
}

export const EVENT_REWARD = { hammer: 2, extraMoves: 2, colorBomb: 2, rocket: 2, bomb: 2, disco: 1, townStars: 10 };
