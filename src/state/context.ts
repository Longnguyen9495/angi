import { createContext, type Dispatch } from 'react';
import type { GuestProgress } from '../domain/progress';
import type { Action } from '../domain/reducer';
import type { CropId } from '../data/types';

export interface GameContextValue {
  state: GuestProgress;
  dispatch: Dispatch<Action>;
  /** Effective reduced-motion flag: OS preference or in-app setting. */
  reduced: boolean;
  /**
   * Effective effects tier ('auto' resolved for this device). Animation code reads it to size
   * particle pools, the number of moving animals and bees, and whether flights run at all.
   */
  quality: 'low' | 'medium' | 'high';
  /** Ticks every minute so crop stages update without reloads. */
  now: number;
  /** Message shown once when stored progress could not be restored. */
  recoveryNotice: string | null;
  restored: boolean;
}

export const GameContext = createContext<GameContextValue | null>(null);

/** `reward`: something landed in the guest's hands (harvest, level-up, gift). */
export type ToastTone = 'info' | 'success' | 'warning' | 'error' | 'reward';

export interface ToastInput {
  message: string;
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
  /** Milliseconds on screen; defaults by tone. */
  duration?: number;
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
  focusSection: (id: 'chon-mon' | 'khu-vuon' | 'cong-thuc' | 'ban-do' | 'check-in') => void;
  /** Closes the Journey and spins the reel over the dishes that grant this seed. */
  spinForSeed: (crop: CropId) => void;
  /** Opens the optional "Lưu nông trại" sign-in sheet. */
  openAccount: () => void;
}

export const UiContext = createContext<UiContextValue | null>(null);

export type SyncState = 'idle' | 'saving' | 'saved' | 'offline';

export interface AccountContextValue {
  /** 'loading' until the first /me answer (or failure) comes back. */
  status: 'loading' | 'guest' | 'signed-in';
  user: import('../services/account').AccountUser | null;
  sync: SyncState;
  lastSyncAt: number | null;
  /** Two different journeys met at sign-in: the guest picks one. */
  conflict: {
    local: import('../domain/sync').ProgressSummary;
    remote: import('../domain/sync').ProgressSummary;
  } | null;
  resolveConflict: (keep: 'local' | 'remote') => Promise<void>;
  /** An emailed link opened in a browser that did not ask for it: which account it is for. */
  linkConfirm: { email: string } | null;
  /** The guest's answer to linkConfirm (yes signs in). */
  answerLink: (yes: boolean) => Promise<void>;
  /** Called by the sign-in sheet once the code is verified. */
  signedIn: (user: import('../services/account').AccountUser) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  setMarketing: (on: boolean) => Promise<void>;
  /** Fetch and apply friends' help / Cô Ba's gift now (e.g. right after watering a friend). */
  checkInbox: () => Promise<void>;
  /** A fair-play lock in force (server/lib/FairPlay.php): the farm shows as locked until then. */
  farmBan: import('../services/account').FarmBan | null;
  /** The friends list, refreshed with the inbox (null until loaded or signed out). */
  friends: import('../services/account').FriendsList | null;
  refreshFriends: () => Promise<void>;
  /**
   * An operation the server applies to the saved garden itself (Vườn Mây stars and tiers):
   * saves what is pending first, runs `run` with the saved version, then loads the garden the
   * server answers with. Throws when signed out or offline.
   */
  serverOp: <T extends { data: unknown; version: number }>(
    run: (baseVersion: number) => Promise<T>,
  ) => Promise<T>;
}

export const AccountContext = createContext<AccountContextValue | null>(null);
