import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CROPS, CROP_LIST } from '../../data/game';
import type { CropId } from '../../data/types';
import { STORAGE_KEY, saveProgress } from '../../domain/persistence';
import { createInitialProgress } from '../../domain/progress';
import { HOUR_MS, currentTime } from '../../domain/time';
import { FeedbackProvider } from '../../state/FeedbackProvider';
import { GameProvider } from '../../state/GameProvider';
import { useGame } from '../../state/hooks';
import type {
  CreateFarmEngine,
  FarmEffect,
  FarmEngineHandle,
  FarmEngineOptions,
  FarmView,
} from './contract';
import FarmPlayCanvas from './FarmPlayCanvas';

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').data;

/** Records what React sends the engine; lets the test play the engine's side. */
function fakeEngine(opts: { failFirst?: boolean } = {}) {
  const calls = { views: [] as FarmView[], effects: [] as FarmEffect[], destroyed: 0 };
  let last: FarmEngineOptions | null = null;
  let fails = opts.failFirst ? 1 : 0;
  const create = vi.fn<CreateFarmEngine>(async (o) => {
    if (fails-- > 0) throw new Error('no webgl2');
    last = o;
    const handle: FarmEngineHandle = {
      setView: (v) => calls.views.push(v),
      setEnv: () => {},
      play: (e) => calls.effects.push(e),
      setActive: () => {},
      resize: () => {},
      zoom: () => {},
      resetCamera: () => {},
      destroy: () => {
        calls.destroyed++;
      },
    };
    return handle;
  });
  return {
    create,
    calls,
    tap: (target: Parameters<FarmEngineOptions['onIntent']>[0]['target']) =>
      act(() => last!.onIntent({ type: 'select', target })),
    lose: () => act(() => last!.onLost()),
  };
}

/** Same wiring as FarmGame: real reducer, real persistence. */
function Harness({ create }: { create: CreateFarmEngine }) {
  const { state, dispatch, now, reduced } = useGame();
  const [picked, setPicked] = useState<CropId | null>(null);
  const seeds = CROP_LIST.filter((c) => state.seeds[c.id] > 0).map((c) => c.id);
  const active = picked && state.seeds[picked] > 0 ? picked : (seeds[0] ?? null);
  return (
    <FarmPlayCanvas
      state={state}
      now={now}
      reduced={reduced}
      dayPart="noon"
      watering={false}
      activeSeed={active}
      seeds={seeds}
      onPickSeed={setPicked}
      onPlant={(plotId, crop) =>
        dispatch({ type: 'PLANT_FROM_TRAY', crop, plotId, now: currentTime() })
      }
      onWater={(plotId) => dispatch({ type: 'WATER', plotId, now: currentTime() })}
      onHarvest={() => dispatch({ type: 'HARVEST_ALL', now: currentTime() })}
      onFlat={() => {}}
      onClassic={() => {}}
      createEngine={create}
    />
  );
}

function renderHost(create: CreateFarmEngine) {
  return render(
    <GameProvider>
      <FeedbackProvider>
        <Harness create={create} />
      </FeedbackProvider>
    </GameProvider>,
  );
}

function seedGuest(mutate: (p: ReturnType<typeof createInitialProgress>) => void) {
  const now = Date.now();
  const p = createInitialProgress(now);
  // Start from an empty garden (the starter one comes half-planted).
  p.plots = p.plots.map((pl) => ({ ...pl, crop: null, plantedAt: null, readyAt: null }));
  mutate(p);
  saveProgress(p, now);
}

describe('PlayCanvas host', () => {
  it('creates one engine, pushes a view only on change, destroys on unmount', async () => {
    const fake = fakeEngine();
    const view = renderHost(fake.create);
    await waitFor(() => expect(fake.calls.views.length).toBe(1));
    expect(fake.create).toHaveBeenCalledTimes(1);
    expect(fake.calls.views[0]!.plots).toHaveLength(createInitialProgress(0).plots.length);
    view.rerender(
      <GameProvider>
        <FeedbackProvider>
          <Harness create={fake.create} />
        </FeedbackProvider>
      </GameProvider>,
    );
    expect(fake.calls.views.length).toBe(1);
    view.unmount();
    expect(fake.calls.destroyed).toBe(1);
  });

  it('plants from a canvas tap through the reducer, saves it, and plays one effect on a double tap', async () => {
    seedGuest((p) => (p.seeds.herbs = 2));
    const fake = fakeEngine();
    renderHost(fake.create);
    await waitFor(() => expect(fake.calls.views.length).toBe(1));

    fake.tap({ kind: 'plot', id: 1 });
    const bar = screen.getByRole('region', { name: 'Thao tác góc vườn' });
    expect(within(bar).getByRole('heading', { name: 'Ô trống' })).toBeInTheDocument();
    const plant = within(bar).getByRole('button', { name: /gieo hạt rau thơm/i });
    // Two taps before React re-renders.
    act(() => {
      plant.click();
      plant.click();
    });

    expect(fake.calls.effects).toEqual([{ kind: 'plant', plotIds: [1] }]);
    await waitFor(() => expect(stored().plots[0].crop).toBe('herbs'));
    expect(stored().seeds.herbs).toBe(1);
    // The next view the engine gets comes from the new progress.
    await waitFor(() => expect(fake.calls.views.at(-1)!.plots[0]!.stage).toBe('sprout'));
    expect(within(bar).getByRole('button', { name: /tưới/i })).toBeInTheDocument();
  });

  it('harvests all ripe plots once from the bar', async () => {
    const ripeAt = Date.now() - 1000;
    seedGuest((p) => {
      p.plots[0] = {
        ...p.plots[0]!,
        crop: 'herbs',
        plantedAt: ripeAt - CROPS.herbs.growHours * HOUR_MS,
        readyAt: ripeAt,
      };
    });
    const fake = fakeEngine();
    const user = userEvent.setup();
    renderHost(fake.create);
    await waitFor(() => expect(fake.calls.views.length).toBe(1));
    const bar = screen.getByRole('region', { name: 'Thao tác góc vườn' });
    await user.click(within(bar).getByRole('button', { name: 'Thu hoạch' }));
    await waitFor(() => expect(stored().ingredients.herbs).toBe(CROPS.herbs.yield));
    expect(fake.calls.effects).toEqual([{ kind: 'harvest', plotIds: [1] }]);
    expect(within(bar).queryByRole('button', { name: /thu hoạch/i })).toBeNull();
  });

  it('offers retry after a load failure, then runs', async () => {
    const fake = fakeEngine({ failFirst: true });
    const user = userEvent.setup();
    renderHost(fake.create);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/không tải được/i);
    expect(within(alert).getByRole('button', { name: 'Dùng vườn 2D' })).toBeInTheDocument();
    await user.click(within(alert).getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(fake.calls.views.length).toBe(1));
    expect(fake.create).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('drops the engine when the GPU context is lost, without touching progress', async () => {
    seedGuest((p) => (p.seeds.herbs = 1));
    const fake = fakeEngine();
    renderHost(fake.create);
    await waitFor(() => expect(fake.calls.views.length).toBe(1));
    fake.lose();
    expect(await screen.findByRole('alert')).toHaveTextContent(/tạm dừng đồ hoạ/i);
    expect(fake.calls.destroyed).toBe(1);
    expect(stored().seeds.herbs).toBe(1);
  });

  it('reaches plots and the barn by keyboard without the canvas', async () => {
    const fake = fakeEngine();
    const user = userEvent.setup();
    renderHost(fake.create);
    await waitFor(() => expect(fake.calls.views.length).toBe(1));
    await user.click(screen.getByRole('button', { name: 'Nhà kho' }));
    const bar = screen.getByRole('region', { name: 'Thao tác góc vườn' });
    expect(within(bar).getByRole('heading', { name: 'Nhà kho' })).toBeInTheDocument();
    await waitFor(() => expect(fake.calls.views.at(-1)!.selected).toEqual({ kind: 'barn' }));
    await user.keyboard('{Escape}');
    expect(within(bar).getByRole('heading', { name: /chạm vào luống/i })).toBeInTheDocument();
  });
});
