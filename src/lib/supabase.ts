import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'secretary' | 'tester' | 'manager' | 'qc' | 'accounting' | 'uncle';

export type MaterialStage = 
  | 'received' 
  | 'testing' 
  | 'review' 
  | 'qc' 
  | 'accounting' 
  | 'final_approval' 
  | 'completed';

export interface UserMetadata {
  role: UserRole;
}

export interface Material {
  id: string;
  name: string;
  description: string;
  client_name: string;
  client_email: string;
  material_type: string;
  received_date: string;
  current_stage: MaterialStage;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  created_at: string;
  updated_at: string;
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getUserRole = async (): Promise<UserRole | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  
  return (user.user_metadata as UserMetadata).role;
};