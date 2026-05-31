'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  User, 
  Settings, 
  Bell, 
  Check, 
  ShieldAlert, 
  Info, 
  AlertTriangle,
  Globe,
  Sliders,
  DollarSign
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import styles from './settings.module.css';

import { Suspense } from 'react';

function SettingsDashboard() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'notifications'>('profile');

  // Profile Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Preference details
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [riskPerTrade, setRiskPerTrade] = useState(2);

  // Auto select tab if defined in URL params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'notifications') {
      setActiveTab('notifications');
    }
  }, [searchParams]);

  // Load active user profile details
  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, timezone, avatar_url')
          .eq('id', user.id)
          .single();

        if (profile) {
          setName(profile.name || user.user_metadata?.name || '');
          setTimezone(profile.timezone || 'UTC');
          setAvatarUrl(profile.avatar_url || user.user_metadata?.avatar_url || null);
        }
      }
      setIsLoading(false);
    }
    loadProfile();
  }, [supabase]);

  // Helper to get initials for avatar fallback
  const getInitials = (n: string) => {
    return n
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle avatar file upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) {
        return;
      }
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthenticated');

      const filePath = `${user.id}/${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('Avatar uploaded successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          timezone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Profile updated successfully!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update profile');
    }
  };

  const handleUpdatePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Dashboard preferences updated!');
  };

  // Mock list of prop firm notifications / warnings
  const mockNotifications = [
    { 
      id: '1', 
      type: 'CRITICAL', 
      title: 'Daily Drawdown Warning', 
      message: 'Account: FTMO 100K has reached 4.6% drawdown (Limit is 5.0%). Risk warning active.', 
      time: 'Just now', 
      is_read: false 
    },
    { 
      id: '2', 
      type: 'INFO', 
      title: 'Consistency Rule Satisfied', 
      message: 'Evaluation account largest winning day is 28% (under the 33% maximum consistency target). Well done!', 
      time: '2 hours ago', 
      is_read: true 
    },
    { 
      id: '3', 
      type: 'WARNING', 
      title: 'High Risk Position logged', 
      message: 'XAUUSD trade lot size (5.00 lots) exceeds the maximum recommended risk target of 2.0% for this account size.', 
      time: 'Yesterday', 
      is_read: true 
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.titleSection}>
        <h1 className={styles.title}>System Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
          Configure user settings, preferences, and check compliance alert logs.
        </p>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'profile' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile Settings
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'preferences' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          Preferences
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'notifications' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          Compliance Alerts Log
        </button>
      </div>

      {/* Tab Panel 1: Profile Settings */}
      {activeTab === 'profile' && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <User size={18} style={{ color: 'var(--accent-primary)' }} />
            <span>Personal Profile Details</span>
          </div>

          {isLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading profile...</div>
          ) : (
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className={styles.avatarSection}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className={styles.avatarPreview} />
                ) : (
                  <div className={styles.avatarPreview}>
                    {name ? getInitials(name) : <User size={24} />}
                  </div>
                )}
                <div className={styles.avatarActions}>
                  <label htmlFor="avatar-file" className={styles.uploadLabel}>
                    {uploading ? 'Uploading...' : 'Upload Avatar'}
                  </label>
                  <input
                    type="file"
                    id="avatar-file"
                    accept="image/*"
                    className={styles.fileInput}
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    PNG, JPG, or WEBP. Max 2MB.
                  </span>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Email Address (Read-only)</label>
                <input 
                  type="email" 
                  className={styles.input} 
                  value={email} 
                  disabled 
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Display / Trader Name</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Preferred Timezone</label>
                <select 
                  className={styles.select} 
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="GMT">GMT (Greenwich Mean Time)</option>
                  <option value="EST">EST (Eastern Standard Time)</option>
                  <option value="PST">PST (Pacific Standard Time)</option>
                  <option value="IST">IST (Indian Standard Time)</option>
                </select>
              </div>

              <button type="submit" className={styles.btnPrimary}>
                <Check size={16} />
                <span>Save Changes</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* Tab Panel 2: Dashboard Prefs */}
      {activeTab === 'preferences' && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <Sliders size={18} style={{ color: 'var(--accent-secondary)' }} />
            <span>Dashboard Layout Preferences</span>
          </div>

          <form onSubmit={handleUpdatePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Default Valuation Currency</label>
              <select 
                className={styles.select}
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
              >
                <option value="USD">USD (United States Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="GBP">GBP (British Pound)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Default Target Risk per Trade (%)</label>
              <input 
                type="number" 
                step="0.1"
                className={styles.input} 
                value={riskPerTrade} 
                onChange={(e) => setRiskPerTrade(Number(e.target.value))}
              />
            </div>

            <button type="submit" className={styles.btnPrimary}>
              <Check size={16} />
              <span>Save Preferences</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab Panel 3: Notifications Logs */}
      {activeTab === 'notifications' && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <Bell size={18} style={{ color: 'var(--accent-warning)' }} />
            <span>Prop Firm Compliance Logs</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mockNotifications.map((noti) => {
              const isCritical = noti.type === 'CRITICAL';
              const isWarning = noti.type === 'WARNING';
              const isInfo = noti.type === 'INFO';
              
              return (
                <div key={noti.id} className={styles.notificationItem}>
                  {/* Read indicator */}
                  {!noti.is_read && <span className={styles.unreadIndicator} />}

                  {/* Level specific icons */}
                  <div className={styles.notiIcon}>
                    {isCritical && <ShieldAlert size={20} style={{ color: 'var(--accent-danger)' }} />}
                    {isWarning && <AlertTriangle size={20} style={{ color: 'var(--accent-warning)' }} />}
                    {isInfo && <Info size={20} style={{ color: 'var(--accent-info)' }} />}
                  </div>

                  <div className={styles.notiContent}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={styles.notiTitle}>{noti.title}</span>
                      <span style={{ 
                        fontSize: '8px', 
                        fontWeight: 700, 
                        textTransform: 'uppercase', 
                        padding: '1px 6px', 
                        borderRadius: '3px',
                        background: isCritical ? 'rgba(239,68,68,0.15)' : isWarning ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                        color: isCritical ? 'var(--accent-danger)' : isWarning ? 'var(--accent-warning)' : 'var(--accent-info)'
                      }}>
                        {noti.type}
                      </span>
                    </div>
                    <span className={styles.notiMsg}>{noti.message}</span>
                    <span className={styles.notiTime}>{noti.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Settings Workspace...</div>}>
      <SettingsDashboard />
    </Suspense>
  );
}
