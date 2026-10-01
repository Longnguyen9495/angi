import { ChefHat, Drop, SealCheck } from '@phosphor-icons/react';
import { useRef } from 'react';
import { ProduceImage } from '../../../components/ui/CropVisual';
import { CropIcon } from '../../../components/ui/CropIcon';
import { CHEF, CROPS, produceName } from '../../../data/game';
import { canFulfill, orderDone, todaysOrders, type ChefOrder } from '../../../domain/orders';
import { currentTime } from '../../../domain/time';
import { flyTo } from '../../../motion/effects';
import { t } from '../../../i18n';
import { useFeedback, useGame } from '../../../state/hooks';

const m = t.journey.orders;

/** Cô Ba's two daily orders: a place to spend spare produce. New orders every morning. */
export function OrdersSection() {
  const { state, now } = useGame();
  const orders = todaysOrders(state, now);
  return (
    <ul className="fj-orders">
      {orders.map((o, i) => (
        <OrderCard key={o.id} order={o} big={i === 1} />
      ))}
    </ul>
  );
}

function OrderCard({ order, big }: { order: ChefOrder; big: boolean }) {
  const { state, dispatch, reduced } = useGame();
  const { toast, announce } = useFeedback();
  const avatarRef = useRef<HTMLSpanElement>(null);
  const itemsRef = useRef<HTMLUListElement>(null);
  const done = orderDone(state, order);
  const ready = canFulfill(state, order);

  const deliver = () => {
    if (!ready) return;
    // Produce flies to Cô Ba (decorative); the delivery itself is committed first.
    const avatar = avatarRef.current;
    itemsRef.current?.querySelectorAll<HTMLElement>('.produce-img').forEach((img, i) => {
      if (avatar) flyTo(img, avatar, { reduced, duration: 560 + i * 90 });
    });
    dispatch({ type: 'FULFILL_ORDER', orderId: order.id, now: currentTime() });
    const seeds = order.reward.seeds.map((s) => CROPS[s.crop].seedName.toLowerCase()).join(', ');
    toast({
      message: m.thanks(order.reward.xp, seeds, order.reward.water),
      tone: 'reward',
    });
    announce(m.delivered(CHEF.name));
  };

  return (
    <li className={`fj-order ${done ? 'is-done' : ''} ${ready ? 'is-ready' : ''}`}>
      <div className="fj-order__head">
        <span className="npc__avatar fj-order__avatar" ref={avatarRef} aria-hidden="true">
          <ChefHat size={26} weight="light" />
        </span>
        <div>
          <p className="fj-order__kind">{big ? m.big : m.small}</p>
          <p className="fj-order__line">{order.line}</p>
        </div>
      </div>

      <ul className="fj-order__items" ref={itemsRef} aria-label={m.needed}>
        {order.items.map((i) => {
          const have = state.ingredients[i.crop];
          return (
            <li key={i.crop} className={have >= i.qty || done ? 'is-have' : ''}>
              <ProduceImage crop={i.crop} size={34} />
              <span>
                {produceName(i.crop)} ×{i.qty}
                {!done && <span className="fj-order__have">{m.have(have)}</span>}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="fj-order__foot">
        <ul className="fj-order__reward" aria-label={m.reward}>
          <li>+{order.reward.xp} XP</li>
          {order.reward.seeds.map((s) => (
            <li key={s.crop}>
              <CropIcon crop={s.crop} size={14} /> {CROPS[s.crop].seedName}
            </li>
          ))}
          {order.reward.water > 0 && (
            <li>
              <Drop size={14} aria-hidden="true" /> {m.water(order.reward.water)}
            </li>
          )}
        </ul>
        {done ? (
          <p className="fj-order__done">
            <SealCheck aria-hidden="true" size={16} weight="fill" /> {m.done}
          </p>
        ) : (
          <button type="button" className="fr-cta" aria-disabled={!ready} onClick={deliver}>
            {ready ? m.deliver : m.notEnough}
          </button>
        )}
      </div>
    </li>
  );
}
