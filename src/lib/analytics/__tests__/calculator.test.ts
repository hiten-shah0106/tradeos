import { describe, it, expect } from 'vitest';
import { calculateAnalytics } from '../calculator';
import { Database } from '@/types/database';

type Trade = Database['public']['Tables']['trades']['Row'];

// Helper to construct a partial mock Trade
function createMockTrade(overrides: Partial<Trade>): Trade {
  return {
    id: 'trade-uuid',
    account_id: 'account-uuid',
    user_id: 'user-uuid',
    symbol: 'EURUSD',
    direction: 'BUY',
    entry_price: 1.1000,
    exit_price: 1.1100,
    stop_loss: 1.0950,
    take_profit: 1.1200,
    lot_size: 1.0,
    open_timestamp: '2026-05-30T10:00:00Z',
    close_timestamp: '2026-05-30T11:00:00Z',
    status: 'CLOSED',
    pnl: 100,
    rr_ratio: 2.0,
    notes: 'Mock trade note',
    created_at: '2026-05-30T10:00:00Z',
    updated_at: '2026-05-30T11:00:00Z',
    ...overrides
  };
}

describe('calculateAnalytics', () => {
  it('should return empty metrics when no trades are provided', () => {
    const result = calculateAnalytics([]);
    expect(result.totalTrades).toBe(0);
    expect(result.winRate).toBe(0);
    expect(result.profitFactor).toBe(0);
    expect(result.totalProfit).toBe(0);
    expect(result.longestWinStreak).toBe(0);
    expect(result.longestLossStreak).toBe(0);
    expect(result.equityCurve).toEqual([]);
    expect(result.drawdownCurve).toEqual([]);
    expect(result.monthlyPerformance).toEqual([]);
    expect(result.calendarData).toEqual({});
  });

  it('should filter out open trades and only analyze closed/partial status', () => {
    const trades = [
      createMockTrade({ status: 'OPEN', pnl: 50 }),
      createMockTrade({ status: 'CLOSED', pnl: 100 }),
      createMockTrade({ status: 'PARTIAL', pnl: 50 })
    ];
    const result = calculateAnalytics(trades);
    expect(result.totalTrades).toBe(2);
    expect(result.totalProfit).toBe(150);
  });

  it('should sort trades chronologically by open_timestamp prior to running calculations', () => {
    const trades = [
      createMockTrade({ open_timestamp: '2026-05-30T12:00:00Z', pnl: -100 }),
      createMockTrade({ open_timestamp: '2026-05-30T10:00:00Z', pnl: 200 })
    ];
    const result = calculateAnalytics(trades);
    // Chronological order: 200 then -100
    // Cumulative Balance starts at 100,000
    // After first trade (+200) = 100,200
    // After second trade (-100) = 100,100
    expect(result.equityCurve[0].pnl).toBe(200);
    expect(result.equityCurve[0].balance).toBe(100200);
    expect(result.equityCurve[1].pnl).toBe(-100);
    expect(result.equityCurve[1].balance).toBe(100100);
  });

  it('should accurately calculate win rate and profit factor ratios', () => {
    const trades = [
      createMockTrade({ pnl: 150 }), // Win 1
      createMockTrade({ pnl: 100 }), // Win 2
      createMockTrade({ pnl: -50 }),  // Loss 1
      createMockTrade({ pnl: -100 })  // Loss 2
    ];
    const result = calculateAnalytics(trades);
    
    // Total: 4 trades, 2 wins, 2 losses -> Win Rate: 50%
    expect(result.totalTrades).toBe(4);
    expect(result.winRate).toBe(50);
    
    // Gross Profit: 250, Gross Loss: 150 -> PF: 250 / 150 = 1.67
    expect(result.profitFactor).toBeCloseTo(1.67, 2);
    expect(result.totalProfit).toBe(100);
  });

  it('should correctly calculate longest win and loss streaks', () => {
    const trades = [
      createMockTrade({ pnl: 10 }), // Win
      createMockTrade({ pnl: 20 }), // Win
      createMockTrade({ pnl: 15 }), // Win
      createMockTrade({ pnl: -5 }), // Loss
      createMockTrade({ pnl: -10 }), // Loss
      createMockTrade({ pnl: 5 }), // Win
      createMockTrade({ pnl: -8 })  // Loss
    ];
    const result = calculateAnalytics(trades);
    
    // Wins: 3 consecutive, 1 single -> longest streak = 3
    expect(result.longestWinStreak).toBe(3);
    
    // Losses: 2 consecutive, 1 single -> longest streak = 2
    expect(result.longestLossStreak).toBe(2);
  });

  it('should track peak balance drawdowns correctly', () => {
    const trades = [
      createMockTrade({ pnl: 1000 }),  // balance: 101,000 (peak: 101,000, DD: 0%)
      createMockTrade({ pnl: -2000 }), // balance: 99,000 (peak: 101,000, DD: 2000 / 101000 = ~1.98%)
      createMockTrade({ pnl: 3000 })   // balance: 102,000 (peak: 102,000, DD: 0%)
    ];
    const result = calculateAnalytics(trades);
    
    expect(result.drawdownCurve[0].drawdown).toBe(0);
    expect(result.drawdownCurve[1].drawdown).toBeCloseTo(1.98, 2);
    expect(result.drawdownCurve[2].drawdown).toBe(0);
  });

  it('should group PnL by month and date correctly for charts', () => {
    const trades = [
      createMockTrade({ open_timestamp: '2026-05-15T10:00:00Z', pnl: 100 }),
      createMockTrade({ open_timestamp: '2026-05-15T15:00:00Z', pnl: -50 }),
      createMockTrade({ open_timestamp: '2026-06-01T10:00:00Z', pnl: 300 })
    ];
    
    const result = calculateAnalytics(trades);
    
    // Calendar Data groups by YYYY-MM-DD
    expect(result.calendarData['2026-05-15']).toBe(50);
    expect(result.calendarData['2026-06-01']).toBe(300);
    
    // Monthly performance groups by Month
    const mayPerformance = result.monthlyPerformance.find(m => m.name.includes('May'));
    const junePerformance = result.monthlyPerformance.find(m => m.name.includes('Jun'));
    
    expect(mayPerformance?.pnl).toBe(50);
    expect(junePerformance?.pnl).toBe(300);
  });

  it('should compute per-symbol breakdowns sorted by netProfit desc', () => {
    const trades = [
      createMockTrade({ symbol: 'EURUSD', pnl: 200, rr_ratio: 2.0 }),
      createMockTrade({ symbol: 'GBPUSD', pnl: 100, rr_ratio: 1.0 }),
      createMockTrade({ symbol: 'EURUSD', pnl: -50, rr_ratio: 1.0 })
    ];
    
    const result = calculateAnalytics(trades);
    
    expect(result.symbolBreakdown.length).toBe(2);
    
    // EURUSD should be first since netProfit = 150 > GBPUSD netProfit = 100
    expect(result.symbolBreakdown[0].symbol).toBe('EURUSD');
    expect(result.symbolBreakdown[0].trades).toBe(2);
    expect(result.symbolBreakdown[0].netProfit).toBe(150);
    expect(result.symbolBreakdown[0].winRate).toBe(50);
    expect(result.symbolBreakdown[0].avgRR).toBe(1.5); // (2.0 + 1.0)/2
    
    expect(result.symbolBreakdown[1].symbol).toBe('GBPUSD');
    expect(result.symbolBreakdown[1].trades).toBe(1);
    expect(result.symbolBreakdown[1].netProfit).toBe(100);
    expect(result.symbolBreakdown[1].winRate).toBe(100);
  });
});
