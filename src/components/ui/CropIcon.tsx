import { Cherries, Grains, Leaf, Pepper, Plant } from '@phosphor-icons/react';
// Lucide is only a fallback: Phosphor has no bean glyph (only a coffee bean).
import { Bean } from 'lucide-react';
import type { CropId } from '../../data/types';

export function CropIcon({ crop, size = 16 }: { crop: CropId; size?: number }) {
  switch (crop) {
    case 'rice':
      return <Grains aria-hidden="true" size={size} />;
    case 'herbs':
      return <Leaf aria-hidden="true" size={size} />;
    case 'chili':
      return <Pepper aria-hidden="true" size={size} />;
    case 'scallion':
      return <Plant aria-hidden="true" size={size} />;
    case 'tomato':
      return <Cherries aria-hidden="true" size={size} />;
    case 'bean':
      return <Bean aria-hidden="true" size={size} strokeWidth={1.6} absoluteStrokeWidth />;
  }
}
