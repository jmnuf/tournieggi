import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import QueryProvider from './Queries.tsx';
import { ClerkProvider } from '@clerk/clerk-react';
import { env } from '../env.ts';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={env.VITE_CLERK_PUBLISHABLE_KEY}>
      <QueryProvider>
        <App />
      </QueryProvider>
    </ClerkProvider>
  </StrictMode>,
)
