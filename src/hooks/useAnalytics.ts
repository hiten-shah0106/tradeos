'use client';

import { useMemo } from 'react';
import { useTrades } from './useTrades';
import { calculateAnalytics } from '@/lib/analytics/calculator';

export function useAnalytics(accountId: string | null) {
  const { trades, isLoading } = useTrades(accountId);

  const analytics = useMemo(() => {
    return calculateAnalytics(trades || []);
  }, [trades]);

  return {
    analytics,
    isLoading
  };
}

