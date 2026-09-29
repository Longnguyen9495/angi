import { ChefHat } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { CHEF } from '../../data/game';

export function NpcTeaser({ lines, children }: { lines: [string, string?]; children?: ReactNode }) {
  return (
    <div className="npc">
      <span className="npc__avatar" aria-hidden="true">
        <ChefHat size={30} weight="light" />
      </span>
      <div className="npc__bubble">
        <p className="npc__name">
          {CHEF.name} <span className="npc__role">· {CHEF.role}</span>
        </p>
        {/* At most two sentences per appearance (content rule). */}
        <p className="npc__line">
          {lines[0]}
          {lines[1] ? ` ${lines[1]}` : ''}
        </p>
        {children}
      </div>
    </div>
  );
}
