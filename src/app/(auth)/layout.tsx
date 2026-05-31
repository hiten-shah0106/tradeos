import { TrendingUp } from 'lucide-react';
import styles from './auth.module.css';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.wrapper}>
      {/* Animated gradient background */}
      <div className={styles.bgGradient} />
      <div className={styles.bgGrid} />

      {/* Floating orbs */}
      <div className={`${styles.orb} ${styles.orb1}`} />
      <div className={`${styles.orb} ${styles.orb2}`} />
      <div className={`${styles.orb} ${styles.orb3}`} />

      <div className={styles.container}>
        {/* Branding */}
        <div className={styles.branding}>
          <div className={styles.logoMark}>
            <TrendingUp />
          </div>
          <h1 className={styles.logoText}>TradeOS</h1>
          <p className={styles.logoSubtext}>
            Trading Journal &amp; Analytics Platform
          </p>
        </div>

        {/* Auth card */}
        <div className={styles.card}>{children}</div>
      </div>
    </div>
  );
}
