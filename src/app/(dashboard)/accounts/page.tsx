'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Wallet, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Check, 
  X, 
  Edit3, 
  Activity, 
  Award, 
  Sliders,
  DollarSign,
  TrendingUp,
  Percent
} from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { useAppStore } from '@/store/useAppStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import styles from './accounts.module.css';

import { Suspense } from 'react';

// Schema for Account Form
const accountFormSchema = zod.object({
  name: zod.string().min(3, 'Name must be at least 3 characters'),
  account_type: zod.enum(['personal', 'challenge', 'funded']),
  broker: zod.string().min(2, 'Broker must be at least 2 characters'),
  starting_balance: zod.number().min(100, 'Starting balance must be at least $100'),
  currency: zod.string()
});

type AccountFormInput = zod.infer<typeof accountFormSchema>;

function AccountsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const { 
    accounts, 
    isLoading, 
    createAccount, 
    deleteAccount, 
    useAccountRules, 
    updateRules,
    setActiveAccount
  } = useAccounts();

  const { activeAccount, setActiveAccountId } = useAppStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [rulesAccountId, setRulesAccountId] = useState<string | null>(null);

  // Read query params for "new=true" to trigger modal automatically
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setModalOpen(true);
      // Clean up the URL
      router.replace('/accounts');
    }
  }, [searchParams, router]);

  // Hook Form setup
  const { 
    register, 
    handleSubmit, 
    reset, 
    formState: { errors, isSubmitting } 
  } = useForm<AccountFormInput>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      currency: 'USD',
      starting_balance: 10000
    }
  });

  // Query rules for the account currently selected for editing rules
  const { data: currentRules, isLoading: isLoadingRules } = useAccountRules(rulesAccountId || '');

  // Rules form states
  const [profitTarget, setProfitTarget] = useState(8);
  const [dailyDD, setDailyDD] = useState(5);
  const [maxDD, setMaxDD] = useState(10);
  const [minDays, setMinDays] = useState(5);
  const [consistencyEnabled, setConsistencyEnabled] = useState(false);
  const [consistencyPercent, setConsistencyPercent] = useState(33);
  const [maxRisk, setMaxRisk] = useState(2);
  const [maxOpen, setMaxOpen] = useState(5);

  // Sync rules states when database rules load
  useEffect(() => {
    if (currentRules) {
      setProfitTarget(Number(currentRules.profit_target_percent || 8));
      setDailyDD(Number(currentRules.daily_drawdown_percent || 5));
      setMaxDD(Number(currentRules.max_drawdown_percent || 10));
      setMinDays(Number(currentRules.minimum_trading_days || 5));
      setConsistencyEnabled(!!currentRules.consistency_enabled);
      setConsistencyPercent(Number(currentRules.consistency_percent || 33));
      setMaxRisk(Number(currentRules.max_risk_per_trade_percent || 2));
      setMaxOpen(Number(currentRules.max_open_trades || 5));
    }
  }, [currentRules]);

  // Handle account insertion
  const onSubmitAccount = async (data: AccountFormInput) => {
    try {
      const defaultRules = data.account_type !== 'personal' ? {
        profit_target_percent: data.account_type === 'challenge' ? 8 : 0,
        daily_drawdown_percent: 5,
        max_drawdown_percent: 10,
        minimum_trading_days: 5,
        consistency_enabled: false,
        consistency_percent: 33,
        max_risk_per_trade_percent: 2,
        max_open_trades: 5
      } : undefined;

      await createAccount({
        account: {
          name: data.name,
          account_type: data.account_type,
          broker: data.broker,
          starting_balance: data.starting_balance,
          currency: data.currency,
          is_active: accounts.length === 0 // Active by default if it's the first
        } as any,
        rules: defaultRules
      });
      
      reset();
      setModalOpen(false);
    } catch (e) {}
  };

  // Handle rules update
  const handleSaveRules = async () => {
    if (!rulesAccountId) return;
    try {
      await updateRules({
        accountId: rulesAccountId,
        updates: {
          profit_target_percent: profitTarget,
          daily_drawdown_percent: dailyDD,
          max_drawdown_percent: maxDD,
          minimum_trading_days: minDays,
          consistency_enabled: consistencyEnabled,
          consistency_percent: consistencyPercent,
          max_risk_per_trade_percent: maxRisk,
          max_open_trades: maxOpen
        }
      });
      setRulesAccountId(null);
    } catch (e) {}
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this account? All associated trades and logs will be permanently deleted.')) {
      await deleteAccount(id);
      if (activeAccount?.id === id) {
        setActiveAccountId('');
      }
    }
  };

  const formatCurrency = (val: number, curr = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr
    }).format(val);
  };

  return (
    <div>
      <div className={styles.titleSection}>
        <div>
          <h1 className={styles.title}>Accounts Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
            Configure trading accounts and prop firm rules.
          </p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          <span>New Account</span>
        </button>
      </div>

      <div className={styles.container}>
        {/* Left Side: Accounts List */}
        <div className={styles.card}>
          <div className={styles.rulesSectionHeader}>
            <Wallet size={20} style={{ color: 'var(--accent-primary)' }} />
            <span>Active Trading Accounts</span>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
              Loading accounts...
            </div>
          ) : accounts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
              No accounts registered. Click "New Account" to begin!
            </div>
          ) : (
            <div className={styles.accountsGrid}>
              {accounts.map((acc) => {
                const isActive = activeAccount?.id === acc.id;
                const isPersonal = acc.account_type === 'personal';
                const starting = Number(acc.starting_balance);
                const current = Number(acc.current_balance);
                const diff = current - starting;
                const percent = (current / starting) * 100;

                return (
                  <div 
                    key={acc.id} 
                    className={`${styles.accountCard} ${isActive ? styles.accountCardActive : ''}`}
                  >
                    <div className={styles.accountMain}>
                      <div className={styles.accountNameBlock}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={styles.accountTitle}>{acc.name}</span>
                          <span className={`${styles.badge} ${
                            acc.account_type === 'personal' ? styles.badgePersonal : 
                            acc.account_type === 'challenge' ? styles.badgeChallenge : styles.badgeFunded
                          }`}>
                            {acc.account_type}
                          </span>
                        </div>
                        <span className={styles.accountMeta}>
                          <span>{acc.broker}</span>
                          <span>•</span>
                          <span>Size: {formatCurrency(starting, acc.currency)}</span>
                        </span>
                      </div>

                      <div className={styles.balanceBlock}>
                        <span className={styles.balanceVal}>{formatCurrency(current, acc.currency)}</span>
                        <span className={`${styles.accountMeta} ${diff >= 0 ? styles.profitText : styles.lossText}`} style={{ alignSelf: 'flex-end', fontWeight: 600 }}>
                          {diff >= 0 ? '+' : ''}{formatCurrency(diff, acc.currency)} ({((diff / starting) * 100).toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    {/* Progress representation */}
                    <div className={styles.progressContainer}>
                      <div className={styles.progressLabel}>
                        <span>Equity Curve Progress</span>
                        <span>{percent.toFixed(1)}%</span>
                      </div>
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressFill} 
                          style={{ 
                            width: `${Math.min(Math.max(percent, 0), 100)}%`,
                            background: diff >= 0 ? 'linear-gradient(90deg, #10b981, #06b6d4)' : 'linear-gradient(90deg, #ef4444, #f59e0b)'
                          }} 
                        />
                      </div>
                    </div>

                    {/* Actions block */}
                    <div className={styles.actionsBlock}>
                      {!isActive && (
                        <button 
                          className={styles.btnSecondary}
                          style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                          onClick={() => setActiveAccount(acc.id)}
                        >
                          Set Active
                        </button>
                      )}
                      {!isPersonal && (
                        <button 
                          className={styles.btnSecondary}
                          style={{ padding: '4px 10px', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setRulesAccountId(acc.id)}
                        >
                          <Sliders size={12} />
                          <span>Prop Rules</span>
                        </button>
                      )}
                      <button 
                        className={styles.btnDanger}
                        style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                        onClick={() => handleDelete(acc.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Prop Rules Configuration (shows when setRulesAccountId is active) */}
        <div>
          {rulesAccountId ? (
            <div className={styles.card}>
              <div className={styles.rulesSectionHeader}>
                <Sliders size={20} style={{ color: 'var(--accent-warning)' }} />
                <span>Configure Prop Firm Rules</span>
              </div>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginBottom: '16px' }}>
                Set compliance targets for account: <strong style={{ color: 'var(--text-primary)' }}>{accounts.find(a => a.id === rulesAccountId)?.name}</strong>
              </p>

              {isLoadingRules ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  Loading rules...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className={styles.ruleFormGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Profit Target (%)</label>
                      <input 
                        type="number" 
                        className={styles.input} 
                        value={profitTarget} 
                        onChange={(e) => setProfitTarget(Number(e.target.value))} 
                        placeholder="8"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Daily Drawdown Limit (%)</label>
                      <input 
                        type="number" 
                        className={styles.input} 
                        value={dailyDD} 
                        onChange={(e) => setDailyDD(Number(e.target.value))}
                        placeholder="5"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Max Drawdown Limit (%)</label>
                      <input 
                        type="number" 
                        className={styles.input} 
                        value={maxDD} 
                        onChange={(e) => setMaxDD(Number(e.target.value))}
                        placeholder="10"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Min Trading Days</label>
                      <input 
                        type="number" 
                        className={styles.input} 
                        value={minDays} 
                        onChange={(e) => setMinDays(Number(e.target.value))}
                        placeholder="5"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Max Risk Per Trade (%)</label>
                      <input 
                        type="number" 
                        step="0.1" 
                        className={styles.input} 
                        value={maxRisk} 
                        onChange={(e) => setMaxRisk(Number(e.target.value))}
                        placeholder="2"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Max Open Trades</label>
                      <input 
                        type="number" 
                        className={styles.input} 
                        value={maxOpen} 
                        onChange={(e) => setMaxOpen(Number(e.target.value))}
                        placeholder="5"
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.checkboxContainer}>
                      <input 
                        type="checkbox" 
                        className={styles.checkbox}
                        checked={consistencyEnabled}
                        onChange={(e) => setConsistencyEnabled(e.target.checked)}
                      />
                      <span>Enable Consistency Rule (Largest Win Day limit)</span>
                    </label>
                  </div>

                  {consistencyEnabled && (
                    <div className={styles.formGroup} style={{ maxWidth: '200px' }}>
                      <label className={styles.label}>Consistency Maximum %</label>
                      <input 
                        type="number" 
                        className={styles.input} 
                        value={consistencyPercent} 
                        onChange={(e) => setConsistencyPercent(Number(e.target.value))}
                        placeholder="33"
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                    <button className={styles.btnPrimary} onClick={handleSaveRules}>
                      <Check size={16} />
                      <span>Save Rules</span>
                    </button>
                    <button className={styles.btnSecondary} onClick={() => setRulesAccountId(null)}>
                      <X size={16} />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', color: 'var(--text-tertiary)', borderStyle: 'dashed' }}>
              <ShieldAlert size={40} style={{ marginBottom: '12px', color: 'var(--text-tertiary)' }} />
              <span>Select "Prop Rules" on a challenge/funded account to configure compliance tracking parameters.</span>
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Add Trading Account</span>
              <button className={styles.modalClose} onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmitAccount)}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Account Name</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    placeholder="e.g. FTMO 100k, Personal" 
                    {...register('name')}
                  />
                  {errors.name && <span style={{ color: 'var(--accent-danger)', fontSize: 'var(--text-xs)' }}>{errors.name.message}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Account Type</label>
                  <select className={styles.select} {...register('account_type')}>
                    <option value="personal">Personal Account</option>
                    <option value="challenge">Challenge / Evaluation Phase</option>
                    <option value="funded">Funded Account</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Broker / Platform</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    placeholder="e.g. FTMO, FundingPips, IC Markets" 
                    {...register('broker')}
                  />
                  {errors.broker && <span style={{ color: 'var(--accent-danger)', fontSize: 'var(--text-xs)' }}>{errors.broker.message}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Starting Account Balance ($)</label>
                  <input 
                    type="number" 
                    className={styles.input} 
                    placeholder="10000" 
                    {...register('starting_balance', { valueAsNumber: true })}
                  />
                  {errors.starting_balance && <span style={{ color: 'var(--accent-danger)', fontSize: 'var(--text-xs)' }}>{errors.starting_balance.message}</span>}
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button 
                  type="button" 
                  className={styles.btnSecondary} 
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={styles.btnPrimary} 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Accounts Workspace...</div>}>
      <AccountsDashboard />
    </Suspense>
  );
}
