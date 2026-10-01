import type vi from './messages/vi';

/**
 * Vietnamese is the source dictionary: its shape is the contract every other
 * language follows. Values are plain strings, or functions for interpolation,
 * plurals and word order (`(n: number) => string`).
 */
export type Messages = typeof vi;

export type DeepPartial<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

/** A translation may be partial; missing keys fall back to Vietnamese. */
export type LocaleMessages = DeepPartial<Messages>;
