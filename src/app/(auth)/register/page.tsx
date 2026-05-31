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
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import styles from './register.module.css';

/* ── Schema ───────────────────────────────────────────────── */
const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

/* ── Component ────────────────────────────────────────────── */
export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password', '');

  /* Password requirements */
  const requirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a letter', met: /[a-zA-Z]/.test(password) },
    { label: 'Contains a number', met: /[0-9]/.test(password) },
  ];

  const onSubmit = async (data: RegisterFormData) => {
    setFormError('');
    setFormSuccess('');

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.name,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setFormError(error.message);
      return;
    }

    setFormSuccess(
      'Account created! Please check your email to verify your account.'
    );
  };

  return (
    <>
      <h2 className={styles.heading}>Create your account</h2>
      <p className={styles.subheading}>
        Start tracking your trades in minutes
      </p>

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

      <form
        className={styles.form}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        {/* Name */}
        <div className={styles.field}>
          <label htmlFor="name" className={styles.label}>
            Full Name
          </label>
          <div className={styles.inputWrapper}>
            <User className={styles.inputIcon} />
            <input
              id="name"
              type="text"
              placeholder="John Doe"
              className={styles.input}
              autoComplete="name"
              {...register('name')}
              suppressHydrationWarning
            />
          </div>
          {errors.name && (
            <span className={styles.fieldError}>{errors.name.message}</span>
          )}
        </div>

        {/* Email */}
        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>
            Email
          </label>
          <div className={styles.inputWrapper}>
            <Mail className={styles.inputIcon} />
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              className={styles.input}
              autoComplete="email"
              {...register('email')}
              suppressHydrationWarning
            />
          </div>
          {errors.email && (
            <span className={styles.fieldError}>{errors.email.message}</span>
          )}
        </div>

        {/* Password */}
        <div className={styles.field}>
          <label htmlFor="reg-password" className={styles.label}>
            Password
          </label>
          <div className={styles.inputWrapper}>
            <Lock className={styles.inputIcon} />
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              className={styles.input}
              autoComplete="new-password"
              {...register('password')}
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
          {errors.password && (
            <span className={styles.fieldError}>
              {errors.password.message}
            </span>
          )}
          {/* Requirements indicator */}
          <div className={styles.requirements}>
            {requirements.map((req) => (
              <span
                key={req.label}
                className={`${styles.requirement} ${req.met ? styles.requirementMet : ''}`}
              >
                <Check size={12} />
                {req.label}
              </span>
            ))}
          </div>
        </div>

        {/* Confirm Password */}
        <div className={styles.field}>
          <label htmlFor="confirm-password" className={styles.label}>
            Confirm Password
          </label>
          <div className={styles.inputWrapper}>
            <Lock className={styles.inputIcon} />
            <input
              id="confirm-password"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Re-enter your password"
              className={styles.input}
              autoComplete="new-password"
              {...register('confirmPassword')}
              suppressHydrationWarning
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowConfirm(!showConfirm)}
              tabIndex={-1}
              aria-label={
                showConfirm ? 'Hide password' : 'Show password'
              }
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <span className={styles.fieldError}>
              {errors.confirmPassword.message}
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
              Create Account
              <ArrowRight size={16} className={styles.submitBtnIcon} />
            </>
          )}
        </button>
      </form>

      <p className={styles.footerText}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </>
  );
}
