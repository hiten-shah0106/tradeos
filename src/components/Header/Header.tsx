'use client';

import { useRouter } from 'next/navigation';
import { Search, Bell, Plus } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import styles from './Header.module.css';

interface HeaderProps {
  title?: string;
}

export default function Header({ title }: HeaderProps) {
  const router = useRouter();
  const { activeAccount, toggleCommandPalette, notifications } = useAppStore();
  
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h1 className={styles.title}>
          {title || (activeAccount ? activeAccount.name : 'TradeOS Dashboard')}
        </h1>
      </div>

      <div className={styles.right}>
        {/* Ctrl+K Search button */}
        <button className={styles.searchBtn} onClick={toggleCommandPalette}>
          <Search size={16} />
          <span>Search trades, tags...</span>
          <kbd className={styles.shortcut}>⌘K</kbd>
        </button>

        {/* Notifications button */}
        <button 
          className={styles.bellBtn} 
          onClick={() => router.push('/settings?tab=notifications')}
          title="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && <span className={styles.badge} />}
        </button>

        {/* Quick Trade Button */}
        {activeAccount && (
          <button 
            className={styles.quickTradeBtn}
            onClick={() => router.push('/trades?new=true')}
          >
            <Plus size={16} />
            <span>New Trade</span>
          </button>
        )}
      </div>
    </header>
  );
}
