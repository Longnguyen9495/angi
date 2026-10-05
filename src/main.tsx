import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@fontsource-variable/fraunces/index.css';
import './styles/index.css';
import './features/food-reel/styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { EmptyCatalogue } from './features/food-reel/EmptyCatalogue';
import { loadLiveCatalogue } from './features/food-reel/data/reelCatalogue';
import { FeedbackProvider } from './state/FeedbackProvider';
import { GameProvider } from './state/GameProvider';

const root = createRoot(document.getElementById('root')!);

if (window.location.pathname.replace(/\/$/, '') === '/promo-demo') {
  const { PromoDemo } = await import('./features/promo/PromoDemo');
  root.render(
    <StrictMode>
      <PromoDemo />
    </StrictMode>,
  );
} else if (window.location.pathname.replace(/\/$/, '') === '/farm-animation-test') {
  // Standalone animation demo of the floating farm: no catalogue, no game state.
  const { FarmAnimationTest } = await import('./features/farm-anim/FarmAnimationTest');
  root.render(
    <StrictMode>
      <FarmAnimationTest />
    </StrictMode>,
  );
} else {
  // The dish catalogue comes from the database (/api/dishes); if the API is slow or
  // down, the bundled snapshot is used instead. An empty database shows an empty state.
  const source = await loadLiveCatalogue();

  root.render(
    <StrictMode>
      {source === 'empty' ? (
        <EmptyCatalogue />
      ) : (
        <GameProvider>
          <FeedbackProvider>
            <App />
          </FeedbackProvider>
        </GameProvider>
      )}
    </StrictMode>,
  );
}
