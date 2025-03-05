import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase client with service role key for admin privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string, // Service role key with admin privileges
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(request: NextRequest) {
  // Get user ID from the URL
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }

  try {
    // Use admin privileges to fetch user data
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (error) {
      console.error('Error fetching user by ID:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user' },
        { status: 500 }
      );
    }

    if (!data || !data.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return sanitized user data (only email and id)
    return NextResponse.json({
      id: data.user.id,
      email: data.user.email,
    });
  } catch (err) {
    console.error('Exception while fetching user:', err);
    return NextResponse.json(
      { error: 'An error occurred while fetching user data' },
      { status: 500 }
    );
  }
}