'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  X, 
  SlidersHorizontal, 
  BookOpen, 
  ChevronRight, 
  Trash2, 
  TrendingUp, 
  FileImage, 
  UploadCloud, 
  ArrowUpRight, 
  Layers 
} from 'lucide-react';
import { useTrades } from '@/hooks/useTrades';
import { useAppStore } from '@/store/useAppStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import styles from './trades.module.css';

import { Suspense } from 'react';

// Schema for Trade Form
const tradeFormSchema = zod.object({
  symbol: zod.string().min(2, 'Symbol is required (e.g. XAUUSD, EURUSD)').toUpperCase(),
  direction: zod.enum(['BUY', 'SELL']),
  entry_price: zod.number().positive('Entry must be positive'),
  stop_loss: zod.number().positive('Stop loss must be positive'),
  take_profit: zod.number().positive('Take profit must be positive'),
  lot_size: zod.number().positive('Lot size must be positive'),
  status: zod.enum(['OPEN', 'CLOSED', 'PARTIAL']),
  exit_price: zod.number().optional(),
  pnl: zod.number().optional(),
  notes: zod.string().optional()
});

type TradeFormInput = zod.infer<typeof tradeFormSchema>;

function TradesDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeAccount } = useAppStore();
  
  const { 
    trades, 
    isLoading, 
    tags, 
    createTrade, 
    updateTrade, 
    deleteTrade, 
    addPartialClose, 
    uploadScreenshot, 
    createTag 
  } = useTrades(activeAccount?.id || null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Filters state
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterDirection, setFilterDirection] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Trigger modal if URL query specifies "new=true"
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setModalOpen(true);
      router.replace('/trades');
    }
  }, [searchParams, router]);

  // Hook Form setup
  const { 
    register, 
    handleSubmit, 
    reset, 
    watch,
    setValue,
    formState: { errors, isSubmitting } 
  } = useForm<TradeFormInput>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      direction: 'BUY',
      status: 'OPEN',
      entry_price: 0,
      stop_loss: 0,
      take_profit: 0,
      lot_size: 0.1
    }
  });

  const watchStatus = watch('status');

  // Load tags selection
  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  // Submit Trade
  const onSubmitTrade = async (data: TradeFormInput) => {
    try {
      // Calculate RR ratio & dummy PnL if closed and not provided
      let rr_ratio = 0;
      const entry = Number(data.entry_price);
      const sl = Number(data.stop_loss);
      const tp = Number(data.take_profit);
      
      if (entry !== sl) {
        rr_ratio = Math.abs(tp - entry) / Math.abs(entry - sl);
      }

      let calculatedPnl = data.pnl;
      if (data.status === 'CLOSED' && !calculatedPnl && data.exit_price) {
        // basic pip calculation helper - just difference for demonstration
        const exit = Number(data.exit_price);
        const directionFactor = data.direction === 'BUY' ? 1 : -1;
        calculatedPnl = (exit - entry) * directionFactor * Number(data.lot_size) * 1000; // simple standard scaler
      }

      await createTrade({
        trade: {
          symbol: data.symbol,
          direction: data.direction,
          entry_price: entry,
          stop_loss: sl,
          take_profit: tp,
          lot_size: Number(data.lot_size),
          status: data.status,
          exit_price: data.exit_price ? Number(data.exit_price) : null,
          pnl: calculatedPnl ? Number(calculatedPnl) : 0,
          rr_ratio: rr_ratio,
          notes: data.notes || '',
          open_timestamp: new Date().toISOString()
        },
        tags: selectedTags
      });

      reset();
      setSelectedTags([]);
      setModalOpen(false);
    } catch (e) {}
  };

  // Drawer selected trade details
  const selectedTrade = trades.find(t => t.id === selectedTradeId);

  // Partial close states
  const [partialLots, setPartialLots] = useState(0.01);
  const [partialPrice, setPartialPrice] = useState(0);
  const [partialPnl, setPartialPnl] = useState(0);

  const handleAddPartial = async () => {
    if (!selectedTrade) return;
    try {
      await addPartialClose({
        partial: {
          trade_id: selectedTrade.id,
          quantity: partialLots,
          close_price: partialPrice,
          pnl: partialPnl,
          closed_at: new Date().toISOString()
        }
      });
      setPartialLots(0.01);
      setPartialPrice(0);
      setPartialPnl(0);
    } catch (e) {}
  };

  // Image Upload states
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotCaption, setScreenshotCaption] = useState('');

  const handleScreenshotUpload = async () => {
    if (!selectedTrade || !screenshotFile) return;
    try {
      await uploadScreenshot({
        tradeId: selectedTrade.id,
        file: screenshotFile,
        caption: screenshotCaption
      });
      setScreenshotFile(null);
      setScreenshotCaption('');
    } catch (e) {}
  };

  const handleDeleteTrade = async (tradeId: string, pnl?: number) => {
    if (confirm('Delete this trade? This will reverse the account balance PnL impact.')) {
      await deleteTrade({ id: tradeId, pnl });
      setSelectedTradeId(null);
    }
  };

  // Client filter evaluation
  const filteredTrades = trades.filter(t => {
    const matchesSymbol = t.symbol.toLowerCase().includes(filterSymbol.toLowerCase());
    const matchesDirection = filterDirection === 'ALL' || t.direction === filterDirection;
    const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
    return matchesSymbol && matchesDirection && matchesStatus;
  });

  const formatCurrency = (val: number, curr = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: activeAccount?.currency || curr
    }).format(val);
  };

  return (
    <div className={styles.container}>
      <div className={styles.titleSection}>
        <div>
          <h1 className={styles.title}>Trading Journal</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
            Record details, scale out, upload chart setups, and tag mistakes.
          </p>
        </div>
        {activeAccount ? (
          <button className={styles.btnPrimary} onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            <span>New Trade</span>
          </button>
        ) : (
          <span style={{ color: 'var(--accent-warning)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
            Create an active account first!
          </span>
        )}
      </div>

      {/* Filters Card */}
      <div className={styles.filtersCard}>
        <div className={styles.filterGroup}>
          <label className={styles.label}>Symbol Search</label>
          <input 
            type="text" 
            className={styles.input} 
            placeholder="e.g. XAUUSD" 
            value={filterSymbol}
            onChange={(e) => setFilterSymbol(e.target.value)}
          />
        </div>
        
        <div className={styles.filterGroup}>
          <label className={styles.label}>Direction</label>
          <select 
            className={styles.select}
            value={filterDirection}
            onChange={(e) => setFilterDirection(e.target.value)}
          >
            <option value="ALL">All Directions</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>Status</label>
          <select 
            className={styles.select}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>
      </div>

      {/* Trades Table */}
      <div className={styles.tableContainer}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
            Loading trades...
          </div>
        ) : !activeAccount ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
            Please select an active account in the sidebar to view trades.
          </div>
        ) : filteredTrades.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
            No trades match the current filters. Log a new one!
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Symbol</th>
                <th className={styles.th}>Direction</th>
                <th className={styles.th}>Lot Size</th>
                <th className={styles.th}>Entry Price</th>
                <th className={styles.th}>Exit Price</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Net PnL</th>
                <th className={styles.th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map((t) => (
                <tr 
                  key={t.id} 
                  className={styles.tr}
                  onClick={() => setSelectedTradeId(t.id)}
                >
                  <td className={styles.td} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.symbol}</td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${t.direction === 'BUY' ? styles.badgeBuy : styles.badgeSell}`}>
                      {t.direction}
                    </span>
                  </td>
                  <td className={styles.td}>{Number(t.lot_size).toFixed(2)}</td>
                  <td className={styles.td}>{Number(t.entry_price).toFixed(5)}</td>
                  <td className={styles.td}>{t.exit_price ? Number(t.exit_price).toFixed(5) : '-'}</td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${
                      t.status === 'OPEN' ? styles.badgeOpen : 
                      t.status === 'PARTIAL' ? styles.badgePartial : styles.badgeClosed
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className={`${styles.td} ${Number(t.pnl) >= 0 ? styles.pnlProfit : styles.pnlLoss}`}>
                    {Number(t.pnl) >= 0 ? '+' : ''}{formatCurrency(Number(t.pnl || 0))}
                  </td>
                  <td className={styles.td}>
                    {new Date(t.open_timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Creation Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Log a Trade</span>
              <button className={styles.modalClose} onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmitTrade)}>
              <div className={styles.modalBody}>
                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Symbol</label>
                    <input 
                      type="text" 
                      className={styles.input} 
                      placeholder="e.g. EURUSD, XAUUSD"
                      {...register('symbol')}
                    />
                    {errors.symbol && <span style={{ color: 'var(--accent-danger)', fontSize: 'var(--text-xs)' }}>{errors.symbol.message}</span>}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Direction</label>
                    <select className={styles.select} {...register('direction')}>
                      <option value="BUY">BUY (Long)</option>
                      <option value="SELL">SELL (Short)</option>
                    </select>
                  </div>
                </div>

                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Entry Price</label>
                    <input 
                      type="number" 
                      step="0.00001"
                      className={styles.input} 
                      placeholder="1.08500"
                      {...register('entry_price', { valueAsNumber: true })}
                    />
                    {errors.entry_price && <span style={{ color: 'var(--accent-danger)', fontSize: 'var(--text-xs)' }}>{errors.entry_price.message}</span>}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Lot Size</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className={styles.input} 
                      placeholder="1.0"
                      {...register('lot_size', { valueAsNumber: true })}
                    />
                    {errors.lot_size && <span style={{ color: 'var(--accent-danger)', fontSize: 'var(--text-xs)' }}>{errors.lot_size.message}</span>}
                  </div>
                </div>

                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Stop Loss (SL)</label>
                    <input 
                      type="number" 
                      step="0.00001"
                      className={styles.input} 
                      placeholder="1.08200"
                      {...register('stop_loss', { valueAsNumber: true })}
                    />
                    {errors.stop_loss && <span style={{ color: 'var(--accent-danger)', fontSize: 'var(--text-xs)' }}>{errors.stop_loss.message}</span>}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Take Profit (TP)</label>
                    <input 
                      type="number" 
                      step="0.00001"
                      className={styles.input} 
                      placeholder="1.09200"
                      {...register('take_profit', { valueAsNumber: true })}
                    />
                    {errors.take_profit && <span style={{ color: 'var(--accent-danger)', fontSize: 'var(--text-xs)' }}>{errors.take_profit.message}</span>}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Status</label>
                  <select className={styles.select} {...register('status')}>
                    <option value="OPEN">OPEN (Active position)</option>
                    <option value="CLOSED">CLOSED (Settled position)</option>
                  </select>
                </div>

                {watchStatus === 'CLOSED' && (
                  <div className={styles.grid2}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Exit Price</label>
                      <input 
                        type="number" 
                        step="0.00001"
                        className={styles.input} 
                        placeholder="1.09100"
                        {...register('exit_price', { valueAsNumber: true })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Net PnL Amount ($)</label>
                      <input 
                        type="number" 
                        className={styles.input} 
                        placeholder="600"
                        {...register('pnl', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.label}>Select Tags</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                    {tags.filter(t => t.tag_type === 'user').map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={styles.tagBadge}
                        style={{ 
                          background: selectedTags.includes(t.id) ? 'var(--accent-primary-glow)' : '',
                          borderColor: selectedTags.includes(t.id) ? 'var(--accent-primary)' : '',
                          color: selectedTags.includes(t.id) ? 'var(--text-primary)' : ''
                        }}
                        onClick={() => handleTagToggle(t.id)}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Journal Entry Notes</label>
                  <textarea 
                    className={styles.input} 
                    style={{ minHeight: '80px', fontFamily: 'inherit' }}
                    placeholder="Describe your setup, psychology, and reasons for taking this position..."
                    {...register('notes')}
                  />
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
                  {isSubmitting ? 'Logging...' : 'Save Trade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Side-Drawer Trade Detail View */}
      {selectedTradeId && selectedTrade && (
        <div className={styles.drawerOverlay} onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedTradeId(null);
        }}>
          <div className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <div>
                <span className={styles.drawerTitle} style={{ marginRight: '8px' }}>{selectedTrade.symbol}</span>
                <span className={`${styles.badge} ${
                  selectedTrade.status === 'OPEN' ? styles.badgeOpen : 
                  selectedTrade.status === 'PARTIAL' ? styles.badgePartial : styles.badgeClosed
                }`}>
                  {selectedTrade.status}
                </span>
              </div>
              <button className={styles.modalClose} onClick={() => setSelectedTradeId(null)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              {/* Primary Info */}
              <div className={styles.section}>
                <span className={styles.sectionTitle}>Trade Specifications</span>
                <div className={styles.grid2}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Direction</span>
                    <span className={`${styles.badge} ${selectedTrade.direction === 'BUY' ? styles.badgeBuy : styles.badgeSell}`}>
                      {selectedTrade.direction}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Lot Size</span>
                    <span className={styles.detailValue}>{Number(selectedTrade.lot_size).toFixed(2)} Lots</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Entry Price</span>
                    <span className={styles.detailValue}>{Number(selectedTrade.entry_price).toFixed(5)}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Net PnL</span>
                    <span className={`${styles.detailValue} ${Number(selectedTrade.pnl) >= 0 ? styles.pnlProfit : styles.pnlLoss}`}>
                      {Number(selectedTrade.pnl) >= 0 ? '+' : ''}{formatCurrency(Number(selectedTrade.pnl || 0))}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Stop Loss</span>
                    <span className={styles.detailValue} style={{ color: 'var(--accent-danger)' }}>{Number(selectedTrade.stop_loss).toFixed(5)}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Take Profit</span>
                    <span className={styles.detailValue} style={{ color: 'var(--accent-profit)' }}>{Number(selectedTrade.take_profit).toFixed(5)}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>R:R Ratio</span>
                    <span className={styles.detailValue} style={{ color: 'var(--accent-info)' }}>{Number(selectedTrade.rr_ratio || 0).toFixed(2)}R</span>
                  </div>
                </div>
              </div>

              {/* Tag section */}
              {selectedTrade.trade_tags && selectedTrade.trade_tags.length > 0 && (
                <div className={styles.section}>
                  <span className={styles.sectionTitle}>Tags Applied</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedTrade.trade_tags.map((tagObj, idx) => (
                      <span key={idx} className={styles.tagBadge}>
                        {tagObj.tags.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Scaling Out (Partial close UI) */}
              {selectedTrade.status !== 'CLOSED' && (
                <div className={styles.section}>
                  <span className={styles.sectionTitle}>Log Partial Close (Scale Out)</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                    <div className={styles.grid2}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Lots to Close</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          className={styles.input} 
                          value={partialLots}
                          onChange={(e) => setPartialLots(Number(e.target.value))}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Close Price</label>
                        <input 
                          type="number" 
                          step="0.00001" 
                          className={styles.input} 
                          value={partialPrice}
                          onChange={(e) => setPartialPrice(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>PnL Generated ($)</label>
                      <input 
                        type="number" 
                        className={styles.input} 
                        value={partialPnl}
                        onChange={(e) => setPartialPnl(Number(e.target.value))}
                      />
                    </div>
                    <button 
                      className={styles.btnSecondary}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      onClick={handleAddPartial}
                    >
                      <Layers size={14} />
                      <span>Log Partial Close</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Partials logs listing */}
              {selectedTrade.trade_partials && selectedTrade.trade_partials.length > 0 && (
                <div className={styles.section}>
                  <span className={styles.sectionTitle}>Scale-Out History</span>
                  <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                    {selectedTrade.trade_partials.map((p, idx) => (
                      <div key={idx} className={styles.partialItem}>
                        <span>Closed {Number(p.quantity).toFixed(2)} lots @ {Number(p.close_price).toFixed(5)}</span>
                        <span className={Number(p.pnl) >= 0 ? styles.pnlProfit : styles.pnlLoss}>
                          {Number(p.pnl) >= 0 ? '+' : ''}{formatCurrency(Number(p.pnl))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className={styles.section}>
                <span className={styles.sectionTitle}>Journal Entry Notes</span>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap' }}>
                  {selectedTrade.notes || 'No journal entries noted.'}
                </p>
              </div>

              {/* Screenshot Zone */}
              <div className={styles.section}>
                <span className={styles.sectionTitle}>Chart Setups & Screenshots</span>
                
                {selectedTrade.trade_images && selectedTrade.trade_images.map((img, idx) => (
                  <div key={idx} style={{ marginTop: '8px' }}>
                    <img src={img.image_url} alt="Trade Screenshot" className={styles.screenshotPreview} />
                    {img.caption && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '4px', textAlign: 'center' }}>{img.caption}</p>}
                  </div>
                ))}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                  <label className={styles.imageUploadZone}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setScreenshotFile(e.target.files[0]);
                        }
                      }}
                    />
                    <UploadCloud size={24} style={{ margin: '0 auto 8px', color: 'var(--text-tertiary)' }} />
                    <span>{screenshotFile ? screenshotFile.name : 'Click to upload screenshot (10MB max)'}</span>
                  </label>

                  {screenshotFile && (
                    <>
                      <input 
                        type="text" 
                        className={styles.input} 
                        placeholder="Caption (e.g. London breakout confirmation)" 
                        value={screenshotCaption}
                        onChange={(e) => setScreenshotCaption(e.target.value)}
                      />
                      <button className={styles.btnPrimary} onClick={handleScreenshotUpload}>
                        Upload Screenshot
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                <button 
                  className={styles.btnDanger}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => handleDeleteTrade(selectedTrade.id, Number(selectedTrade.pnl))}
                >
                  <Trash2 size={16} />
                  <span>Delete Trade from Journal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TradesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Journal Workspace...</div>}>
      <TradesDashboard />
    </Suspense>
  );
}
