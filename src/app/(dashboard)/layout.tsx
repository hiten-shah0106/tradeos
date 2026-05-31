'use client';

import Sidebar from '@/components/Sidebar/Sidebar';
import Header from '@/components/Header/Header';
import CommandPalette from '@/components/CommandPalette/CommandPalette';
import { useAppStore } from '@/store/useAppStore';
import styles from './layout.module.css';

export default function DashboardShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useAppStore();

  return (
    <div className={styles.layout}>
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Workspace */}
      <div 
        className={`${styles.mainWrapper} ${
          sidebarCollapsed ? styles.sidebarCollapsed : styles.sidebarOpen
        }`}
      >
        {/* Sticky Top Header */}
        <Header />

        {/* Dynamic Page Views */}
        <main className={styles.content}>
          {children}
        </main>
      </div>

      {/* Global Command Palette (⌘K) */}
      <CommandPalette />
    </div>
  );
}
