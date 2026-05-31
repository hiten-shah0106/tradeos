'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Wallet, 
  BarChart3, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  Plus, 
  ChevronDown, 
  User,
  Search,
  Bell
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { createClient } from '@/lib/supabase/client';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  
  const { 
    sidebarCollapsed, 
    toggleSidebar, 
    accounts, 
    activeAccount, 
    setAccounts, 
    setActiveAccountId,
    toggleCommandPalette
  } = useAppStore();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profile, setProfile] = useState<{ name: string | null; email: string; avatar_url: string | null } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single();

      setProfile({
        name: profileData?.name || user.user_metadata?.name || 'Trader',
        email: user.email || '',
        avatar_url: profileData?.avatar_url || user.user_metadata?.avatar_url || null
      });

      // Load Accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: true });

      if (accountsData) {
        setAccounts(accountsData);
      }
    }

    loadData();

    // Setup Realtime subscribe to accounts & profiles
    const channel = supabase
      .channel('db_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, setAccounts]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Journal', href: '/trades', icon: BookOpen },
    { name: 'Accounts', href: '/accounts', icon: Wallet },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatCurrency = (val: number, curr = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr
    }).format(val);
  };

  const getAccountTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'personal': return styles.badgePersonal;
      case 'challenge': return styles.badgeChallenge;
      case 'funded': return styles.badgeFunded;
      default: return '';
    }
  };

  return (
    <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          <img src="/logo.png" alt="TradeOS Logo" className={styles.logoImg} />
          {!sidebarCollapsed && (
            <div className={styles.logoTextBlock}>
              <span className={styles.logoText}>TradeOS</span>
              <span className={styles.logoSubtext}>Professional Suite</span>
            </div>
          )}
        </div>
        <button className={styles.toggleBtn} onClick={toggleSidebar}>
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Account Switcher */}
      <div className={sidebarCollapsed ? styles.switcherCollapsed : styles.switcherContainer} ref={dropdownRef}>
        {sidebarCollapsed ? (
          <button 
            className={styles.switcherTriggerCollapsed}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title={activeAccount?.name || 'Select Account'}
          >
            <Wallet size={18} />
          </button>
        ) : (
          <button 
            className={styles.switcherTrigger}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className={styles.switcherInfo}>
              <span className={styles.switcherName}>{activeAccount?.name || 'No Accounts'}</span>
              {activeAccount && (
                <span className={styles.switcherMeta}>
                  <span className={`${styles.badge} ${getAccountTypeBadgeClass(activeAccount.account_type)}`}>
                    {activeAccount.account_type}
                  </span>
                  <span>{formatCurrency(Number(activeAccount.current_balance), activeAccount.currency)}</span>
                </span>
              )}
            </div>
            <ChevronDown size={14} className={dropdownOpen ? 'rotate-180' : ''} style={{ transition: 'transform 0.2s' }} />
          </button>
        )}

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className={`${styles.dropdownMenu} ${sidebarCollapsed ? styles.dropdownMenuCollapsed : ''}`}>
            <div className={styles.dropdownHeader}>Select Account</div>
            <div className={styles.accountList}>
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  className={`${styles.accountItem} ${activeAccount?.id === acc.id ? styles.accountItemActive : ''}`}
                  onClick={async () => {
                    setActiveAccountId(acc.id);
                    setDropdownOpen(false);
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        await supabase
                          .from('accounts')
                          .update({ is_active: false })
                          .eq('user_id', user.id);
                        await supabase
                          .from('accounts')
                          .update({ is_active: true })
                          .eq('id', acc.id);
                      }
                    } catch (err) {
                      console.error('Failed to persist active account:', err);
                    }
                  }}
                >
                  <div className={styles.accountItemInfo}>
                    <span className={styles.accountItemName}>{acc.name}</span>
                    <span className={styles.accountItemMeta}>
                      <span className={`${styles.badge} ${getAccountTypeBadgeClass(acc.account_type)}`}>
                        {acc.account_type}
                      </span>
                      <span>{acc.broker}</span>
                    </span>
                  </div>
                  <span className={styles.accountItemBalance}>
                    {formatCurrency(Number(acc.current_balance), acc.currency)}
                  </span>
                </button>
              ))}
            </div>
            <div className={styles.dropdownFooter}>
              <button 
                className={styles.addAccountBtn}
                onClick={() => {
                  setDropdownOpen(false);
                  router.push('/accounts?new=true');
                }}
              >
                <Plus size={16} />
                <span>Create New Account</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''} ${sidebarCollapsed ? styles.navLinkCollapsed : ''}`}
              title={item.name}
            >
              <Icon size={18} className={styles.navIcon} />
              {!sidebarCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer / User Profile */}
      <div className={`${styles.footer} ${sidebarCollapsed ? styles.footerCollapsed : ''}`}>
        <div className={styles.userContainer}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className={styles.avatar} />
          ) : (
            <div className={styles.avatar}>
              {profile?.name ? getInitials(profile.name) : <User size={18} />}
            </div>
          )}
          {!sidebarCollapsed && profile && (
            <div className={styles.userInfo}>
              <span className={styles.userName}>{profile.name}</span>
              <span className={styles.userEmail}>{profile.email}</span>
            </div>
          )}
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} title="Log Out">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
