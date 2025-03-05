'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function AuthRedirect({ 
  to, 
  fallback 
}: { 
  to: string, 
  fallback?: React.ReactNode 
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    // Keep track of redirection attempts to prevent loops
    let redirectAttempts = 0;
    const maxRedirectAttempts = 2;
    
    if (!loading) {
      if (user && redirectAttempts < maxRedirectAttempts) {
        redirectAttempts++;
        // Direct redirect, no setTimeout
        router.push(to);
      } else {
        setIsRedirecting(false);
      }
    }
  }, [user, loading, router, to]);

  if (isRedirecting || loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>;
  }

  return fallback || null;
}