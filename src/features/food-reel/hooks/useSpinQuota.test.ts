import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountError, spinsApi, type SpinStatus } from '../../../services/account';
import { useSpinQuota } from './useSpinQuota';

const status = (over: Partial<SpinStatus> = {}): SpinStatus => ({
  freePerDay: 5,
  freeLeft: 2,
  credits: 0,
  price: 5000,
  packs: [1, 5],
  signedIn: false,
  networkFull: false,
  resetIn: 3600,
  payments: true,
  ...over,
});

afterEach(() => vi.restoreAllMocks());

describe('useSpinQuota', () => {
  it('spins while the server is unreachable', () => {
    vi.spyOn(spinsApi, 'status').mockRejectedValue(new AccountError('offline', 0));
    vi.spyOn(spinsApi, 'use').mockRejectedValue(new AccountError('offline', 0));
    const { result } = renderHook(() => useSpinQuota(null));
    let ok = false;
    act(() => {
      ok = result.current.take();
    });
    expect(ok).toBe(true);
    expect(result.current.blocked).toBeNull();
  });

  it('counts free spins down, then opens the paywall', async () => {
    vi.spyOn(spinsApi, 'status').mockResolvedValue(status({ freeLeft: 1 }));
    vi.spyOn(spinsApi, 'use').mockResolvedValue({ ...status({ freeLeft: 0 }), used: 'free' });
    const { result } = renderHook(() => useSpinQuota(null));
    await waitFor(() => expect(result.current.status?.freeLeft).toBe(1));
    act(() => {
      expect(result.current.take()).toBe(true);
    });
    expect(result.current.status?.freeLeft).toBe(0);
    let second = true;
    act(() => {
      second = result.current.take();
    });
    expect(second).toBe(false);
    expect(result.current.blocked).toBe('sign_in');
  });

  it('uses bought spins once the free ones are gone', async () => {
    vi.spyOn(spinsApi, 'status').mockResolvedValue(
      status({ freeLeft: 0, credits: 3, signedIn: true }),
    );
    vi.spyOn(spinsApi, 'use').mockResolvedValue({
      ...status({ freeLeft: 0, credits: 2, signedIn: true }),
      used: 'credit',
    });
    const { result } = renderHook(() => useSpinQuota('k'));
    await waitFor(() => expect(result.current.status?.credits).toBe(3));
    act(() => {
      expect(result.current.take()).toBe(true);
    });
    expect(result.current.status?.credits).toBe(2);
    expect(result.current.blocked).toBeNull();
  });

  it('asks a signed-in account with nothing left to buy', async () => {
    vi.spyOn(spinsApi, 'status').mockResolvedValue(status({ freeLeft: 0, signedIn: true }));
    const use = vi.spyOn(spinsApi, 'use');
    const { result } = renderHook(() => useSpinQuota('k'));
    await waitFor(() => expect(result.current.status).not.toBeNull());
    act(() => {
      expect(result.current.take()).toBe(false);
    });
    expect(result.current.blocked).toBe('no_spins');
    expect(use).not.toHaveBeenCalled();
  });
});
