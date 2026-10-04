import { m, useScroll, useSpring, useTransform, type Variants } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { getDishNarrative, type DishNarrative } from '../data/dishStories';
import type { ReelDish } from '../foodReel.types';
import { FlavorProfile } from './FlavorProfile';

type ChapterId =
  'origin' | 'timeline' | 'meaning' | 'ingredients' | 'tasting' | 'facts' | 'sources';

const LABELS: Record<ChapterId, string> = {
  origin: 'Nguồn gốc',
  timeline: 'Dòng thời gian',
  meaning: 'Ý nghĩa văn hóa',
  ingredients: 'Nguyên liệu & biểu tượng',
  tasting: 'Thưởng thức',
  facts: 'Có thể bạn chưa biết',
  sources: 'Đọc thêm',
};

function chaptersFor(story: DishNarrative): ChapterId[] {
  return (Object.keys(LABELS) as ChapterId[]).filter(
    (id) =>
      (id !== 'timeline' || story.timeline.length > 0) &&
      (id !== 'meaning' || story.meaning.length > 0) &&
      (id !== 'facts' || story.facts.length > 0),
  );
}

const EASE = [0.22, 1, 0.36, 1] as const;

/** Staggers its children when the chapter scrolls into view. */
const STAGGER: Variants = { show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } };

/** Soft focus-pull: text rises out of a blur. */
const RISE: Variants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease: EASE } },
};

/** Heading wiped in left to right. */
const WIPE: Variants = {
  hidden: { clipPath: 'inset(0 100% 0 0)' },
  show: { clipPath: 'inset(0 0% 0 0)', transition: { duration: 0.9, ease: EASE } },
};

const WORD: Variants = {
  hidden: { opacity: 0, y: '0.45em', filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: EASE } },
};

/** Ingredient cards flip up towards the reader. */
const FLIP: Variants = {
  hidden: { opacity: 0, rotateX: -65, y: 36, transformPerspective: 900 },
  show: {
    opacity: 1,
    rotateX: 0,
    y: 0,
    transformPerspective: 900,
    transition: { type: 'spring', stiffness: 110, damping: 16 },
  },
};

const POP: Variants = {
  hidden: { opacity: 0, y: 44, scale: 0.92, rotate: -2.5 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 120, damping: 15 },
  },
};

export function StoryChapters({
  dish,
  reduced,
  scrollRef,
}: {
  dish: ReelDish;
  reduced: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const story = getDishNarrative(dish);
  const chapters = chaptersFor(story);
  const name = dish.nameVi || dish.name;
  const [active, setActive] = useState<ChapterId>('origin');
  const navRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });

  // The current chapter is the last one whose top has passed a line a third of
  // the way down the reader; at the very bottom it is always the last chapter.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-story-chapter]'));
      if (!nodes.length) return;
      const line = root.getBoundingClientRect().top + root.clientHeight / 3;
      const atEnd = root.scrollTop + root.clientHeight >= root.scrollHeight - 4;
      let current = nodes[0]!;
      for (const node of nodes) if (node.getBoundingClientRect().top <= line) current = node;
      if (atEnd) current = nodes[nodes.length - 1]!;
      setActive(current.id.replace('fr-chapter-', '') as ChapterId);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      root.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [scrollRef]);

  // Keep the active chapter pill visible in the horizontally scrolling nav.
  useEffect(() => {
    const nav = navRef.current;
    const button = nav?.querySelector<HTMLElement>(`[data-chapter="${active}"]`);
    if (!nav || !button) return;
    nav.scrollTo?.({
      left: button.offsetLeft - nav.clientWidth / 2 + button.offsetWidth / 2,
      behavior: reduced ? 'auto' : 'smooth',
    });
  }, [active, reduced]);

  const navigate = (id: ChapterId) => {
    const target = document.getElementById(`fr-chapter-${id}`);
    if (!target) return;
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
    setActive(id);
  };

  const inView = {
    initial: reduced ? (false as const) : ('hidden' as const),
    whileInView: 'show',
    viewport: { once: true, root: scrollRef, amount: 0.15 },
  };

  return (
    <>
      <div className="fr-reading-progress" aria-hidden="true">
        <m.div style={{ scaleX: progress }} />
      </div>

      {story.coverage === 'curated' && (
        <m.div className="fr-cover" lang="vi" variants={STAGGER} {...inView}>
          <m.p className="fr-cover__meta" variants={RISE}>
            {story.homeland && <span className="fr-cover__chip">{story.homeland}</span>}
            {story.era && <span className="fr-cover__chip">{story.era}</span>}
          </m.p>
          {story.tagline && (
            <Words as="p" className="fr-cover__tagline" text={story.tagline} {...inView} />
          )}
        </m.div>
      )}

      <nav className="fr-chapter-nav" aria-label="Các chương câu chuyện món ăn" ref={navRef}>
        {chapters.map((id, i) => (
          <button
            key={id}
            type="button"
            data-chapter={id}
            aria-current={active === id ? 'location' : undefined}
            onClick={() => navigate(id)}
          >
            <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span> {LABELS[id]}
          </button>
        ))}
      </nav>

      <div className="fr-narrative" lang="vi">
        {chapters.map((id, index) => (
          <Chapter
            key={id}
            id={id}
            index={index}
            reduced={reduced}
            scrollRef={scrollRef}
            inView={inView}
          >
            {id === 'origin' && (
              <div className="fr-prose fr-prose--dropcap">
                {story.origin.map((p, i) => (
                  <m.p className="fr-story__text" variants={RISE} key={i}>
                    {p}
                  </m.p>
                ))}
              </div>
            )}

            {id === 'timeline' && (
              <Timeline items={story.timeline} reduced={reduced} scrollRef={scrollRef} />
            )}

            {id === 'meaning' && (
              <>
                <div className="fr-prose">
                  {story.meaning.map((p, i) => (
                    <m.p className="fr-story__text" variants={RISE} key={i}>
                      {p}
                    </m.p>
                  ))}
                </div>
                {story.saying && (
                  <m.figure className="fr-saying" variants={RISE}>
                    <span className="fr-saying__mark" aria-hidden="true">
                      “
                    </span>
                    <Words
                      as="blockquote"
                      className="fr-saying__text"
                      text={story.saying.text}
                      {...inView}
                    />
                    <figcaption>— {story.saying.by}</figcaption>
                  </m.figure>
                )}
              </>
            )}

            {id === 'ingredients' && (
              <>
                {story.symbols.length > 0 && (
                  <ul className="fr-symbols">
                    {story.symbols.map((symbol, i) => (
                      <m.li className="fr-symbol" variants={FLIP} key={symbol.name}>
                        <span className="fr-symbol__no" aria-hidden="true">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <h4 className="fr-symbol__name">{symbol.name}</h4>
                        <p className="fr-symbol__text">{symbol.meaning}</p>
                      </m.li>
                    ))}
                  </ul>
                )}
                {dish.ingredients.length > 0 && (
                  <m.div className="fr-recipe" variants={RISE}>
                    <h4 className="fr-recipe__h">Trong phần ăn này</h4>
                    <ul className="fr-recipe__list">
                      {dish.ingredients.map((ingredient) => (
                        <li key={ingredient.id}>
                          <strong>{ingredient.nameVi || ingredient.name}</strong>
                          {ingredient.description && <span>{ingredient.description}</span>}
                        </li>
                      ))}
                    </ul>
                  </m.div>
                )}
              </>
            )}

            {id === 'tasting' && (
              <div className="fr-tasting">
                <div className="fr-prose">
                  {story.tasting.map((p, i) => (
                    <m.p className="fr-story__text" variants={RISE} key={i}>
                      {p}
                    </m.p>
                  ))}
                </div>
                <m.div className="fr-narrative__flavor" variants={RISE}>
                  <h4>Hồ sơ vị</h4>
                  <FlavorProfile flavor={dish.flavor} />
                </m.div>
              </div>
            )}

            {id === 'facts' && (
              <ol className="fr-facts">
                {story.facts.map((fact, i) => (
                  <m.li className="fr-fact" variants={POP} key={i}>
                    <span className="fr-fact__no" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p>{fact}</p>
                  </m.li>
                ))}
              </ol>
            )}

            {id === 'sources' && (
              <>
                <m.p className="fr-story__text" variants={RISE}>
                  {story.coverage === 'curated'
                    ? `Câu chuyện về ${name} được biên soạn từ các tư liệu phổ biến về lịch sử ẩm thực. Với những chi tiết còn tranh luận, bài viết ghi rõ đó là giả thuyết hay truyền thuyết.`
                    : `Câu chuyện chi tiết về ${name} đang được biên soạn.`}
                </m.p>
                <m.ul className="fr-story-sources" variants={RISE}>
                  {story.sources.map((source) => (
                    <li key={source.label}>
                      {source.url ? (
                        <a href={source.url} target="_blank" rel="noopener noreferrer">
                          {source.label} <span className="fr-source-external">(mở tab mới)</span>
                        </a>
                      ) : (
                        <span>{source.label}</span>
                      )}
                    </li>
                  ))}
                </m.ul>
              </>
            )}
          </Chapter>
        ))}
      </div>
    </>
  );
}

type InView = {
  initial: false | 'hidden';
  whileInView: string;
  viewport: { once: boolean; root: RefObject<HTMLDivElement | null>; amount: number };
};

/** A chapter: wiped-in heading, staggered body and a parallax numeral behind it. */
function Chapter({
  id,
  index,
  reduced,
  scrollRef,
  inView,
  children,
}: {
  id: ChapterId;
  index: number;
  reduced: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  inView: InView;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    container: scrollRef,
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], ['45%', '-45%']);
  const no = String(index + 1).padStart(2, '0');
  return (
    <m.section
      ref={ref}
      variants={STAGGER}
      {...inView}
      className={`fr-story__section fr-narrative__chapter fr-narrative__chapter--${id}`}
      id={`fr-chapter-${id}`}
      data-story-chapter
      tabIndex={-1}
      aria-labelledby={`fr-heading-${id}`}
    >
      <m.span className="fr-chapter-mark" aria-hidden="true" style={reduced ? undefined : { y }}>
        {no}
      </m.span>
      <m.h3 className="fr-story__h" id={`fr-heading-${id}`} variants={WIPE}>
        <span className="fr-story__h-no">{no}</span>
        {LABELS[id]}
      </m.h3>
      {children}
    </m.section>
  );
}

/** Milestones along a rail that fills as the reader scrolls through it. */
function Timeline({
  items,
  reduced,
  scrollRef,
}: {
  items: DishNarrative['timeline'];
  reduced: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({
    container: scrollRef,
    target: ref,
    offset: ['start 80%', 'end 45%'],
  });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });
  return (
    <div className="fr-timeline">
      <div className="fr-timeline__rail" aria-hidden="true">
        <m.div style={{ scaleY: reduced ? 1 : fill }} />
      </div>
      <ol className="fr-timeline__list" ref={ref}>
        {items.map((item, i) => (
          <m.li
            className="fr-timeline__item"
            key={i}
            variants={{
              hidden: { opacity: 0, x: i % 2 ? 40 : -40, filter: 'blur(6px)' },
              show: {
                opacity: 1,
                x: 0,
                filter: 'blur(0px)',
                transition: { duration: 0.7, ease: EASE },
              },
            }}
          >
            <m.span
              className="fr-timeline__dot"
              aria-hidden="true"
              variants={{
                hidden: { scale: 0 },
                show: { scale: 1, transition: { type: 'spring', stiffness: 260, damping: 14 } },
              }}
            />
            <span className="fr-timeline__when">{item.when}</span>
            <p className="fr-timeline__what">{item.what}</p>
          </m.li>
        ))}
      </ol>
    </div>
  );
}

/** Text revealed word by word; the words stay real text for copy and screen readers. */
function Words({
  as,
  text,
  className,
  ...inView
}: InView & { as: 'p' | 'blockquote'; text: string; className: string }) {
  const Tag = as === 'p' ? m.p : m.blockquote;
  const words = text.split(/\s+/);
  return (
    <Tag
      className={className}
      variants={{ show: { transition: { staggerChildren: 0.035 } } }}
      {...inView}
    >
      {words.map((word, i) => (
        <span key={i}>
          <m.span className="fr-word" variants={WORD}>
            {word}
          </m.span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
}
