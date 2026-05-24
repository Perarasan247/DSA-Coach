export type Difficulty = 'easy' | 'medium' | 'hard';
export type Rating = 'stuck' | 'shaky' | 'fluent';
export type CardStatus = 'new' | 'active' | 'mastered' | 'suspended';

export interface Problem {
  id: number;
  title: string;
  topic: string;
  subtopic?: string;
  difficulty: Difficulty;
  order_index: number;
  url?: string;
}

/** A day represented as YYYY-MM-DD in the user's local timezone. */
export type DayKey = string;

export interface Card {
  problem_id: number;
  status: CardStatus;
  /** Days between reviews (set after each rating). */
  interval: number;
  /** Next due day (local YYYY-MM-DD). null when mastered/suspended. */
  due: DayKey | null;
  consecutive_fluent: number;
  total_reviews: number;
  times_solved: number;
  ready_to_master: boolean;
  first_solved_at: DayKey | null;
  mastered_at: DayKey | null;
}

export interface Review {
  id?: number;
  problem_id: number;
  date: DayKey;
  rating: Rating;
  time_taken_sec?: number;
  notes?: string;
  /** Snapshot of the card BEFORE this rating — used for undo. */
  prev_card?: Card;
}

export interface Settings {
  id: 1;
  target: number; // default 5
  ceiling: number; // default 7
}

/** Map of YYYY-MM-DD → number of cards already projected on that day. */
export type ProjectedLoad = Record<DayKey, number>;
