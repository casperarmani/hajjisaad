'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase, Material, MaterialStage, Certificate, getUserEmailById, getCertificates } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';
import { QRCodeCanvas } from 'qrcode.react';

// Material stage display names
const stageNames: Record<MaterialStage, string> = {
  received: 'Received',
  testing: 'Testing',
  review: 'Review',
  qc: 'Quality Control',
  accounting: 'Accounting',
  final_approval: 'Final Approval',
  completed: 'Completed'
};

export default function MaterialDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { user, userRole } = useAuth();
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [qcResults, setQcResults] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchMaterialData = async () => {
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
        
        // Fetch tests (standard approach)
        const { data: testsData, error: testsError } = await supabase
          .from('tests')
          .select('*')
          .eq('material_id', id);
        
        if (testsError) throw testsError;
        setTests(testsData || []);
        
        // Fetch QC inspections
        const { data: qcData, error: qcError } = await supabase
          .from('qc_inspections')
          .select('*')
          .eq('material_id', id);
        
        if (qcError) throw qcError;
        setQcResults(qcData || []);
        
        // Fetch quotes
        const { data: quotesData, error: quotesError } = await supabase
          .from('quotes')
          .select('*')
          .eq('material_id', id);
        
        if (quotesError) throw quotesError;
        setQuotes(quotesData || []);
        
        // Fetch certificates
        const certificatesData = await getCertificates(id as string);
        setCertificates(certificatesData);
        
        // Collect all unique user IDs from the data
        const userIds = new Set<string>();
        
        // Add test performer IDs
        testsData?.forEach(test => {
          if (test.performed_by) userIds.add(test.performed_by);
        });
        
        // Add QC inspector IDs
        qcData?.forEach(qc => {
          if (qc.inspected_by) userIds.add(qc.inspected_by);
        });
        
        // Add quote creator IDs
        quotesData?.forEach(quote => {
          if (quote.created_by) userIds.add(quote.created_by);
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
            } else {
              emailMap[userId] = 'Unknown User';
            }
          }
        }
        
        setUserEmails(emailMap);
        
      } catch (err: any) {
        console.error('Error fetching material data:', err);
        setError(err.message || 'Failed to load material data');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMaterialData();
    }
  }, [id]);

  const getNextStageLink = (material: Material) => {
    // If material is rejected, allow returning to previous stage based on current stage
    if (material.status === 'rejected') {
      switch (material.current_stage) {
        case 'received':
          return `/material/${material.id}/test`;
        case 'testing':
          return `/material/${material.id}/test`; // Return to testing if rejection happened in review
        case 'review':
          return `/material/${material.id}/review`; // Return to review if rejection happened in QC
        case 'qc':
          return `/material/${material.id}/qc`; // Return to QC if rejection happened in accounting
        case 'accounting':
          return `/material/${material.id}/accounting`; // Return to accounting if rejected in final approval
        default:
          return `/material/${material.id}`;
      }
    }
    
    // Normal flow for non-rejected materials
    switch (material.current_stage) {
      case 'received':
        return `/material/${material.id}/test`;
      case 'testing':
        return `/material/${material.id}/review`;
      case 'review':
        return `/material/${material.id}/qc`;
      case 'qc':
        return `/material/${material.id}/accounting`;
      case 'accounting':
        return `/material/${material.id}/approve`;
      case 'final_approval':
        return `/material/${material.id}/complete`;
      default:
        return `/material/${material.id}`;
    }
  };

  const getNextStageAction = (stage: MaterialStage, isRejected: boolean = false) => {
    if (isRejected) {
      switch (stage) {
        case 'testing':
          return 'Fix and Resubmit Tests';
        case 'review':
          return 'Re-review Material';
        case 'qc':
          return 'Re-inspect Material';
        case 'accounting':
          return 'Fix Quote Issues';
        case 'final_approval':
          return 'Re-approve Material';
        default:
          return 'Fix Rejected Material';
      }
    }
    
    // Normal flow for non-rejected materials
    switch (stage) {
      case 'received':
        return 'Perform Tests';
      case 'testing':
        return 'Review Results';
      case 'review':
        return 'QC Inspection';
      case 'qc':
        return 'Generate Quote';
      case 'accounting':
        return 'Final Approval';
      case 'final_approval':
        return 'Mark as Completed';
      default:
        return 'View';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
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

  if (error || !material) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-red-500">{error || 'Material not found'}</p>
            <Link href="/dashboard" className="mt-4 inline-block text-indigo-600">
              Return to Dashboard
            </Link>
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
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800">
            &larr; Back to Dashboard
          </Link>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2 md:mb-0">
              Material: {material.type}
            </h1>
            
            <div className="flex items-center">
              <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadgeClass(material.status)} mr-3`}>
                {material.status ? material.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown'}
              </span>
              
              <span className="text-sm bg-indigo-100 text-indigo-800 py-1 px-3 rounded-full">
                {stageNames[material.current_stage]}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Material Information</h2>
                <div className="bg-gray-50 rounded-md p-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <p className="text-sm text-gray-500">Material Type</p>
                      <p>{material.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Material ID</p>
                      <p>{material.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Received Date</p>
                      <p>{new Date(material.received_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">Client Information</h2>
                <div className="bg-gray-50 rounded-md p-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <p className="text-sm text-gray-500">Customer Name</p>
                      <p>{material.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Customer Contact</p>
                      <p>{material.customer_contact}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">QR Code</h2>
                <div className="bg-gray-50 rounded-md p-4 flex justify-center items-center">
                  <div className="text-center">
                    <QRCodeCanvas 
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/material/${material.id}`} 
                      size={150}
                      className="mx-auto"
                    />
                    <p className="mt-2 text-sm text-gray-500">Scan to view material details</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">Actions</h2>
                <div className="bg-gray-50 rounded-md p-4">
                  {material.current_stage !== 'completed' && (
                    <Link
                      href={getNextStageLink(material)}
                      className={`block w-full text-center py-2 px-4 ${
                        material.status === 'rejected' 
                          ? 'bg-red-600 hover:bg-red-700' 
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      } text-white rounded-md shadow-sm text-sm font-medium transition mb-3`}
                    >
                      {getNextStageAction(material.current_stage, material.status === 'rejected')}
                    </Link>
                  )}
                  
                  {quotes.length > 0 && (
                    <button
                      onClick={() => {/* PDF generation logic */}}
                      className="block w-full text-center py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md shadow-sm text-sm font-medium transition mb-3"
                    >
                      Download Certificate
                    </button>
                  )}
                  
                  {/* Special admin recovery option for uncle role or when material is in invalid state */}
                  {(userRole === 'uncle' || material.status === 'rejected') && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-500 mb-2">Admin Recovery Options</p>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('materials')
                                .update({
                                  current_stage: 'received',
                                  status: 'pending'
                                })
                                .eq('id', material.id);
                                
                              if (error) throw error;
                              alert('Material reset to received stage successfully!');
                              router.refresh();
                              window.location.reload(); // Force full page reload to ensure all state is updated
                            } catch (err) {
                              console.error('Error resetting material:', err);
                              alert('Failed to reset material. See console for details.');
                            }
                          }}
                          className="w-full text-center py-2 px-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md shadow-sm text-xs font-medium transition"
                        >
                          Reset to Received Stage
                        </button>
                        
                        <button
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('materials')
                                .update({
                                  current_stage: 'testing',
                                  status: 'in_progress'
                                })
                                .eq('id', material.id);
                                
                              if (error) throw error;
                              alert('Material reset to testing stage successfully!');
                              router.refresh();
                              window.location.reload(); // Force full page reload to ensure all state is updated
                            } catch (err) {
                              console.error('Error resetting material:', err);
                              alert('Failed to reset material. See console for details.');
                            }
                          }}
                          className="w-full text-center py-2 px-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md shadow-sm text-xs font-medium transition"
                        >
                          Reset to Testing Stage
                        </button>
                        
                        <button
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('materials')
                                .update({
                                  current_stage: 'review',
                                  status: 'in_progress'
                                })
                                .eq('id', material.id);
                                
                              if (error) throw error;
                              alert('Material reset to review stage successfully!');
                              router.refresh();
                              window.location.reload(); // Force full page reload to ensure all state is updated
                            } catch (err) {
                              console.error('Error resetting material:', err);
                              alert('Failed to reset material. See console for details.');
                            }
                          }}
                          className="w-full text-center py-2 px-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md shadow-sm text-xs font-medium transition"
                        >
                          Reset to Review Stage
                        </button>
                        
                        <button
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('materials')
                                .update({
                                  current_stage: 'qc',
                                  status: 'in_progress'
                                })
                                .eq('id', material.id);
                                
                              if (error) throw error;
                              alert('Material reset to QC stage successfully!');
                              router.refresh();
                              window.location.reload(); // Force full page reload to ensure all state is updated
                            } catch (err) {
                              console.error('Error resetting material:', err);
                              alert('Failed to reset material. See console for details.');
                            }
                          }}
                          className="w-full text-center py-2 px-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md shadow-sm text-xs font-medium transition"
                        >
                          Reset to QC Stage
                        </button>
                        
                        <button
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('materials')
                                .update({
                                  current_stage: 'accounting',
                                  status: 'in_progress'
                                })
                                .eq('id', material.id);
                                
                              if (error) throw error;
                              alert('Material reset to Accounting stage successfully!');
                              router.refresh();
                              window.location.reload(); // Force full page reload to ensure all state is updated
                            } catch (err) {
                              console.error('Error resetting material:', err);
                              alert('Failed to reset material. See console for details.');
                            }
                          }}
                          className="w-full text-center py-2 px-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md shadow-sm text-xs font-medium transition"
                        >
                          Reset to Accounting Stage
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Test Results Section */}
        {tests.length > 0 && (
          <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Test Results</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
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
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(material.status)}`}>
                          {material.status ? material.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {userEmails[test.performed_by] || test.performed_by || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(test.performed_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* QC Inspection Results */}
        {qcResults.length > 0 && (
          <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">QC Inspection Results</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inspector
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comments
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {qcResults.map((qc) => (
                    <tr key={qc.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {userEmails[qc.inspected_by] || qc.inspector_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(qc.status)}`}>
                          {qc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {qc.comments}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(qc.inspected_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Certificates Section */}
        {certificates.length > 0 && (
          <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quality Certificates</h2>
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <ul className="divide-y divide-gray-200">
                {certificates.map(cert => (
                  <li key={cert.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-indigo-500 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-sm font-medium transition"
                    >
                      Download Certificate
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {/* Quotes - only visible to accounting and uncle roles */}
        {quotes.length > 0 && (userRole === 'uncle' || userRole === 'accounting') && (
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quotes</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quote ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quotes.map((quote) => (
                    <tr key={quote.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {quote.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${quote.amount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass('pending')}`}>
                          Pending
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {userEmails[quote.created_by] || quote.created_by || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(quote.created_at || new Date()).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}