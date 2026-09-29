/** Visual steps of the planting storyboard (see RewardPanel for timings). */
export type PlantStep = 'waiting' | 'drop' | 'impact' | 'sprout' | 'progress' | 'settled';

export const STEP_ORDER: PlantStep[] = [
  'waiting',
  'drop',
  'impact',
  'sprout',
  'progress',
  'settled',
];

export function stepAtLeast(current: PlantStep, target: PlantStep): boolean {
  return STEP_ORDER.indexOf(current) >= STEP_ORDER.indexOf(target);
}
