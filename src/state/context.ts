import { createContext, type Dispatch } from 'react';
import type { GuestProgress } from '../domain/progress';
import type { Action } from '../domain/reducer';

export interface GameContextValue {
  state: GuestProgress;
  dispatch: Dispatch<Action>;
  /** Effective reduced-motion flag: OS preference or in-app setting. */
  reduced: boolean;
  /** Ticks every minute so crop stages update without reloads. */
  now: number;
  /** Message shown once when stored progress could not be restored. */
  recoveryNotice: string | null;
  restored: boolean;
}

export const GameContext = createContext<GameContextValue | null>(null);

export type ToastTone = 'info' | 'success' | 'warning';

export interface ToastInput {
  message: string;
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
}

export interface FeedbackContextValue {
  toast: (t: ToastInput) => void;
  /** Polite screen-reader announcement, separate from visual toasts. */
  announce: (text: string) => void;
}

export const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export interface UiContextValue {
  openCheckIn: () => void;
  openProfile: () => void;
  focusSection: (id: 'chon-mon' | 'khu-vuon' | 'ban-do' | 'check-in') => void;
}

export const UiContext = createContext<UiContextValue | null>(null);
