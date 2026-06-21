import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initAppCheck } from './api/appCheck';

async function bootstrap() {
  if (import.meta.env.DEV && !import.meta.env.VITE_USE_REMOTE_API) {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }

  // No-ops unless the Firebase/reCAPTCHA env vars are configured at build time.
  await initAppCheck();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap();
