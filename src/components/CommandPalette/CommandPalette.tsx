'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Wallet, BookOpen, BarChart3, Settings, Plus, LayoutDashboard, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import styles from './CommandPalette.module.css';

export default function CommandPalette() {
  const router = useRouter();
  const { 
    commandPaletteOpen, 
    setCommandPaletteOpen, 
    accounts, 
    setActiveAccountId 
  } = useAppStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Toggle Command Palette with Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  // Focus input on open
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  // Static list of actions/navs
  const navigationItems = [
    { name: 'Go to Dashboard', type: 'nav', path: '/', icon: LayoutDashboard },
    { name: 'Go to Trading Journal', type: 'nav', path: '/trades', icon: BookOpen },
    { name: 'Go to Accounts', type: 'nav', path: '/accounts', icon: Wallet },
    { name: 'Go to Performance Analytics', type: 'nav', path: '/analytics', icon: BarChart3 },
    { name: 'Go to Settings', type: 'nav', path: '/settings', icon: Settings },
  ];

  const actionItems = [
    { name: 'Log a New Trade', type: 'action', action: () => router.push('/trades?new=true'), icon: Plus },
    { name: 'Create a New Account', type: 'action', action: () => router.push('/accounts?new=true'), icon: Plus },
  ];

  const accountItems = accounts.map(acc => ({
    name: `Switch to: ${acc.name}`,
    type: 'account',
    meta: `${acc.broker} • ${acc.account_type.toUpperCase()}`,
    action: () => setActiveAccountId(acc.id),
    icon: Wallet
  }));

  interface CommandItem {
    name: string;
    type: string;
    icon: any;
    path?: string;
    action?: () => void;
    meta?: string;
  }

  // Flattened & filtered search list
  const allItems: CommandItem[] = [
    ...navigationItems,
    ...actionItems,
    ...accountItems
  ];

  const filteredItems = allItems.filter(item => 
    item.name.toLowerCase().includes(query.toLowerCase()) ||
    (item.meta && item.meta.toLowerCase().includes(query.toLowerCase()))
  );

  const handleSelect = (item: typeof allItems[0]) => {
    if (item.type === 'nav' && item.path) {
      router.push(item.path);
    } else if (item.action) {
      item.action();
    }
    setCommandPaletteOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    }
  };

  return (
    <div 
      className={styles.overlay} 
      ref={overlayRef} 
      onClick={(e) => {
        if (e.target === overlayRef.current) setCommandPaletteOpen(false);
      }}
    >
      <div className={styles.modal} onKeyDown={handleKeyDown}>
        {/* Search Input */}
        <div className={styles.searchContainer}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            className={styles.input} 
            placeholder="Type a command or search accounts..." 
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            ref={inputRef}
          />
          <span className={styles.shortcut}>ESC</span>
        </div>

        {/* Results */}
        <div className={styles.results}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              No results found for "{query}"
            </div>
          ) : (
            <div className={styles.group}>
              {filteredItems.map((item, index) => {
                const Icon = item.icon;
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={`${item.name}-${index}`}
                    className={`${styles.item} ${isSelected ? styles.itemSelected : ''}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className={styles.itemLeft}>
                      <Icon size={16} className={styles.itemIcon} />
                      <div className={styles.itemTextContainer}>
                        <span className={styles.itemName}>{item.name}</span>
                        {item.meta && <span className={styles.itemMeta}>{item.meta}</span>}
                      </div>
                    </div>
                    {isSelected && <ArrowRight size={14} style={{ color: 'var(--accent-primary)' }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.instructions}>
            <span><kbd className={styles.key}>↑↓</kbd> Navigate</span>
            <span><kbd className={styles.key}>Enter</kbd> Select</span>
          </div>
          <span>TradeOS Command Palette</span>
        </div>
      </div>
    </div>
  );
}
