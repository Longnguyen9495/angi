import { useEffect } from 'react';
import { t } from '../../i18n';
import FarmScene from './FarmScene';

/** /farm-animation-test — the living farm on its own, full screen (default settings). */
export function FarmAnimationTest() {
  useEffect(() => {
    document.title = t.farm.anim.title;
  }, []);
  return (
    <div className="fa-root">
      <FarmScene className="fa-scene--full" />
    </div>
  );
}
