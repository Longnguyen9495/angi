import {
  recommend,
  type Filters,
  type RecommendContext,
  type RecommendResult,
} from '../domain/recommend';
import { t } from '../i18n';

/**
 * Stand-in for the future backend. Latency is short on purpose: the skeleton
 * should flash, not make people wait. Tests set these to 0.
 */
export const mockConfig = {
  recommendLatencyMs: 380,
  commandLatencyMs: 140,
};

export class MockNetworkError extends Error {
  constructor(message: string = t.account.mock.unreachable) {
    super(message);
    this.name = 'MockNetworkError';
  }
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function fetchRecommendations(
  filters: Filters,
  ctx: RecommendContext,
  opts: { fail?: boolean; signal?: AbortSignal } = {},
): Promise<RecommendResult> {
  await wait(mockConfig.recommendLatencyMs, opts.signal);
  if (opts.fail) throw new MockNetworkError();
  return recommend(filters, ctx);
}

/** Server confirmation for a reward-changing command, keyed for idempotency. */
export async function confirmCommand(
  idempotencyKey: string,
  opts: { fail?: boolean; signal?: AbortSignal } = {},
): Promise<{ ok: true; key: string }> {
  await wait(mockConfig.commandLatencyMs, opts.signal);
  if (opts.fail) throw new MockNetworkError(t.account.mock.plantFailed);
  return { ok: true, key: idempotencyKey };
}

export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}
