/**
 * MindFlow - Login Page
 * Per FRONTEND_ARCHITECTURE.md Section 2.2.1
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/form/FormField';
import { Alert } from '@/components/feedback/Alert';
import { authService } from '@/services/auth';
import type { ApiError } from '@/services/api/types';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  tenantSlug: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);

    try {
      await authService.login({
        email: data.email,
        password: data.password,
        tenantSlug: data.tenantSlug,
      });
      router.push('/dashboard');
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.code === 'AUTH_001') {
        setError('Invalid email or password');
      } else if (apiError.code === 'AUTH_002') {
        setError('Your account has been locked. Please contact support.');
      } else if (apiError.code === 'AUTH_003') {
        setError('Your account is inactive. Please contact your administrator.');
      } else {
        setError(apiError.message || 'An error occurred during login');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-primary-600">
            MindFlow
          </Link>
          <h2 className="mt-4 text-xl text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your credentials to access the dashboard
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border p-8">
          {error && (
            <Alert variant="error" className="mb-4" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              label="Email address"
              htmlFor="email"
              required
              error={errors.email?.message}
            >
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                leftIcon={<Mail className="h-4 w-4" />}
                error={!!errors.email}
                {...register('email')}
              />
            </FormField>

            <FormField
              label="Password"
              htmlFor="password"
              required
              error={errors.password?.message}
            >
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
                error={!!errors.password}
                {...register('password')}
              />
            </FormField>

            <div className="flex items-center justify-between">
              <Checkbox
                label="Remember me"
                {...register('rememberMe')}
              />
              <Link
                href="/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={isSubmitting}
            >
              Sign in
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link
            href="/contact"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Contact us
          </Link>
        </p>
      </div>
    </div>
  );
}
