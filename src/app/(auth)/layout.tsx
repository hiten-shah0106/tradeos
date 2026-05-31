import styles from './auth.module.css';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {/* Branding */}
        <div className={styles.branding}>
          <img src="/logo.png" alt="TradeOS Logo" className={styles.logoImg} />
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
