import { createEmptyCard, fsrs, State, type Card as FsrsCard, type Grade } from 'ts-fsrs'
import { formatInterval } from '@/lib/dates'
import type { Card, Rating, Srs, SrsStateName } from '@/lib/types'

const scheduler = fsrs({ enable_fuzz: true, enable_short_term: true })

const STATE_TO_NAME: Record<State, SrsStateName> = {
  [State.New]: 'nueva',
  [State.Learning]: 'aprendiendo',
  [State.Review]: 'repaso',
  [State.Relearning]: 'reaprendiendo',
}
const NAME_TO_STATE: Record<SrsStateName, State> = {
  nueva: State.New,
  aprendiendo: State.Learning,
  repaso: State.Review,
  reaprendiendo: State.Relearning,
}

export const SRS_STATE_LABEL: Record<SrsStateName, string> = {
  nueva: 'Nueva',
  aprendiendo: 'Aprendiendo',
  repaso: 'En repaso',
  reaprendiendo: 'Reaprendiendo',
}

function fromFsrs(c: FsrsCard): Srs {
  return {
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    reps: c.reps,
    lapses: c.lapses,
    state: STATE_TO_NAME[c.state],
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    last_review: c.last_review?.toISOString(),
  }
}

function toFsrs(s: Srs): FsrsCard {
  const last = s.last_review ? new Date(s.last_review) : undefined
  return {
    due: new Date(s.due),
    stability: s.stability ?? 0,
    difficulty: s.difficulty ?? 0,
    elapsed_days: 0,
    scheduled_days: s.scheduled_days ?? 0,
    learning_steps: s.learning_steps ?? 0,
    reps: s.reps ?? 0,
    lapses: s.lapses ?? 0,
    state: NAME_TO_STATE[s.state] ?? State.New,
    last_review: last,
  }
}

export function emptySrs(now = new Date()): Srs {
  return fromFsrs(createEmptyCard(now))
}

export function applyRating(card: Card, rating: Rating, now = new Date()): Srs {
  const { card: next } = scheduler.next(toFsrs(card.srs), now, rating as Grade)
  return fromFsrs(next)
}

export function previewIntervals(card: Card, now = new Date()): Record<Rating, string> {
  const preview = scheduler.repeat(toFsrs(card.srs), now)
  const out = {} as Record<Rating, string>
  for (const r of [1, 2, 3, 4] as Rating[]) {
    out[r] = formatInterval(now, preview[r as Grade].card.due)
  }
  return out
}

/** Tarjeta "dominada": en repaso con estabilidad de 3 semanas o más. */
export function isMastered(card: Card) {
  return card.srs.state === 'repaso' && card.srs.stability >= 21
}
