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

export interface Test {
  id: string;
  material_id: string;
  test_type: string;
  result?: string;
  performed_by: string;
  performed_at: string;
  file_path: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  template_name?: string;
}

export interface Template {
  id: string;
  template_name: string;
  description: string;
  file_path: string;
  file_type: string;
  applicable_material_types: string[];
  is_active: boolean;
  uploaded_at: string;
  uploaded_by: string;
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
    console.log('Starting certificate upload process:', { materialId, fileName: file.name, userId });
    
    // 1. Upload the file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${materialId}-${Date.now()}.${fileExt}`;
    const filePath = `certificates/${fileName}`;
    
    console.log('Uploading to Storage bucket path:', filePath);
    
    console.log('About to call supabase.storage.from(certificates).upload');
    
    let uploadData;
    try {
      const response = await supabase.storage
        .from('certificates')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      console.log('Upload API call completed');
      
      if (response.error) {
        console.error('Error uploading file to Storage:', response.error);
        console.error('Upload error details:', JSON.stringify(response.error));
        throw response.error;
      }
      
      if (!response.data) {
        console.error('No upload data returned but no error either');
        throw new Error('Upload failed with no error message');
      }
      
      uploadData = response.data;
      console.log('Upload data:', uploadData);
    } catch (uploadErr) {
      console.error('Exception during storage upload:', uploadErr);
      throw uploadErr;
    }
    
    console.log('File uploaded successfully:', uploadData);
    
    // 2. Get the public URL for the file
    const { data: { publicUrl } } = supabase.storage
      .from('certificates')
      .getPublicUrl(filePath);
    
    console.log('Generated public URL:', publicUrl);
    
    // 3. Create a record in the certificates table
    const certificateData = {
      material_id: materialId,
      file_path: publicUrl,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      uploaded_by: userId
    };
    
    console.log('Saving certificate data to database:', certificateData);
    
    const { data: certificate, error: dbError } = await supabase
      .from('certificates')
      .insert(certificateData)
      .select()
      .single();
    
    if (dbError) {
      console.error('Error saving certificate to database:', dbError);
      console.error('Database error details:', JSON.stringify(dbError));
      throw dbError;
    }
    
    console.log('Certificate saved successfully:', certificate);
    return certificate as Certificate;
  } catch (err) {
    console.error('Error in uploadCertificate:', err);
    // Print full error details for debugging
    if (err instanceof Error) {
      console.error('Error details:', {
        message: err.message,
        name: err.name,
        stack: err.stack
      });
    } else {
      console.error('Unknown error type:', err);
    }
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

// Function to upload a test document to Supabase Storage
export const uploadTestDocument = async (
  materialId: string, 
  file: File, 
  userId: string
): Promise<{ path: string; name: string; type: string; size: number; } | null> => {
  try {
    console.log('Starting test document upload process:', { materialId, fileName: file.name, userId });
    
    // 1. Upload the file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `test-documents/${materialId}/${fileName}`;
    
    console.log('Uploading to Storage bucket path:', filePath);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('test-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Error uploading file to Storage:', uploadError);
      throw uploadError;
    }
    
    // 2. Get the public URL for the file
    const { data: { publicUrl } } = supabase.storage
      .from('test-documents')
      .getPublicUrl(filePath);
    
    console.log('Generated public URL:', publicUrl);
    
    // 3. Return the file metadata
    return {
      path: publicUrl,
      name: file.name,
      type: file.type,
      size: file.size
    };
  } catch (err) {
    console.error('Error in uploadTestDocument:', err);
    if (err instanceof Error) {
      console.error('Error details:', {
        message: err.message,
        name: err.name,
        stack: err.stack
      });
    } else {
      console.error('Unknown error type:', err);
    }
    return null;
  }
};

// Function to get templates for a material type
export const getApplicableTemplates = async (materialType: string): Promise<Template[]> => {
  try {
    console.log('Fetching templates for material type:', materialType);
    
    // 1. Check if templates table exists
    const { data: tableInfo, error: tableError } = await supabase
      .from('templates')
      .select('count(*)');
    
    console.log('Templates table check:', tableInfo, tableError);
    
    // 2. Try to get templates
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('is_active', true)
      .order('template_name', { ascending: true });
    
    console.log('Templates query result:', { data, error });
    
    if (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('No templates found in the database');
      
      // 3. Check storage bucket contents directly
      console.log('Checking templates bucket directly...');
      const { data: storageData, error: storageError } = await supabase.storage
        .from('templates')
        .list();
      
      console.log('Templates bucket contents:', { storageData, storageError });
      
      if (storageData && storageData.length > 0) {
        console.log('Found files in templates bucket but no database records');
      }
      
      return [];
    }
    
    // Filter templates based on material type if applicable_material_types is populated
    const filteredData = data.filter(template => {
      // If no material types are specified, the template is applicable to all
      if (!template.applicable_material_types || template.applicable_material_types.length === 0) {
        return true;
      }
      // Check if the material type is in the applicable types
      return template.applicable_material_types.includes(materialType);
    });
    
    console.log('Filtered templates by material type:', filteredData);
    
    // Get public URLs for each template
    const templatesWithUrls = await Promise.all(
      filteredData.map(async template => {
        const { data: { publicUrl } } = supabase.storage
          .from('templates')
          .getPublicUrl(template.file_path);
        
        console.log(`Generated public URL for ${template.template_name}:`, publicUrl);
        
        return {
          ...template,
          file_path: publicUrl
        };
      })
    );
    
    console.log('Final templates with URLs:', templatesWithUrls);
    
    return templatesWithUrls as Template[];
  } catch (err) {
    console.error('Error in getApplicableTemplates:', err);
    return [];
  }
};