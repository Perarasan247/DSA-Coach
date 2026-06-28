import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../db/supabase';
import { newCard } from '../engine/scheduler';
import type { Card, Problem, Review } from '../engine/types';
import seedProblems from '../data/problems.json';

export interface SheetMeta {
  id: string;
  name: string;
  description?: string;
  source_url?: string;
}

export interface AppSettings {
  target: number;
  ceiling: number;
  active_sheet_id: string;
}

const DEFAULT_SETTINGS: AppSettings = { target: 5, ceiling: 7, active_sheet_id: 'arasu' };

interface AppCtxType {
  user: User | null;
  allProblems: Problem[];
  allCards: Card[];
  reviews: Review[];
  settings: AppSettings;
  sheets: SheetMeta[];
  ready: boolean;
  refresh: () => Promise<void>;
}

const AppCtx = createContext<AppCtxType | null>(null);

export function useAppCtx(): AppCtxType {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useAppCtx used outside AppProvider');
  return ctx;
}

// Map raw Supabase card row → Card interface (strips DB-only fields)
function toCard(row: Record<string, unknown>): Card {
  return {
    problem_id: row.problem_id as number,
    status: row.status as Card['status'],
    interval: row.interval as number,
    due: row.due as string | null,
    consecutive_fluent: row.consecutive_fluent as number,
    total_reviews: row.total_reviews as number,
    times_solved: row.times_solved as number,
    ready_to_master: row.ready_to_master as boolean,
    first_solved_at: row.first_solved_at as string | null,
    mastered_at: row.mastered_at as string | null,
  };
}

// Map raw Supabase review row → Review interface
function toReview(row: Record<string, unknown>): Review {
  return {
    id: row.id as number,
    problem_id: row.problem_id as number,
    date: row.date as string,
    rating: row.rating as Review['rating'],
    time_taken_sec: row.time_taken_sec as number | undefined,
    notes: row.notes as string | undefined,
    prev_card: row.prev_card as Card | undefined,
  };
}

async function seedArasuProblems(userId: string): Promise<void> {
  // Only seed if no arasu problems exist yet in the DB
  const { count } = await supabase
    .from('problems')
    .select('*', { count: 'exact', head: true })
    .eq('sheet_id', 'arasu');

  if ((count ?? 0) > 0) return;

  const rows = (seedProblems as Problem[]).map((p) => ({
    id: p.id,
    sheet_id: 'arasu',
    title: p.title,
    topic: p.topic,
    difficulty: p.difficulty,
    url: p.url ?? null,
    order_index: p.order_index,
  }));

  // Insert in batches of 100 to avoid request size limits
  for (let i = 0; i < rows.length; i += 100) {
    await supabase.from('problems').upsert(rows.slice(i, i + 100), { onConflict: 'id' });
  }

  void userId; // referenced to prevent unused param lint warning
}

async function ensureCardsForSheet(userId: string, sheetId: string): Promise<void> {
  const { data: probs } = await supabase
    .from('problems')
    .select('id')
    .eq('sheet_id', sheetId);

  if (!probs || probs.length === 0) return;

  const problemIds = probs.map((p) => p.id as number);

  const { data: existing } = await supabase
    .from('cards')
    .select('problem_id')
    .eq('user_id', userId)
    .in('problem_id', problemIds);

  const existingIds = new Set((existing ?? []).map((c) => c.problem_id as number));
  const missing = problemIds.filter((id) => !existingIds.has(id));

  if (missing.length === 0) return;

  const newCards = missing.map((pid) => ({ ...newCard(pid), user_id: userId }));
  for (let i = 0; i < newCards.length; i += 100) {
    await supabase.from('cards').insert(newCards.slice(i, i + 100));
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [sheets, setSheets] = useState<SheetMeta[]>([]);
  const [ready, setReady] = useState(false);
  const loadingRef = useRef(false);

  const loadData = useCallback(async (uid: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      // Seed Arasu problems on first boot (idempotent)
      await seedArasuProblems(uid);

      // Load settings first to know active sheet
      const { data: settingsRow } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', uid)
        .single();

      const s: AppSettings = settingsRow
        ? { target: settingsRow.target, ceiling: settingsRow.ceiling, active_sheet_id: settingsRow.active_sheet_id }
        : DEFAULT_SETTINGS;

      if (!settingsRow) {
        await supabase.from('user_settings').insert({ user_id: uid, ...DEFAULT_SETTINGS });
      }

      // Ensure cards exist for the active sheet
      await ensureCardsForSheet(uid, s.active_sheet_id);

      // Parallel load of everything
      const [problemsRes, cardsRes, reviewsRes, sheetsRes] = await Promise.all([
        supabase.from('problems').select('*').order('order_index'),
        supabase.from('cards').select('*').eq('user_id', uid),
        supabase.from('reviews').select('*').eq('user_id', uid).order('date'),
        supabase.from('sheets').select('*'),
      ]);

      setAllProblems((problemsRes.data ?? []) as Problem[]);
      setAllCards((cardsRes.data ?? []).map(toCard));
      setReviews((reviewsRes.data ?? []).map(toReview));
      setSheets((sheetsRes.data ?? []) as SheetMeta[]);
      setSettings(s);
      setReady(true);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  const refresh = useCallback(async () => {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return;
    loadingRef.current = false; // allow re-load
    await loadData(uid);
  }, [loadData]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) loadData(u.id);
      else setReady(true); // no session → show login screen
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setReady(false);
        loadData(u.id);
      } else {
        setReady(true); // signed out → show login screen
        setAllProblems([]);
        setAllCards([]);
        setReviews([]);
        setSettings(DEFAULT_SETTINGS);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadData]);

  return (
    <AppCtx.Provider value={{ user, allProblems, allCards, reviews, settings, sheets, ready, refresh }}>
      {children}
    </AppCtx.Provider>
  );
}
