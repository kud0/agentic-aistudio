/**
 * Auth Layout
 *
 * Layout for authentication pages (login, signup)
 * Provides a centered, clean interface without navigation
 */

import { ReactNode } from 'react';
import '@/app/globals.css';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Agentic AI Studio
          </h1>
          <p className="mt-2 text-gray-600">
            Build intelligent AI agents
          </p>
        </div>

        {/* Auth Form Container */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {children}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} Agentic AI Studio. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
