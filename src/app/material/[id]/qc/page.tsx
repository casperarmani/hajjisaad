'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { supabase, Material, Certificate, getUserEmailById, uploadCertificate, getCertificates } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';

interface QCForm {
  comments: string;
  decision: 'approve' | 'reject';
}

export default function QCInspection() {
  const { id } = useParams();
  const router = useRouter();
  const { user, userRole } = useAuth();
  const [material, setMaterial] = useState<Material | null>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<QCForm>({
    defaultValues: {
      comments: '',
      decision: 'approve'
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch material
        const { data: materialData, error: materialError } = await supabase
          .from('materials')
          .select('*')
          .eq('id', id)
          .single();
        
        if (materialError) throw materialError;
        setMaterial(materialData as Material);
        
        // Check if the material is in the correct stage
        // Allow it for rejected materials as well - for recovery
        if (materialData.current_stage !== 'review' && 
            materialData.status !== 'rejected' && 
            userRole !== 'uncle') {
          setError('This material is not in the review stage and cannot be QC inspected.');
        }
        
        // Fetch tests
        const { data: testsData, error: testsError } = await supabase
          .from('tests')
          .select('*')
          .eq('material_id', id)
          .order('performed_at', { ascending: false });
        
        if (testsError) throw testsError;
        setTests(testsData || []);
        
        // Note: test_reviews table doesn't exist in schema
        // We're working directly with the material status
        setReviews([]);
        
        // Fetch certificates for this material
        const certificatesData = await getCertificates(id as string);
        setCertificates(certificatesData);
        
        // Collect all unique user IDs from the data
        const userIds = new Set<string>();
        
        // Add test performer IDs
        testsData?.forEach(test => {
          if (test.performed_by) userIds.add(test.performed_by);
        });
        
        // Add certificate uploader IDs
        certificatesData.forEach(cert => {
          if (cert.uploaded_by) userIds.add(cert.uploaded_by);
        });
        
        // Fetch emails for all user IDs
        const emailMap: Record<string, string> = {};
        
        for (const userId of userIds) {
          if (userId) {
            const email = await getUserEmailById(userId);
            if (email) {
              emailMap[userId] = email;
            }
          }
        }
        
        setUserEmails(emailMap);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load material data');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
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
  
  // Handle certificate upload
  const handleFileUpload = async () => {
    if (!selectedFile || !user || !material) return;
    
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    
    try {
      const certificate = await uploadCertificate(
        id as string,
        selectedFile,
        user.id
      );
      
      if (certificate) {
        // Add the new certificate to the list
        setCertificates(prev => [certificate, ...prev]);
        setUploadSuccess(true);
        setSelectedFile(null);
        
        // Reset the file input
        const fileInput = document.getElementById('certificate-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setUploadError('Failed to upload certificate. Please try again.');
      }
    } catch (err: any) {
      console.error('Error uploading certificate:', err);
      setUploadError(err.message || 'An error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit: SubmitHandler<QCForm> = async (data) => {
    if (!material) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Create QC inspection record
      const { error: qcError } = await supabase
        .from('qc_inspections')
        .insert({
          material_id: id,
          inspected_by: user?.id || null, // Use ID since inspected_by is UUID in schema
          comments: data.comments,
          status: data.decision
        });
      
      if (qcError) throw qcError;
      
      // Update material stage
      let updateData: any = {
        // No updated_at field in schema
      };
      
      if (data.decision === 'approve') {
        updateData.current_stage = 'qc';
        // If approving a previously rejected material, reset its status
        if (material?.status === 'rejected') {
          updateData.status = 'in_progress';
        }
      } else {
        // When rejecting, set status to rejected AND reset current_stage to received
        updateData.status = 'rejected';
        updateData.current_stage = 'received';
      }
      
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
      console.error('Error submitting QC inspection:', err);
      setError(err.message || 'An error occurred while submitting QC inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
      case 'approve':
        return 'bg-green-100 text-green-800';
      case 'rejected':
      case 'reject':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
  if (userRole !== 'qc' && userRole !== 'uncle') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="text-center py-6">
              <p className="text-red-500">You do not have permission to perform QC inspections.</p>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">QC Inspection</h1>
          <p className="text-gray-500 mb-6">Material: {material.type}</p>
          
          {success ? (
            <div className="bg-green-50 border-l-4 border-green-500 p-4">
              <p className="text-green-700">QC inspection submitted successfully! Redirecting to material details...</p>
            </div>
          ) : (
            <>
              {/* Test Results Section */}
              <div className="mb-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Test Results</h2>
                {tests.length > 0 ? (
                  <div className="bg-gray-50 rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Test Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Result
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Performed By
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tests.map((test) => (
                          <tr key={test.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {test.test_type}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {test.result}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass('completed')}`}>
                                Completed
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {userEmails[test.performed_by] || test.performed_by || 'Unknown'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">No tests have been performed yet.</p>
                )}
              </div>
              
              {/* Certificate Upload Section */}
              <div className="mb-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Certificates</h2>
                <div className="bg-gray-50 rounded-md p-4 mb-4">
                  <h3 className="text-md font-medium text-gray-900 mb-2">Upload Quality Certificate</h3>
                  
                  {uploadSuccess && (
                    <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-3">
                      <p className="text-green-700">Certificate uploaded successfully!</p>
                    </div>
                  )}
                  
                  {uploadError && (
                    <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3">
                      <p className="text-red-700">{uploadError}</p>
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <label htmlFor="certificate-file" className="block text-sm font-medium text-gray-700 mb-1">
                      Select Certificate File (PDF, JPEG, PNG, DOC, etc.)
                    </label>
                    <input
                      id="certificate-file"
                      type="file"
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    />
                    {selectedFile && (
                      <p className="mt-1 text-sm text-gray-500">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleFileUpload}
                    disabled={!selectedFile || uploading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium transition disabled:bg-indigo-400"
                  >
                    {uploading ? 'Uploading...' : 'Upload Certificate'}
                  </button>
                </div>
                
                {certificates.length > 0 ? (
                  <div className="bg-white border border-gray-200 rounded-md">
                    <div className="divide-y divide-gray-200">
                      <div className="px-4 py-3 bg-gray-50">
                        <h3 className="text-sm font-medium text-gray-700">Uploaded Certificates</h3>
                      </div>
                      
                      <ul className="divide-y divide-gray-200">
                        {certificates.map(cert => (
                          <li key={cert.id} className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="text-indigo-500 mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </span>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{cert.file_name}</p>
                                <p className="text-xs text-gray-500">
                                  Uploaded by {userEmails[cert.uploaded_by] || 'Unknown'} on {new Date(cert.uploaded_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <a 
                              href={cert.file_path} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 text-sm"
                            >
                              View
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No certificates uploaded yet.</p>
                )}
              </div>
              
              {/* Manager Reviews Section - replaced since test_reviews table doesn't exist in schema */}
              <div className="mb-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Material Review Status</h2>
                <div className="bg-gray-50 rounded-md p-4">
                  {material.status === 'rejected' ? (
                    <>
                      <p className="text-gray-700 mb-2">This material was previously rejected and needs to be re-inspected.</p>
                      <div className="mt-2">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass('rejected')}`}>
                          Rejected - Needs Re-inspection
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-700">This material has been reviewed and is ready for QC inspection.</p>
                      <div className="mt-2">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass('completed')}`}>
                          Approved for QC
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-1">
                    QC Comments
                  </label>
                  <textarea
                    id="comments"
                    rows={4}
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter your QC inspection comments"
                    {...register('comments')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    QC Decision
                  </label>
                  <div className="mt-1 space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-indigo-600"
                        value="approve"
                        {...register('decision')}
                      />
                      <span className="ml-2 text-gray-700">Approve and Send to Accounting</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-red-600"
                        value="reject"
                        {...register('decision')}
                      />
                      <span className="ml-2 text-gray-700">Reject</span>
                    </label>
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
                    disabled={submitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium transition disabled:bg-indigo-400"
                  >
                    {submitting ? 'Submitting...' : 'Submit QC Inspection'}
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