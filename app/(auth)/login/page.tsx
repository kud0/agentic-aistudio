/**
 * Login Page
 *
 * Allows users to sign in with email and password
 */

import Link from 'next/link';
import { AuthForm } from '@/app/components/auth/AuthForm';

export const metadata = {
  title: 'Login - Agentic AI Studio',
  description: 'Sign in to your Agentic AI Studio account',
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Sign in to your account to continue
        </p>
      </div>

      <AuthForm mode="login" />

      <div className="space-y-4">
        <div className="text-center">
          <Link
            href="/forgot-password"
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            Forgot your password?
          </Link>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              New to Agentic AI Studio?
            </span>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Create a new account
          </Link>
        </div>
      </div>
    </div>
  );
}
