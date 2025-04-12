'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { supabase, Material, Template, uploadTestDocument, getApplicableTemplates } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';
import { QRCodeCanvas } from 'qrcode.react';
import Modal from 'react-modal';

// Bind Modal to app root for accessibility
if (typeof window !== 'undefined') {
  // In Next.js, we'll use body as the app element
  Modal.setAppElement('body');
}

interface TestForm {
  test_type: string;
  summary_result: string;
}

export default function TestMaterial() {
  const { id } = useParams();
  const router = useRouter();
  const { user, userRole } = useAuth();
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState<string>('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // We'll use submitting state instead of separate uploading state
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors } } = useForm<TestForm>({
    defaultValues: {
      test_type: '',
      summary_result: ''
    }
  });

  useEffect(() => {
    const fetchMaterialAndTemplates = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch material
        const { data, error } = await supabase
          .from('materials')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        
        setMaterial(data as Material);
        
        // Set QR code value (URL to the material)
        if (typeof window !== 'undefined') {
          // Build URL using material ID for QR code
          setQrCodeValue(`${window.location.origin}/material/${data.id}`);
        }
        
        // Check if the material is in the correct stage
        if (data.current_stage !== 'received') {
          setError('This material is not in the received stage and cannot be tested.');
        }
        
        // Fetch applicable templates for this material type
        const templatesData = await getApplicableTemplates(data.type);
        setTemplates(templatesData);
        
      } catch (err: any) {
        console.error('Error fetching material:', err);
        setError(err.message || 'Failed to load material data');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMaterialAndTemplates();
    }
  }, [id]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setUploadError(null);
    }
  };

  const onSubmit = async (data: TestForm) => {
    if (!material || !selectedFile || !user) {
      setError('Missing required information. Please select a file and fill all required fields.');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    setUploadError(null);
    
    try {
      console.log('Starting test document submission process');
      console.log('Material:', material.id, material.type);
      console.log('File selected:', selectedFile.name, selectedFile.type, `${(selectedFile.size / 1024).toFixed(2)} KB`);
      
      // 1. Upload the file to Supabase Storage
      console.log('Initiating file upload...');
      const fileData = await uploadTestDocument(
        id as string,
        selectedFile,
        user.id
      );
      
      console.log('Upload result:', fileData);
      
      if (!fileData) {
        console.error('File upload returned null without error');
        throw new Error('File upload failed - check console for details');
      }
      
      // 2. Create test record with the file information
      console.log('Creating database record for test...');
      const testData = {
        test_type: data.test_type,
        result: data.summary_result || null, // Optional summary
        material_id: id,
        performed_by: user.id,
        file_path: fileData.path,
        file_name: fileData.name,
        file_type: fileData.type,
        file_size: fileData.size
      };
      
      console.log('Test data to insert:', testData);
      
      // Insert test
      const insertResult = await supabase
        .from('tests')
        .insert([testData]);
      
      console.log('Test record insert result:', insertResult);
      
      const { error: testsError } = insertResult;
      
      if (testsError) {
        console.error('Database insert error:', testsError);
        
        // Log detailed error information
        if (testsError.code) {
          console.error('Error details:', {
            message: testsError.message,
            code: testsError.code,
            details: testsError.details,
            hint: testsError.hint
          });
        }
        
        throw testsError;
      }
      
      // 3. Update material stage to 'testing' and reset rejected status if present
      console.log('Updating material status...');
      const updateData = {
        current_stage: 'testing',
        status: 'in_progress'
      };

      // Reset the status from 'rejected' to 'in_progress' when resubmitting tests
      const updateResult = await supabase
        .from('materials')
        .update(updateData)
        .eq('id', id);
      
      console.log('Material update result:', updateResult);
      
      const { error: materialError } = updateResult;
      
      if (materialError) {
        console.error('Material update error:', materialError);
        throw materialError;
      }
      
      console.log('Test submission complete!');
      setSuccess(true);
      
      // Redirect after short delay
      setTimeout(() => {
        router.push(`/material/${id}`);
      }, 2000);
      
    } catch (err: any) {
      console.error('Error submitting test:', err);
      
      // Detailed error logging
      if (err instanceof Error) {
        console.error('Error details:', {
          message: err.message,
          name: err.name,
          stack: err.stack
        });
      } else if (err === null) {
        console.error('Error is null - likely an API failure');
      } else if (typeof err === 'object' && Object.keys(err).length === 0) {
        console.error('Error is an empty object - this often means a CORS, network, or permission issue');
        setError('Storage permission or network error. Check if the "test-documents" bucket exists and has correct permissions.');
        return;
      } else {
        console.error('Unknown error type:', err);
      }
      
      // Provide a more meaningful error message to the user
      if (err.message && err.message.includes('storage')) {
        setError('File upload failed: Storage error. Please ensure the storage bucket is properly configured.');
      } else if (err.message && err.message.includes('permission')) {
        setError('Permission denied: You do not have permission to upload files. Please check your account permissions.');
      } else if (err.message && err.message.includes('bucket')) {
        setError('The storage bucket "test-documents" does not exist or is not accessible.');
      } else {
        setError(err.message || 'An error occurred while submitting test results. Please try again or contact support.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="spinner"></div>
            <p className="mt-2 text-gray-500">Loading material details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!material || error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="text-center py-6">
              <p className="text-red-500">{error || 'Material not found'}</p>
              <Link href="/dashboard" className="mt-4 inline-block text-indigo-600">
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check role access
  if (userRole !== 'tester' && userRole !== 'uncle') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="text-center py-6">
              <p className="text-red-500">You do not have permission to perform tests on materials.</p>
              <Link href="/dashboard" className="mt-4 inline-block text-indigo-600">
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href={`/material/${id}`} className="text-indigo-600 hover:text-indigo-800">
            &larr; Back to Material Details
          </Link>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Submit Test Document</h1>
          <p className="text-gray-500 mb-6">Material: {material.type}</p>
          
          {success ? (
            <div className="bg-green-50 border-l-4 border-green-500 p-4">
              <p className="text-green-700">Test document submitted successfully! Redirecting to material details...</p>
            </div>
          ) : (
            <>
              {/* Material verification - smaller and less prominent */}
              <div className="mb-6 border-b border-gray-200 pb-4">
                <div className="flex items-center">
                  <div className="mr-4">
                    {qrCodeValue ? (
                      <QRCodeCanvas 
                        value={qrCodeValue}
                        size={80}
                        bgColor={"#ffffff"}
                        fgColor={"#000000"}
                        level={"M"} 
                      />
                    ) : (
                      <div className="w-[80px] h-[80px] bg-gray-100 flex items-center justify-center">
                        <p className="text-gray-400 text-xs">Loading...</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Material Verification</h3>
                    <p className="text-xs text-gray-500">ID: {id}</p>
                    <p className="text-xs text-gray-500 mt-1">Type: {material.type}</p>
                    <p className="text-xs text-gray-500">Customer: {material.customer_name}</p>
                  </div>
                </div>
              </div>
              
              {/* Templates Section */}
              <div className="mb-8">
                <h2 className="text-xl font-medium text-gray-900 mb-4">Test Templates</h2>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                  <p className="text-blue-700">
                    Download a blank template below, fill it out in Excel, Word or another program, and then upload the completed document.
                  </p>
                </div>
                
                {templates.length > 0 ? (
                  <div className="bg-gray-50 rounded-md p-4">
                    <h3 className="text-md font-medium text-gray-700 mb-3">Available Templates</h3>
                    <div className="space-y-3">
                      {templates.map((template) => (
                        <div key={template.id} className="flex items-center justify-between border-b border-gray-200 pb-3">
                          <div>
                            <p className="font-medium text-gray-800">{template.template_name}</p>
                            <p className="text-sm text-gray-500">{template.description}</p>
                          </div>
                          <a 
                            href={template.file_path} 
                            download
                            className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-md text-sm transition"
                          >
                            Download Template
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-md p-4">
                    <p className="text-gray-500">No templates are currently available. You can upload any document format for this test.</p>
                  </div>
                )}
              </div>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="bg-gray-50 rounded-md p-4">
                  <h3 className="text-md font-medium text-gray-700 mb-4">Upload Test Document</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label htmlFor="test_type" className="block text-sm font-medium text-gray-700 mb-1">
                        Test Type / Report Name *
                      </label>
                      <input
                        id="test_type"
                        type="text"
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="E.g., Compressive Strength Report"
                        {...register('test_type', { required: 'Test type is required' })}
                      />
                      {errors.test_type && (
                        <p className="mt-1 text-sm text-red-600">{errors.test_type.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="summary_result" className="block text-sm font-medium text-gray-700 mb-1">
                        Summary Result (Optional)
                      </label>
                      <input
                        id="summary_result"
                        type="text"
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="E.g., Pass/Fail or key measurement"
                        {...register('summary_result')}
                      />
                    </div>
                  </div>
                  
                  
                  <div className="mb-6">
                    <label htmlFor="test-document-file" className="block text-sm font-medium text-gray-700 mb-1">
                      Test Document File *
                    </label>
                    <input
                      id="test-document-file"
                      type="file"
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      required
                    />
                    {selectedFile && (
                      <p className="mt-2 text-sm text-gray-500">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                    {uploadError && (
                      <p className="mt-1 text-sm text-red-600">{uploadError}</p>
                    )}
                  </div>
                  
                </div>
                
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4">
                    <p className="text-red-700">{error}</p>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Link
                    href={`/material/${id}`}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md shadow-sm text-sm font-medium transition mr-3"
                  >
                    Cancel
                  </Link>
                  
                  <button
                    type="submit"
                    disabled={submitting || !selectedFile}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium transition disabled:bg-indigo-400"
                  >
                    {submitting ? 'Uploading...' : 'Submit Test Document'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}