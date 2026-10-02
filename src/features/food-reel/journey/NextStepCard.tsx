import {
  ArrowsClockwise,
  Basket,
  ChefHat,
  CookingPot,
  Fish,
  Hourglass,
  Plant,
} from '@phosphor-icons/react';
import { CropIcon } from '../../../components/ui/CropIcon';
import { ANIMALS, CROPS, getRecipe, produceName } from '../../../data/game';
import type { AnimalId, CropId, RecipeId } from '../../../data/types';
import { dishIdsForSeed, type NextStep } from '../../../domain/nextStep';
import { HOUR_MS, formatDuration, slotKey } from '../../../domain/time';
import { t } from '../../../i18n';
import { useGame } from '../../../state/hooks';

const m = t.journey.next;

interface NextStepCardProps {
  step: NextStep;
  /** Just harvested: the card lights up once to catch the eye. */
  highlight: boolean;
  onCook: (recipe: RecipeId) => void;
  onOrders: () => void;
  onHarvest: () => void;
  onAnimal: (animal: AnimalId, act: 'feed' | 'collect') => void;
  onPlant: (plotId: number, crop: CropId) => void;
  onFind: (crop: CropId) => void;
}

/** "Tiếp theo": always exactly one suggested action, right under the plots. */
export function NextStepCard({
  step,
  highlight,
  onCook,
  onOrders,
  onHarvest,
  onAnimal,
  onPlant,
  onFind,
}: NextStepCardProps) {
  const { state, now } = useGame();
  // Choosing another dish this meal is recorded, but the slot's seed is already spent.
  const meal = state.meal?.slotKey === slotKey(now) ? state.meal : null;
  const seedSpent = !!meal && (meal.planted || meal.checkedIn);

  let icon;
  let title: string;
  let body: string;
  let action: { label: string; run: () => void } | null = null;

  switch (step.kind) {
    case 'cook': {
      const r = getRecipe(step.recipe);
      icon = <CookingPot size={22} aria-hidden="true" />;
      title = m.cook.title(r.name);
      body = m.cook.body(r.xp);
      action = { label: m.cook.action(r.name), run: () => onCook(step.recipe) };
      break;
    }
    case 'order':
      icon = <ChefHat size={22} aria-hidden="true" />;
      title = m.order.title;
      body = m.order.body;
      action = { label: m.order.action, run: onOrders };
      break;
    case 'harvest':
      icon = <Basket size={22} aria-hidden="true" />;
      title = m.harvest.title(step.count);
      body = m.harvest.body;
      action = { label: m.harvest.action, run: onHarvest };
      break;
    case 'collect': {
      const a = ANIMALS[step.animal];
      const product = produceName(a.product).toLowerCase();
      icon = <Basket size={22} aria-hidden="true" />;
      title = m.collect.title(a.name, product);
      body = m.collect.body(a.yield, product);
      action = {
        label: m.collect.action(product),
        run: () => onAnimal(a.id, 'collect'),
      };
      break;
    }
    case 'feed': {
      const a = ANIMALS[step.animal];
      icon = <Plant size={22} aria-hidden="true" />;
      title = m.feed.title(a.name.toLowerCase());
      body = m.feed.body(
        produceName(a.feed).toLowerCase(),
        formatDuration(a.hours * HOUR_MS),
        a.yield,
        produceName(a.product).toLowerCase(),
      );
      action = { label: m.feed.action, run: () => onAnimal(a.id, 'feed') };
      break;
    }
    case 'fish': {
      const r = getRecipe(step.recipe);
      icon = <Fish size={22} aria-hidden="true" />;
      title = m.fish.title(r.name, produceName(step.catch).toLowerCase());
      body = m.fish.body(step.left);
      break;
    }
    case 'plant': {
      const c = CROPS[step.crop];
      icon = <Plant size={22} aria-hidden="true" />;
      title = m.plant.title(c.seedName.toLowerCase(), step.plotId);
      body = m.plant.body(step.plotId, c.name.toLowerCase(), formatDuration(c.growHours * HOUR_MS));
      action = { label: m.plant.action, run: () => onPlant(step.plotId, step.crop) };
      break;
    }
    case 'find': {
      const c = CROPS[step.crop];
      const r = getRecipe(step.recipe);
      const n = dishIdsForSeed(step.crop).length;
      const seed = c.seedName.toLowerCase();
      const produce = c.produceName.toLowerCase();
      icon = <CropIcon crop={step.crop} size={22} />;
      title = m.find.title(r.name, produce);
      body =
        n < 2
          ? m.find.notFromDishes(c.name, seed)
          : seedSpent
            ? m.find.seedSpent(n, seed)
            : m.find.body(n, seed, produce);
      if (n >= 2) {
        action = {
          label: m.find.action(seed),
          run: () => onFind(step.crop),
        };
      }
      break;
    }
    case 'wait': {
      const r = getRecipe(step.recipe);
      icon = <Hourglass size={22} aria-hidden="true" />;
      title = m.wait.title(r.name);
      body = m.wait.body(formatDuration(step.readyAt - now));
      break;
    }
    case 'full':
      icon = <ArrowsClockwise size={22} aria-hidden="true" />;
      title = m.full.title;
      body = m.full.body;
      break;
  }

  return (
    <section
      className={`fj-next ${highlight ? 'is-highlight' : ''}`}
      aria-labelledby="fj-next-title"
      data-kind={step.kind}
    >
      <span className="fj-next__icon" aria-hidden="true">
        {icon}
      </span>
      <div className="fj-next__copy">
        <p className="fj-next__kicker">{m.kicker}</p>
        <h3 id="fj-next-title" className="fj-next__title">
          {title}
        </h3>
        <p className="fj-next__body">{body}</p>
      </div>
      {action && (
        <button type="button" className="fr-cta fj-next__cta" onClick={action.run}>
          {action.label}
        </button>
      )}
    </section>
  );
}
