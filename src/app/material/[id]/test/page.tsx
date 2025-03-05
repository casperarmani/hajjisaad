'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { supabase, Material } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';
import { QRCodeCanvas } from 'qrcode.react';

interface TestForm {
  tests: {
    test_type: string;
    result: string;
    notes: string;
  }[];
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
  const { register, control, handleSubmit, formState: { errors } } = useForm<TestForm>({
    defaultValues: {
      tests: [{ test_type: '', result: '', notes: '' }]
    }
  });
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tests'
  });


  useEffect(() => {
    const fetchMaterial = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase
          .from('materials')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        
        setMaterial(data as Material);
        
        // Set QR code value (URL to the material)
        if (typeof window !== 'undefined') {
          // Use the material's qr_code field directly if it exists, otherwise build URL
          setQrCodeValue(data.qr_code || `${window.location.origin}/material/${data.id}`);
        }
        
        // Check if the material is in the correct stage
        if (data.current_stage !== 'received') {
          setError('This material is not in the received stage and cannot be tested.');
        }
      } catch (err: any) {
        console.error('Error fetching material:', err);
        setError(err.message || 'Failed to load material data');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMaterial();
    }
  }, [id]);

  const onSubmit = async (data: TestForm) => {
    if (!material) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Format tests with material_id and performed_by
      // Only include fields that exist in the database schema
      const testsWithMetadata = data.tests.map(test => ({
        test_type: test.test_type,
        result: test.result,
        material_id: id,
        performed_by: user?.id || null, // Use ID since performed_by is UUID in schema
        // 'notes' field is omitted as it doesn't exist in the database schema
        // 'status' field is omitted as it doesn't exist in the database schema
      }));
      
      // Insert tests
      const { error: testsError } = await supabase
        .from('tests')
        .insert(testsWithMetadata);
      
      if (testsError) throw testsError;
      
      // Update material stage to 'testing' and reset rejected status if present
      const updateData = {
        current_stage: 'testing',
        status: 'in_progress'
        // No updated_at in schema
      };

      // Reset the status from 'rejected' to 'in_progress' when resubmitting tests
      const { error: materialError } = await supabase
        .from('materials')
        .update(updateData)
        .eq('id', id);
      
      if (materialError) throw materialError;
      
      setSuccess(true);
      
      // Redirect after short delay
      setTimeout(() => {
        router.push(`/material/${id}`);
      }, 2000);
      
    } catch (err: any) {
      console.error('Error submitting tests:', err);
      setError(err.message || 'An error occurred while submitting test results.');
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Perform Tests</h1>
          <p className="text-gray-500 mb-6">Material: {material.type}</p>
          
          {success ? (
            <div className="bg-green-50 border-l-4 border-green-500 p-4">
              <p className="text-green-700">Tests submitted successfully! Redirecting to material details...</p>
            </div>
          ) : (
            <>
              {/* Material QR Code display section */}
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Material QR Code</h2>
                <p className="text-sm text-gray-500 mb-3">This QR code uniquely identifies this material throughout the testing process.</p>
                
                <div className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-md shadow-sm">
                  <div className="mb-3">
                    {qrCodeValue ? (
                      <QRCodeCanvas 
                        value={qrCodeValue}
                        size={180}
                        bgColor={"#ffffff"}
                        fgColor={"#000000"}
                        includeMargin={true}
                        level={"H"} // High error correction
                      />
                    ) : (
                      <div className="w-[180px] h-[180px] bg-gray-100 flex items-center justify-center">
                        <p className="text-gray-400">Loading QR code...</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">Material ID: {id}</p>
                    <p className="text-xs text-gray-500 mt-1">Keep this QR code with the material for identification</p>
                  </div>
                  
                  <button 
                    className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-sm font-medium transition flex items-center"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.print();
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print QR Code
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Test Results</h2>
                  
                  {fields.map((field, index) => (
                    <div key={field.id} className="bg-gray-50 rounded-md p-4 mb-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-md font-medium">Test #{index + 1}</h3>
                        
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label htmlFor={`tests.${index}.test_type`} className="block text-sm font-medium text-gray-700 mb-1">
                            Test Type *
                          </label>
                          <input
                            id={`tests.${index}.test_type`}
                            type="text"
                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Enter test type"
                            {...register(`tests.${index}.test_type` as const, { required: 'Test type is required' })}
                          />
                          {errors.tests?.[index]?.test_type && (
                            <p className="mt-1 text-sm text-red-600">{errors.tests[index].test_type?.message}</p>
                          )}
                        </div>
                        
                        <div>
                          <label htmlFor={`tests.${index}.result`} className="block text-sm font-medium text-gray-700 mb-1">
                            Result *
                          </label>
                          <input
                            id={`tests.${index}.result`}
                            type="text"
                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Test result with value and unit"
                            {...register(`tests.${index}.result` as const, { required: 'Test result is required' })}
                          />
                          {errors.tests?.[index]?.result && (
                            <p className="mt-1 text-sm text-red-600">{errors.tests[index].result?.message}</p>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor={`tests.${index}.notes`} className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <textarea
                          id={`tests.${index}.notes`}
                          rows={2}
                          className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Additional notes or observations"
                          {...register(`tests.${index}.notes` as const)}
                        />
                      </div>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => append({ test_type: '', result: '', notes: '' })}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md shadow-sm text-sm font-medium transition"
                  >
                    Add Another Test
                  </button>
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
                    disabled={submitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium transition disabled:bg-indigo-400"
                  >
                    {submitting ? 'Submitting...' : 'Submit Test Results'}
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