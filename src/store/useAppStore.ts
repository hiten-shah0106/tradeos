'use client';

import { create } from 'zustand';
import { Database } from '@/types/database';

type Account = Database['public']['Tables']['accounts']['Row'];
type Notification = Database['public']['Tables']['notifications']['Row'];

interface AppState {
  // Sidebar State
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // Account State
  accounts: Account[];
  activeAccount: Account | null;
  setAccounts: (accounts: Account[]) => void;
  setActiveAccount: (account: Account | null) => void;
  setActiveAccountId: (accountId: string) => void;

  // Command Palette State
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;

  // Notifications State
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  clearAllNotifications: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Sidebar
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // Accounts
  accounts: [],
  activeAccount: null,
  setAccounts: (accounts) => {
    const currentActive = get().activeAccount;
    // Keep active account if it still exists in the new list, otherwise default to first active or null
    const stillExists = currentActive ? accounts.some(a => a.id === currentActive.id) : false;
    const newActive = stillExists 
      ? currentActive 
      : (accounts.find(a => a.is_active) || accounts[0] || null);
    
    set({ accounts, activeAccount: newActive });
  },
  setActiveAccount: (account) => set({ activeAccount: account }),
  setActiveAccountId: (accountId) => {
    const account = get().accounts.find(a => a.id === accountId) || null;
    set({ activeAccount: account });
  },

  // Command Palette
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

  // Notifications
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notification) => set((state) => ({ 
    notifications: [notification, ...state.notifications] 
  })),
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, is_read: true } : n)
  })),
  clearAllNotifications: () => set({ notifications: [] })
}));
