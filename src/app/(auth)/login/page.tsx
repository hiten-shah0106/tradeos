'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  KeyRound,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import styles from './login.module.css';

/* ── Schemas ──────────────────────────────────────────────── */
const passwordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const magicLinkSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type PasswordFormData = z.infer<typeof passwordSchema>;
type MagicLinkFormData = z.infer<typeof magicLinkSchema>;

type LoginMode = 'password' | 'magic-link';

/* ── Component ────────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<LoginMode>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);

  /* ── Password form ──────────────────────────────────────── */
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { email: '', password: '' },
  });

  /* ── Magic link form ────────────────────────────────────── */
  const magicLinkForm = useForm<MagicLinkFormData>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: '' },
  });

  /* ── Handlers ───────────────────────────────────────────── */
  const handlePasswordLogin = async (data: PasswordFormData) => {
    setFormError('');
    setFormSuccess('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setFormError(error.message);
      return;
    }

    router.push('/');
    router.refresh();
  };

  const handleMagicLink = async (data: MagicLinkFormData) => {
    setFormError('');
    setFormSuccess('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: data.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setFormError(error.message);
      return;
    }

    setFormSuccess('Check your email for the magic link!');
  };

  const handleGoogleLogin = async () => {
    setFormError('');
    setOauthLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setFormError(error.message);
      setOauthLoading(false);
    }
  };

  const handleModeSwitch = (newMode: LoginMode) => {
    setMode(newMode);
    setFormError('');
    setFormSuccess('');
  };

  const isSubmitting =
    mode === 'password'
      ? passwordForm.formState.isSubmitting
      : magicLinkForm.formState.isSubmitting;

  return (
    <>
      <h2 className={styles.heading}>Welcome back</h2>
      <p className={styles.subheading}>Sign in to your trading journal</p>

      {/* ── Mode Tabs ──────────────────────────────────────── */}
      <div className={styles.modeTabs}>
        <button
          type="button"
          className={`${styles.modeTab} ${mode === 'password' ? styles.modeTabActive : ''}`}
          onClick={() => handleModeSwitch('password')}
        >
          <KeyRound size={14} />
          Password
        </button>
        <button
          type="button"
          className={`${styles.modeTab} ${mode === 'magic-link' ? styles.modeTabActive : ''}`}
          onClick={() => handleModeSwitch('magic-link')}
        >
          <Sparkles size={14} />
          Magic Link
        </button>
      </div>

      {/* ── Error / Success ────────────────────────────────── */}
      {formError && (
        <div className={styles.formError}>
          <AlertCircle size={16} />
          {formError}
        </div>
      )}
      {formSuccess && (
        <div className={styles.formSuccess}>
          <CheckCircle size={16} />
          {formSuccess}
        </div>
      )}

      {/* ── Password Form ──────────────────────────────────── */}
      {mode === 'password' && (
        <form
          className={styles.form}
          onSubmit={passwordForm.handleSubmit(handlePasswordLogin)}
          noValidate
        >
          <div className={styles.field}>
            <label htmlFor="email-pw" className={styles.label}>
              Email
            </label>
            <div className={styles.inputWrapper}>
              <Mail className={styles.inputIcon} />
               <input
                id="email-pw"
                type="email"
                placeholder="you@example.com"
                className={styles.input}
                autoComplete="email"
                {...passwordForm.register('email')}
                suppressHydrationWarning
              />
            </div>
            {passwordForm.formState.errors.email && (
              <span className={styles.fieldError}>
                {passwordForm.formState.errors.email.message}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                className={styles.input}
                autoComplete="current-password"
                {...passwordForm.register('password')}
                suppressHydrationWarning
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordForm.formState.errors.password && (
              <span className={styles.fieldError}>
                {passwordForm.formState.errors.password.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className={styles.spinner} />
            ) : (
              <>
                Sign In
                <ArrowRight size={16} className={styles.submitBtnIcon} />
              </>
            )}
          </button>
        </form>
      )}

      {/* ── Magic Link Form ────────────────────────────────── */}
      {mode === 'magic-link' && (
        <form
          className={styles.form}
          onSubmit={magicLinkForm.handleSubmit(handleMagicLink)}
          noValidate
        >
          <div className={styles.field}>
            <label htmlFor="email-ml" className={styles.label}>
              Email
            </label>
            <div className={styles.inputWrapper}>
              <Mail className={styles.inputIcon} />
              <input
                id="email-ml"
                type="email"
                placeholder="you@example.com"
                className={styles.input}
                autoComplete="email"
                {...magicLinkForm.register('email')}
                suppressHydrationWarning
              />
            </div>
            {magicLinkForm.formState.errors.email && (
              <span className={styles.fieldError}>
                {magicLinkForm.formState.errors.email.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className={styles.spinner} />
            ) : (
              <>
                Send Magic Link
                <Sparkles size={16} className={styles.submitBtnIcon} />
              </>
            )}
          </button>
        </form>
      )}

      {/* ── Divider ────────────────────────────────────────── */}
      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span className={styles.dividerText}>or continue with</span>
        <span className={styles.dividerLine} />
      </div>

      {/* ── Google OAuth ───────────────────────────────────── */}
      <button
        type="button"
        className={styles.oauthBtn}
        onClick={handleGoogleLogin}
        disabled={oauthLoading}
      >
        {oauthLoading ? (
          <span className={styles.spinner} />
        ) : (
          <>
            <svg className={styles.oauthIcon} viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </>
        )}
      </button>

      {/* ── Footer ─────────────────────────────────────────── */}
      <p className={styles.footerText}>
        Don&apos;t have an account?{' '}
        <Link href="/register">Create one</Link>
      </p>
    </>
  );
}
