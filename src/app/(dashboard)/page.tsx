'use client';

import { useAppStore } from '@/store/useAppStore';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAccounts } from '@/hooks/useAccounts';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  Calendar,
  Wallet,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Target,
  Percent
} from 'lucide-react';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const { activeAccount } = useAppStore();
  const { analytics, isLoading } = useAnalytics(activeAccount?.id || null);
  const { useAccountRules } = useAccounts();
  
  // Load compliance rules
  const { data: rules, isLoading: isLoadingRules } = useAccountRules(activeAccount?.id || '');

  // Formatting currency helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: activeAccount?.currency || 'USD'
    }).format(val);
  };

  // Generate 28-day performance calendar heatmap mock data linked to actual daily PnLs
  const renderCalendar = () => {
    const days = [];
    const now = new Date();
    
    // Create past 28 days
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const pnl = (analytics.calendarData as Record<string, number>)[key] || 0;
      days.push({
        date: d.getDate(),
        dayName: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
        pnl,
        key
      });
    }

    return (
      <div className={styles.calendarContainer}>
        {/* Heatmap header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((h, i) => (
            <div key={i} className={styles.dayHeader}>{h}</div>
          ))}
        </div>
        {/* Heatmap grid */}
        <div className={styles.calendarGrid}>
          {days.map((day, idx) => (
            <div 
              key={idx}
              className={`${styles.calendarDay} ${
                day.pnl > 0 ? styles.dayProfit : 
                day.pnl < 0 ? styles.dayLoss : styles.dayNeutral
              }`}
              title={`${day.key}: ${formatCurrency(day.pnl)}`}
            >
              {day.date}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!activeAccount) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-secondary)' }}>
        <Wallet size={48} style={{ marginBottom: '16px', color: 'var(--accent-primary)' }} />
        <h2 style={{ color: 'var(--text-primary)' }}>Welcome to TradeOS!</h2>
        <p style={{ marginTop: '8px', maxWidth: '400px', textAlign: 'center' }}>
          Please select an active trading account in the sidebar or create a new one to unlock compliance tracking and performance metrics!
        </p>
      </div>
    );
  }

  const startingSize = Number(activeAccount.starting_balance);
  const currentSize = Number(activeAccount.current_balance);
  const netDiff = currentSize - startingSize;
  const netDiffPercent = (netDiff / startingSize) * 100;

  // Calculate current drawdown curve details
  const currentDrawdown = analytics.drawdownCurve.length > 0
    ? analytics.drawdownCurve[analytics.drawdownCurve.length - 1].drawdown
    : 0;

  const isChallengeOrFunded = activeAccount.account_type === 'challenge' || activeAccount.account_type === 'funded';

  return (
    <div className={styles.container}>
      {/* Title block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.05em' }}>
            {activeAccount.broker} • {activeAccount.account_type.toUpperCase()}
          </span>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginTop: '2px' }}>
            {activeAccount.name} Dashboard
          </h1>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Current Account Equity</span>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)' }}>
            {formatCurrency(currentSize)}
          </h2>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Net Profit</span>
          <span className={`${styles.statValue} ${netDiff >= 0 ? styles.profitText : styles.lossText}`}>
            {netDiff >= 0 ? '+' : ''}{formatCurrency(netDiff)}
          </span>
          <span className={`${styles.statMeta} ${netDiff >= 0 ? styles.profitText : styles.lossText}`}>
            {netDiff >= 0 ? '+' : ''}{netDiffPercent.toFixed(2)}%
          </span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Win Rate</span>
          <span className={styles.statValue}>
            {analytics.winRate.toFixed(1)}%
          </span>
          <span className={styles.statMeta} style={{ color: 'var(--text-tertiary)' }}>
            {analytics.totalTrades} closed trades
          </span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Profit Factor</span>
          <span className={styles.statValue}>
            {analytics.profitFactor.toFixed(2)}
          </span>
          <span className={styles.statMeta} style={{ color: analytics.profitFactor >= 1.5 ? 'var(--accent-profit)' : 'var(--text-tertiary)' }}>
            {analytics.profitFactor >= 1.5 ? 'Strong ratio' : 'Standard'}
          </span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Avg R:R Ratio</span>
          <span className={styles.statValue}>
            {analytics.avgRR.toFixed(2)}R
          </span>
          <span className={styles.statMeta} style={{ color: 'var(--text-tertiary)' }}>
            Per trade target
          </span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Expectancy</span>
          <span className={`${styles.statValue} ${analytics.expectancy >= 0 ? styles.profitText : styles.lossText}`}>
            {analytics.expectancy >= 0 ? '+' : ''}{formatCurrency(analytics.expectancy)}
          </span>
          <span className={styles.statMeta} style={{ color: 'var(--text-tertiary)' }}>
            PnL expectance per execution
          </span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Best Streak</span>
          <span className={styles.statValue} style={{ color: 'var(--accent-profit)' }}>
            {analytics.longestWinStreak} Wins
          </span>
          <span className={styles.statMeta} style={{ color: 'var(--text-tertiary)' }}>
            Max consecutive wins
          </span>
        </div>
      </div>

      {/* Prop Firm Compliance Section */}
      {isChallengeOrFunded && rules && (
        <div className={styles.chartCard} style={{ borderColor: 'var(--border-secondary)', padding: '20px' }}>
          <div className={styles.chartTitle} style={{ justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontWeight: 800 }}>Prop Firm Compliance Monitor</span>
            </div>
            <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-primary)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
              All Rules Active
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginTop: '8px' }}>
            {/* Grid metrics for rules */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              
              {/* Rule 1: Daily Drawdown limit vs current */}
              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  <span>Daily Drawdown Limit</span>
                  <span style={{ color: 'var(--accent-danger)' }}>Max {rules.daily_drawdown_percent}%</span>
                </div>
                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px' }}>
                  {currentDrawdown.toFixed(2)}% Drawdown
                </div>
                {/* Visual gauge */}
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden', marginTop: '12px' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${Math.min((currentDrawdown / Number(rules.daily_drawdown_percent)) * 100, 100)}%`,
                      background: currentDrawdown > Number(rules.daily_drawdown_percent) * 0.8 ? 'var(--accent-danger)' : 'var(--accent-primary)'
                    }} 
                  />
                </div>
              </div>

              {/* Rule 2: Max Drawdown */}
              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  <span>Max Drawdown Limit</span>
                  <span style={{ color: 'var(--accent-danger)' }}>Max {rules.max_drawdown_percent}%</span>
                </div>
                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px' }}>
                  {currentDrawdown.toFixed(2)}% Drawdown
                </div>
                {/* Visual gauge */}
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden', marginTop: '12px' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${Math.min((currentDrawdown / Number(rules.max_drawdown_percent)) * 100, 100)}%`,
                      background: currentDrawdown > Number(rules.max_drawdown_percent) * 0.8 ? 'var(--accent-danger)' : 'var(--accent-primary)'
                    }} 
                  />
                </div>
              </div>

              {/* Rule 3: Profit Target (only for challenges) */}
              {activeAccount.account_type === 'challenge' && (
                <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    <span>Profit Target Progress</span>
                    <span style={{ color: 'var(--accent-primary)' }}>Goal {rules.profit_target_percent}%</span>
                  </div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: netDiff >= 0 ? 'var(--accent-profit)' : 'var(--text-secondary)', marginTop: '8px' }}>
                    {netDiffPercent.toFixed(2)}% / {rules.profit_target_percent}%
                  </div>
                  {/* Visual gauge */}
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden', marginTop: '12px' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${Math.min(Math.max((netDiffPercent / Number(rules.profit_target_percent)) * 100, 0), 100)}%`,
                        background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))'
                      }} 
                    />
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Main Charts Grid */}
      <div className={styles.chartsGrid}>
        {/* Left Widget: Cumulative Equity Curve Area Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>
            <TrendingUp size={18} style={{ color: 'var(--accent-primary)' }} />
            <span>Cumulative Account Equity Curve</span>
          </div>

          <div className={styles.chartContainer}>
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
                Loading curve details...
              </div>
            ) : analytics.equityCurve.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
                Equity will compile once trades are logged!
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.equityCurve}>
                  <defs>
                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="var(--text-tertiary)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-tertiary)" fontSize={10} tickLine={false} domain={['dataMin - 1000', 'dataMax + 1000']} tickFormatter={(val) => `$${val}`} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)', borderRadius: '8px', color: 'var(--text-primary)' }} 
                    formatter={(val) => [formatCurrency(Number(val)), 'Balance']}
                  />
                  <Area type="monotone" dataKey="balance" stroke="var(--accent-primary)" strokeWidth={2} fillOpacity={1} fill="url(#equityGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Widget: Calendar heatmap + Monthly bar */}
        <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
          {/* Performance Heatmap */}
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>
              <Calendar size={18} style={{ color: 'var(--accent-secondary)' }} />
              <span>Performance Calendar</span>
            </div>
            {isLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading calendar...</div>
            ) : (
              renderCalendar()
            )}
          </div>

          {/* Monthly PnL Bar Chart */}
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>
              <Activity size={18} style={{ color: 'var(--accent-warning)' }} />
              <span>Monthly Performance Breakdown</span>
            </div>
            
            <div className={styles.chartContainer} style={{ height: '140px' }}>
              {isLoading ? (
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading monthly...</div>
              ) : analytics.monthlyPerformance.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
                  Breakdowns will populate dynamically monthly!
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.monthlyPerformance}>
                    <XAxis dataKey="name" stroke="var(--text-tertiary)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--text-tertiary)" fontSize={10} tickLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip 
                      contentStyle={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)', borderRadius: '8px' }} 
                      formatter={(val) => [formatCurrency(Number(val)), 'Net PnL']}
                    />
                    <Bar dataKey="pnl" fill="var(--accent-secondary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
