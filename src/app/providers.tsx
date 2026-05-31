'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState, type ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#171717',
            color: '#FAFAFA',
            border: '1px solid #262626',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            backdropFilter: 'blur(12px)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#0A0A0A',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#0A0A0A',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}
