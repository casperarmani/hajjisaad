'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase, Material, MaterialStage } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';
import QRCode from 'qrcode.react';

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
        
        // Fetch tests
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

  const getNextStageAction = (stage: MaterialStage) => {
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
              {material.name}
            </h1>
            
            <div className="flex items-center">
              <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadgeClass(material.status)} mr-3`}>
                {material.status.replace('_', ' ')}
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
                      <p>{material.material_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Description</p>
                      <p>{material.description}</p>
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
                      <p className="text-sm text-gray-500">Client Name</p>
                      <p>{material.client_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Client Email</p>
                      <p>{material.client_email}</p>
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
                    <QRCode 
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
                      className="block w-full text-center py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium transition mb-3"
                    >
                      {getNextStageAction(material.current_stage)}
                    </Link>
                  )}
                  
                  {quotes.length > 0 && (
                    <button
                      onClick={() => {/* PDF generation logic */}}
                      className="block w-full text-center py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md shadow-sm text-sm font-medium transition"
                    >
                      Download Certificate
                    </button>
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
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(test.status)}`}>
                          {test.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {test.performed_by}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(test.created_at).toLocaleDateString()}
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
                        {qc.inspector_name}
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
                        {new Date(qc.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Quotes */}
        {quotes.length > 0 && (
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
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(quote.status)}`}>
                          {quote.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {quote.created_by}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(quote.created_at).toLocaleDateString()}
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