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
import { loadLiveCatalogue } from './features/food-reel/data/reelCatalogue';
import { FeedbackProvider } from './state/FeedbackProvider';
import { GameProvider } from './state/GameProvider';

// The dish catalogue comes from the database (/api/dishes); if the API is slow or
// down, the bundled snapshot is used instead so the reel always opens.
await loadLiveCatalogue();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </GameProvider>
  </StrictMode>,
);
