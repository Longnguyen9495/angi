import { m, type Variants } from 'motion/react';

interface SplitLinesProps {
  lines: string[];
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div';
  className?: string;
  delay?: number;
  stagger?: number;
  id?: string;
  tabIndex?: number;
}

const line: Variants = {
  hidden: { y: '108%', opacity: 0 },
  shown: (i: number) => ({
    y: '0%',
    opacity: 1,
    transition: { duration: 0.8, ease: [0.2, 0.8, 0.2, 1], delay: i },
  }),
};

/**
 * Editorial clip reveal: each line rises out of its own overflow mask. The
 * full text stays in the DOM once, so screen readers read it normally.
 */
export function SplitLines({
  lines,
  as: Tag = 'h2',
  className,
  delay = 0,
  stagger = 0.09,
  id,
  tabIndex,
}: SplitLinesProps) {
  return (
    <Tag className={className} id={id} tabIndex={tabIndex}>
      <span className="sr-only">{lines.join(' ')}</span>
      {lines.map((text, i) => (
        <span key={`${i}-${text}`} className="fr-line" aria-hidden="true">
          <m.span
            className="fr-line__inner"
            variants={line}
            initial="hidden"
            animate="shown"
            custom={delay + i * stagger}
          >
            {text}
          </m.span>
        </span>
      ))}
    </Tag>
  );
}
