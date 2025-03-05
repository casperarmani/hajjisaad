import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

console.log('Supabase URL available:', !!supabaseUrl);
console.log('Supabase Anon Key available:', !!supabaseAnonKey);

// Ensure cookies are enabled for auth persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'supabase-auth',
    detectSessionInUrl: true,
    autoRefreshToken: true,
  }
});

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
  type: string;
  customer_name: string;
  customer_contact: string;
  received_date: string;
  current_stage: MaterialStage;
  status: string;
  // IMPORTANT: No created_at or updated_at in the schema
  // qr_code has been removed as it was redundant - we use id for QR code generation
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

// Function to get user email by UUID
export const getUserEmailById = async (userId: string): Promise<string | null> => {
  if (!userId) return null;
  
  try {
    // Use the API route that has admin privileges
    const response = await fetch(`/api/users?userId=${userId}`);
    
    if (!response.ok) {
      // If there's an error, fall back to a formatted ID
      console.error('Error fetching user from API:', await response.text());
      return `User-${userId.substring(0, 6)}`;
    }
    
    const data = await response.json();
    return data.email || `User-${userId.substring(0, 6)}`;
  } catch (err) {
    console.error('Exception fetching user email:', err);
    return `User-${userId.substring(0, 6)}`;
  }
};

// Certificate interface
export interface Certificate {
  id: string;
  material_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
}

// Function to upload a certificate file to Supabase Storage
export const uploadCertificate = async (
  materialId: string, 
  file: File, 
  userId: string
): Promise<Certificate | null> => {
  try {
    // 1. Upload the file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${materialId}-${Date.now()}.${fileExt}`;
    const filePath = `certificates/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(filePath, file);
    
    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw uploadError;
    }
    
    // 2. Get the public URL for the file
    const { data: { publicUrl } } = supabase.storage
      .from('certificates')
      .getPublicUrl(filePath);
    
    // 3. Create a record in the certificates table
    const certificateData = {
      material_id: materialId,
      file_path: publicUrl,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      uploaded_by: userId
    };
    
    const { data: certificate, error: dbError } = await supabase
      .from('certificates')
      .insert(certificateData)
      .select()
      .single();
    
    if (dbError) {
      console.error('Error saving certificate to database:', dbError);
      throw dbError;
    }
    
    return certificate as Certificate;
  } catch (err) {
    console.error('Error in uploadCertificate:', err);
    return null;
  }
};

// Function to get certificates for a material
export const getCertificates = async (materialId: string): Promise<Certificate[]> => {
  try {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('material_id', materialId)
      .order('uploaded_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching certificates:', error);
      throw error;
    }
    
    return data as Certificate[];
  } catch (err) {
    console.error('Error in getCertificates:', err);
    return [];
  }
};