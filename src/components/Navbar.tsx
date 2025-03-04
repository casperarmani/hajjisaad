import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function Navbar() {
  const { user, userRole, signOut } = useAuth();

  return (
    <nav className="bg-slate-800 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="text-xl font-bold">
            Materials Testing Shop
          </Link>
        </div>
        
        {user ? (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-300">
              {user.email} ({userRole})
            </span>
            <button
              onClick={() => signOut()}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition"
            >
              Logout
            </button>
          </div>
        ) : (
          <Link href="/login" className="text-sm">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}