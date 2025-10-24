/**
 * Signup Page
 *
 * Allows users to create a new account with email and password
 */

import Link from 'next/link';
import { AuthForm } from '@/app/components/auth/AuthForm';

export const metadata = {
  title: 'Sign Up - Agentic AI Studio',
  description: 'Create your Agentic AI Studio account',
};

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Start building intelligent AI agents today
        </p>
      </div>

      <AuthForm mode="signup" />

      <div className="space-y-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              Already have an account?
            </span>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Sign in to existing account
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs text-center text-gray-500">
          By signing up, you agree to our{' '}
          <Link href="/terms" className="text-blue-600 hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-blue-600 hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
