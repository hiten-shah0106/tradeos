import { Database } from '@/types/database';

type Trade = Database['public']['Tables']['trades']['Row'];

export interface AnalyticsResult {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  avgRR: number;
  expectancy: number;
  totalProfit: number;
  longestWinStreak: number;
  longestLossStreak: number;
  equityCurve: Array<{ name: string; balance: number; pnl: number }>;
  drawdownCurve: Array<{ name: string; drawdown: number }>;
  monthlyPerformance: Array<{ name: string; pnl: number }>;
  calendarData: Record<string, number>;
  winRateTrend: Array<{ name: string; rate: number }>;
  symbolBreakdown: Array<{
    symbol: string;
    trades: number;
    winRate: number;
    netProfit: number;
    avgRR: number;
  }>;
}

export function calculateAnalytics(trades: Trade[]): AnalyticsResult {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      profitFactor: 0,
      avgRR: 0,
      expectancy: 0,
      totalProfit: 0,
      longestWinStreak: 0,
      longestLossStreak: 0,
      equityCurve: [],
      drawdownCurve: [],
      monthlyPerformance: [],
      calendarData: {},
      winRateTrend: [],
      symbolBreakdown: []
    };
  }

  // Sort trades chronologically to build cumulative metrics correctly
  const chronologicalTrades = [...trades].sort((a, b) => 
    new Date(a.open_timestamp).getTime() - new Date(b.open_timestamp).getTime()
  );

  const closedTrades = chronologicalTrades.filter(t => t.status === 'CLOSED' || t.status === 'PARTIAL');
  const totalTrades = closedTrades.length;

  let wins = 0;
  let losses = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let totalRR = 0;
  
  // Streaks
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;

  // Equity Curve starting setup (default starting size of 100k)
  const startingBalance = 100000;
    
  let runningBalance = startingBalance;
  const equityCurve: Array<{ name: string; balance: number; pnl: number }> = [];
  const drawdownCurve: Array<{ name: string; drawdown: number }> = [];
  
  let peakBalance = startingBalance;

  // Monthly & Calendar aggregations
  const monthlyPnL: Record<string, number> = {};
  const calendarData: Record<string, number> = {}; // YYYY-MM-DD -> PnL
  
  // Symbol breakdowns
  const symbolBreakdown: Record<string, { trades: number; wins: number; pnl: number; rrSum: number }> = {};

  // Win rate trends tracking
  const winRateTrend: Array<{ name: string; rate: number }> = [];

  closedTrades.forEach((t, index) => {
    const pnl = Number(t.pnl || 0);
    const isWin = pnl > 0;
    const rr = Number(t.rr_ratio || 0);

    // Calculations
    if (isWin) {
      wins++;
      grossProfit += pnl;
      currentWinStreak++;
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
      currentLossStreak = 0;
    } else if (pnl < 0) {
      losses++;
      grossLoss += Math.abs(pnl);
      currentLossStreak++;
      longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
      currentWinStreak = 0;
    }

    totalRR += rr;

    // Symbol evaluation
    if (!symbolBreakdown[t.symbol]) {
      symbolBreakdown[t.symbol] = { trades: 0, wins: 0, pnl: 0, rrSum: 0 };
    }
    symbolBreakdown[t.symbol].trades++;
    symbolBreakdown[t.symbol].pnl += pnl;
    symbolBreakdown[t.symbol].rrSum += rr;
    if (isWin) symbolBreakdown[t.symbol].wins++;

    // Balance curves
    runningBalance += pnl;
    const dateLabel = new Date(t.open_timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    equityCurve.push({
      name: dateLabel,
      balance: runningBalance,
      pnl: pnl
    });

    // Peak drawdown checks
    if (runningBalance > peakBalance) {
      peakBalance = runningBalance;
    }
    const currentDrawdownPercent = ((peakBalance - runningBalance) / peakBalance) * 100;
    drawdownCurve.push({
      name: dateLabel,
      drawdown: currentDrawdownPercent
    });

    // Monthly aggregations
    const dateObj = new Date(t.open_timestamp);
    const monthLabel = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
    monthlyPnL[monthLabel] = (monthlyPnL[monthLabel] || 0) + pnl;

    // Calendar heatmap aggregations
    const calendarKey = dateObj.toISOString().split('T')[0];
    calendarData[calendarKey] = (calendarData[calendarKey] || 0) + pnl;

    // Running Win Rate trend
    const runningWinRate = index + 1 > 0 ? (wins / (index + 1)) * 100 : 0;
    winRateTrend.push({
      name: dateLabel,
      rate: runningWinRate
    });
  });

  // Formatting monthly performance array
  const monthlyPerformance = Object.keys(monthlyPnL).map(key => ({
    name: key,
    pnl: monthlyPnL[key]
  }));

  // Math metrics
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;
  const avgRR = totalTrades > 0 ? totalRR / totalTrades : 0;
  
  const avgWin = wins > 0 ? grossProfit / wins : 0;
  const avgLoss = losses > 0 ? grossLoss / losses : 0;
  const expectancy = (winRate / 100 * avgWin) - ((100 - winRate) / 100 * avgLoss);

  // Format Symbol details
  const formattedSymbols = Object.keys(symbolBreakdown).map(sym => {
    const details = symbolBreakdown[sym];
    return {
      symbol: sym,
      trades: details.trades,
      winRate: (details.wins / details.trades) * 100,
      netProfit: details.pnl,
      avgRR: details.rrSum / details.trades
    };
  }).sort((a, b) => b.netProfit - a.netProfit);

  return {
    totalTrades,
    winRate,
    profitFactor,
    avgRR,
    expectancy,
    totalProfit: grossProfit - grossLoss,
    longestWinStreak,
    longestLossStreak,
    equityCurve,
    drawdownCurve,
    monthlyPerformance,
    calendarData,
    winRateTrend,
    symbolBreakdown: formattedSymbols
  };
}
