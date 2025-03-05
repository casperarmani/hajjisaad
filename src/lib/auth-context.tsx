"use client";

import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, UserRole } from './supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data?: any, error: any | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Track if the component is mounted
    let isMounted = true;
    
    // Check for active session on initial load
    const checkSession = async () => {
      try {
        console.log('AuthContext - Checking for active session');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthContext - Error getting session:', error);
        }
        
        if (isMounted) {
          console.log('AuthContext - Initial session check:', data.session ? 'Session exists' : 'No session');
          setSession(data.session);
          setUser(data.session?.user ?? null);
          setUserRole(data.session?.user?.user_metadata?.role as UserRole || null);
          setLoading(false);
        }
      } catch (err) {
        console.error('AuthContext - Exception during session check:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    checkSession();

    // Set up listener for changes to auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AuthContext - Auth state changed:', event, session ? 'Session exists' : 'No session');
      
      if (isMounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setUserRole(session?.user?.user_metadata?.role as UserRole || null);
        setLoading(false);
      }
      
      // If user just signed in, log it but don't handle redirects
      if (event === 'SIGNED_IN') {
        console.log('AuthContext - User signed in, session established');
        // Let individual components handle redirects
      }
    });
    
    // Cleanup
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    // Add debugging information
    if (error) {
      console.error('Login error:', error);
    } else {
      console.log('Login successful:', data.session ? 'Session exists' : 'No session');
      
      // Force a refresh of the session state
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        setSession(sessionData.session);
        setUser(sessionData.session.user);
        setUserRole(sessionData.session.user.user_metadata?.role as UserRole || null);
      }
    }
    
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    userRole,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}