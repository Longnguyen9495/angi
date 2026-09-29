import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import type { ReactNode } from 'react';
import { useGame } from '../../../state/hooks';
import { SplitLines } from '../components/SplitLines';
import type { ReelDish } from '../foodReel.types';
import { AtlasSection } from './AtlasSection';
import { CurrentMeal } from './CurrentMeal';
import { GardenSection } from './GardenSection';
import { JourneyStats } from './JourneyStats';
import { MealLog, MissionsSection } from './MissionsSection';
import { RecipesSection } from './RecipesSection';

const SECTIONS = [
  { id: 'bua-nay', label: 'Bữa này' },
  { id: 'khu-vuon', label: 'Khu vườn' },
  { id: 'cong-thuc', label: 'Công thức' },
  { id: 'ban-do', label: 'Bản đồ' },
  { id: 'nhiem-vu', label: 'Nhiệm vụ' },
] as const;

function Section({
  id,
  no,
  title,
  intro,
  children,
}: {
  id: string;
  no: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="fj-section" aria-labelledby={`${id}-title`}>
      <header className="fj-section__head">
        <span className="fj-section__no" aria-hidden="true">
          {no}
        </span>
        {/* tabIndex -1 lets reward actions jump here ("Xem khu vườn"). */}
        <h2 id={`${id}-title`} className="fj-section__title" tabIndex={-1}>
          {title}
        </h2>
        {intro && <p className="fj-section__intro">{intro}</p>}
      </header>
      {children}
    </section>
  );
}

interface JourneySceneProps {
  onBackToReel: () => void;
  onOpenDish: (dish: ReelDish) => void;
}

/**
 * The Journey: everything the guest accumulates after choosing food, in the
 * same dark, editorial language as the reel.
 */
export default function JourneyScene({ onBackToReel, onOpenDish }: JourneySceneProps) {
  const { reduced } = useGame();
  const jump = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    document.getElementById(`${id}-title`)?.focus({ preventScroll: true });
  };

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <LazyMotion features={domAnimation} strict>
        <div className="fj">
          <header className="fj-hero">
            <p className="fr-kicker">Bếp Việt · Hành trình</p>
            <SplitLines
              as="h1"
              className="fj-hero__title"
              lines={['Hành trình', 'của bạn']}
              delay={0.05}
            />
            <p className="fj-hero__lede">
              Mỗi bữa ăn thật góp một hạt giống, một con dấu và một chút tiến độ. Không có đếm
              ngược, không có cây héo — cứ thong thả.
            </p>
            <JourneyStats />
          </header>

          <nav className="fj-nav" aria-label="Mục trong Hành trình">
            {SECTIONS.map((s) => (
              <button key={s.id} type="button" className="fj-nav__item" onClick={() => jump(s.id)}>
                {s.label}
              </button>
            ))}
          </nav>

          <Section id="bua-nay" no="01" title="Bữa này">
            <CurrentMeal onSpin={onBackToReel} />
          </Section>

          <Section id="khu-vuon" no="02" title="Khu vườn">
            <GardenSection />
          </Section>

          <Section
            id="cong-thuc"
            no="03"
            title="Công thức"
            intro="Nguyên liệu thu hoạch được và cây đang lớn đều được tính. Đủ thì nấu bằng một chạm."
          >
            <RecipesSection />
          </Section>

          <Section
            id="ban-do"
            no="04"
            title="Bản đồ ẩm thực"
            intro="Mỗi món bạn gieo hạt hoặc check-in được ghi vào album của vùng đó. Chạm vào một món để đọc lại câu chuyện."
          >
            <AtlasSection onOpenDish={onOpenDish} />
          </Section>

          <Section id="nhiem-vu" no="05" title="Nhiệm vụ & nhật ký">
            <div className="fj-split">
              <div>
                <h3 className="fj-h3">Hôm nay</h3>
                <MissionsSection />
              </div>
              <div>
                <h3 className="fj-h3">Bữa gần đây</h3>
                <MealLog />
              </div>
            </div>
          </Section>
        </div>
      </LazyMotion>
    </MotionConfig>
  );
}
