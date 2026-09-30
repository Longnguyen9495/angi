import {
  ArrowsClockwise,
  Basket,
  ChefHat,
  CookingPot,
  Hourglass,
  Plant,
} from '@phosphor-icons/react';
import { CropIcon } from '../../../components/ui/CropIcon';
import { ANIMALS, CROPS, RECIPES, produceName } from '../../../data/game';
import type { AnimalId, CropId, RecipeId } from '../../../data/types';
import { dishIdsForSeed, type NextStep } from '../../../domain/nextStep';
import { slotKey, formatDuration } from '../../../domain/time';
import { useGame } from '../../../state/hooks';

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
      const r = RECIPES[step.recipe];
      icon = <CookingPot size={22} aria-hidden="true" />;
      title = `Đủ nguyên liệu nấu ${r.name}`;
      body = `Bếp đã sẵn sàng — nấu ngay để nhận +${r.xp} XP và mở trang sổ bếp.`;
      action = { label: `Nấu ${r.name}`, run: () => onCook(step.recipe) };
      break;
    }
    case 'order':
      icon = <ChefHat size={22} aria-hidden="true" />;
      title = 'Kho đủ hàng cho đơn của Cô Ba';
      body = 'Giao đơn để đổi lấy hạt giống, lượt tưới và XP.';
      action = { label: 'Xem đơn', run: onOrders };
      break;
    case 'harvest':
      icon = <Basket size={22} aria-hidden="true" />;
      title = `${step.count} ô đã chín`;
      body = 'Thu hoạch để đưa nông sản vào kho và giải phóng ô đất.';
      action = { label: 'Thu hoạch', run: onHarvest };
      break;
    case 'collect': {
      const a = ANIMALS[step.animal];
      icon = <Basket size={22} aria-hidden="true" />;
      title = `${a.name} đã có ${produceName(a.product).toLowerCase()}`;
      body = `Thu ${a.yield} ${produceName(a.product).toLowerCase()} vào kho, rồi cho ăn để có mẻ tiếp theo.`;
      action = {
        label: `Thu ${produceName(a.product).toLowerCase()}`,
        run: () => onAnimal(a.id, 'collect'),
      };
      break;
    }
    case 'feed': {
      const a = ANIMALS[step.animal];
      icon = <Plant size={22} aria-hidden="true" />;
      title = `Cho ${a.name.toLowerCase()} ăn`;
      body = `1 ${produceName(a.feed).toLowerCase()} → sau ${a.hours} giờ có ${a.yield} ${produceName(a.product).toLowerCase()} cho công thức.`;
      action = { label: 'Cho ăn', run: () => onAnimal(a.id, 'feed') };
      break;
    }
    case 'plant': {
      const c = CROPS[step.crop];
      icon = <Plant size={22} aria-hidden="true" />;
      title = `Gieo ${c.seedName.toLowerCase()} vào ô ${step.plotId}`;
      body = `Khay còn hạt và ô ${step.plotId} đang trống — ${c.name.toLowerCase()} chín sau khoảng ${c.growHours} giờ.`;
      action = { label: 'Gieo ngay', run: () => onPlant(step.plotId, step.crop) };
      break;
    }
    case 'find': {
      const c = CROPS[step.crop];
      const r = RECIPES[step.recipe];
      const n = dishIdsForSeed(step.crop).length;
      icon = <CropIcon crop={step.crop} size={22} />;
      title = `${r.name} còn thiếu ${c.produceName.toLowerCase()}`;
      body =
        n < 2
          ? `${c.name} không đến từ món ăn — nhận ${c.seedName.toLowerCase()} từ đơn của Cô Ba hoặc ở chợ.`
          : seedSpent
            ? `Bữa này đã nhận hạt rồi. Bữa sau, chốt một trong ${n} món cho ${c.seedName.toLowerCase()} để trồng tiếp.`
            : `Chốt một trong ${n} món cho ${c.seedName.toLowerCase()} — bữa ăn gửi lại hạt, gieo là có ${c.produceName.toLowerCase()}.`;
      if (n >= 2) {
        action = {
          label: `Quay các món cho ${c.seedName.toLowerCase()}`,
          run: () => onFind(step.crop),
        };
      }
      break;
    }
    case 'wait': {
      const r = RECIPES[step.recipe];
      icon = <Hourglass size={22} aria-hidden="true" />;
      title = `Cây đang lớn cho ${r.name}`;
      body = `Ô sớm nhất chín sau ${formatDuration(step.readyAt - now)}. Tưới để nhanh hơn, hoặc cứ thong thả.`;
      break;
    }
    case 'full':
      icon = <ArrowsClockwise size={22} aria-hidden="true" />;
      title = 'Khu vườn đang nghỉ';
      body = 'Chốt một món để nhận hạt mới cho khu vườn.';
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
        <p className="fj-next__kicker">Tiếp theo</p>
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
