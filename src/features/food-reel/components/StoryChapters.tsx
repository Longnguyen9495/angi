import { m, useScroll } from 'motion/react';
import { useEffect, useState, type RefObject } from 'react';
import { getDishNarrative } from '../data/dishStories';
import type { ReelDish } from '../foodReel.types';
import { FlavorProfile } from './FlavorProfile';

const CHAPTERS = [
  ['origin', 'Nguồn gốc'],
  ['culture', 'Ý nghĩa văn hóa'],
  ['ingredients', 'Bản sắc nguyên liệu'],
  ['tasting', 'Thưởng thức'],
  ['sources', 'Nguồn tham khảo'],
] as const;

export function StoryChapters({
  dish,
  reduced,
  scrollRef,
}: {
  dish: ReelDish;
  reduced: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const narrative = getDishNarrative(dish);
  const [active, setActive] = useState<string>('origin');
  const { scrollYProgress } = useScroll({ container: scrollRef });
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id.replace('fr-chapter-', ''));
      },
      { root, rootMargin: '-15% 0px -55% 0px', threshold: 0 },
    );
    root.querySelectorAll('[data-story-chapter]').forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [scrollRef]);
  const reveal = {
    initial: reduced ? (false as const) : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, root: scrollRef, amount: 0.12 },
    transition: { duration: reduced ? 0 : 0.55 },
  };
  const navigate = (id: string) => {
    const target = document.getElementById(`fr-chapter-${id}`);
    if (!target) return;
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
    setActive(id);
  };
  return (
    <>
      <div className="fr-reading-progress" aria-hidden="true">
        <m.div style={{ scaleX: scrollYProgress }} />
      </div>
      <nav className="fr-chapter-nav" aria-label="Các chương câu chuyện món ăn">
        {CHAPTERS.map(([id, label], i) => (
          <button
            key={id}
            type="button"
            aria-current={active === id ? 'location' : undefined}
            onClick={() => navigate(id)}
          >
            <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span> {label}
          </button>
        ))}
      </nav>
      <div className="fr-narrative" lang="vi">
        <p className="fr-narrative__note">
          {narrative.coverage === 'curated'
            ? 'Ghi chép biên tập riêng cho món · Bối cảnh tổng quan, chưa xác minh lịch sử bằng tư liệu gốc.'
            : 'Hồ sơ catalogue · Chưa có tư liệu lịch sử riêng được biên tập cho món này.'}{' '}
          Nội dung chương hiện bằng tiếng Việt.
        </p>
        {CHAPTERS.map(([id, label], index) => (
          <m.section
            key={id}
            {...reveal}
            className="fr-story__section fr-narrative__chapter"
            id={`fr-chapter-${id}`}
            data-story-chapter
            tabIndex={-1}
            aria-labelledby={`fr-heading-${id}`}
          >
            <h3 className="fr-story__h" id={`fr-heading-${id}`}>
              <span className="fr-story__h-no">{String(index + 1).padStart(2, '0')}</span>
              {label}
            </h3>
            {id === 'ingredients' ? (
              <>
                <p className="fr-story__text">
                  Những thành phần của {dish.nameVi || dish.name} theo catalogue hiện tại. Danh sách
                  có thể chưa đầy đủ và không xác nhận công thức của quán.
                </p>
                <ol className="fr-ingredients">
                  {dish.ingredients.map((ingredient, i) => (
                    <m.li
                      key={ingredient.id}
                      className="fr-ingredients__item"
                      initial={reduced ? false : { opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, root: scrollRef }}
                      transition={{ duration: reduced ? 0 : 0.35, delay: reduced ? 0 : i * 0.045 }}
                    >
                      <span className="fr-ingredients__no" aria-hidden="true">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="fr-ingredients__name">
                        {ingredient.nameVi || ingredient.name}
                      </span>
                      <span className="fr-ingredients__desc">
                        {ingredient.description || 'Chưa có mô tả riêng cho thành phần này.'}
                      </span>
                    </m.li>
                  ))}
                </ol>
              </>
            ) : id === 'sources' ? (
              <>
                <p className="fr-story__text">
                  Mô tả catalogue có thể được nhập tay hoặc hỗ trợ bởi AI; không được coi là nguồn
                  kiểm chứng lịch sử. Các liên kết dưới đây là điểm đọc thêm, chưa kiểm chứng trực
                  tiếp trong lần biên tập này và không được dùng làm trích dẫn chứng minh từng nhận
                  định.
                </p>
                <ul className="fr-story-sources">
                  {narrative.sources.map((source) => (
                    <li key={source.label}>
                      {source.url ? (
                        <a href={source.url} target="_blank" rel="noopener noreferrer">
                          {source.label} <span className="fr-source-external">(mở tab mới)</span>
                        </a>
                      ) : (
                        <span>{source.label}</span>
                      )}
                      <small>
                        {source.status === 'not-checked'
                          ? 'Chưa kiểm chứng trực tiếp · nguồn tổng quan thứ cấp'
                          : 'Dữ liệu đang hiển thị trong ứng dụng · không phải nguồn lịch sử'}
                      </small>
                    </li>
                  ))}
                </ul>
                {narrative.sources.length === 1 && (
                  <p className="fr-story__text">
                    Chưa có nguồn tham khảo bên ngoài được gắn riêng cho món này.
                  </p>
                )}
              </>
            ) : (
              <>
                {narrative[id].map((paragraph, i) => (
                  <p className="fr-story__text" key={i}>
                    {paragraph}
                  </p>
                ))}
                {id === 'tasting' && (
                  <div className="fr-narrative__flavor">
                    <h4>Hồ sơ vị từ catalogue</h4>
                    <FlavorProfile flavor={dish.flavor} />
                  </div>
                )}
              </>
            )}
          </m.section>
        ))}
      </div>
    </>
  );
}
