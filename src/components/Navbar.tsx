import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function Navbar() {
  const { user, userRole, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <nav className="bg-slate-800 text-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        {/* Desktop & Mobile Top Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-xl font-bold truncate max-w-[270px] md:max-w-full">
              Hajji Saad's Material Testing
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-slate-300 truncate max-w-[200px]">
                  {user.email} ({userRole})
                </span>
                <button
                  onClick={() => signOut()}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link href="/login" className="text-sm">
                Login
              </Link>
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button 
              onClick={toggleMenu}
              className="text-white focus:outline-none"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-slate-700">
            {user ? (
              <div className="space-y-3 pb-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300 break-all">
                    {user.email}
                  </span>
                  <span className="text-xs bg-slate-700 px-2 py-1 rounded-full">
                    {userRole}
                  </span>
                </div>
                <div>
                  <Link 
                    href="/dashboard" 
                    className="block py-2 px-3 text-white text-sm bg-slate-700 rounded-md hover:bg-slate-600 mb-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setMenuOpen(false);
                    }}
                    className="w-full text-left py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="pb-1">
                <Link 
                  href="/login" 
                  className="block py-2 text-sm hover:text-slate-300"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}