'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase, Material, MaterialStage, Certificate, getUserEmailById, getCertificates } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';

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

// Material stages in order for progress tracking
const stageOrder: MaterialStage[] = [
  'received',
  'testing',
  'review',
  'qc',
  'accounting',
  'final_approval',
  'completed'
];

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
  
  // Function to generate and download a quote PDF
  const downloadQuotePdf = (quote: any) => {
    if (!material) return;
    
    try {
      // Create a new PDF document
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('Official Quote', 105, 20, { align: 'center' });
      
      // Add company logo/header
      doc.setFontSize(16);
      doc.text('Materials Testing Laboratory', 105, 30, { align: 'center' });
      
      // Add line
      doc.setLineWidth(0.5);
      doc.line(20, 35, 190, 35);
      
      // Material details
      doc.setFontSize(12);
      doc.text('Material Details', 20, 45);
      doc.setFontSize(10);
      doc.text(`Material ID: ${material.id}`, 20, 55);
      doc.text(`Material Type: ${material.type}`, 20, 62);
      doc.text(`Customer: ${material.customer_name}`, 20, 69);
      doc.text(`Contact: ${material.customer_contact}`, 20, 76);
      doc.text(`Received Date: ${new Date(material.received_date).toLocaleDateString()}`, 20, 83);
      
      // Quote details
      doc.setFontSize(12);
      doc.text('Quote Details', 20, 95);
      doc.setFontSize(10);
      doc.text(`Quote ID: ${quote.id}`, 20, 105);
      doc.text(`Amount: $${quote.amount}`, 20, 112);
      doc.text(`Created Date: ${new Date(quote.created_at).toLocaleDateString()}`, 20, 119);
      doc.text(`Created By: ${userEmails[quote.created_by] || 'Staff Member'}`, 20, 126);
      
      // Terms and conditions
      doc.setFontSize(12);
      doc.text('Terms and Conditions', 20, 140);
      doc.setFontSize(9);
      const terms = [
        '1. This quote is valid for 30 days from the date of issue.',
        '2. Payment terms: 50% advance, 50% upon completion.',
        '3. Testing will commence upon receipt of advance payment.',
        '4. Testing timeline: 5-7 business days from payment receipt.',
        '5. Additional tests may incur extra charges.',
        '6. All test results will be provided in a detailed certificate.'
      ];
      
      terms.forEach((term, index) => {
        doc.text(term, 20, 150 + (index * 7));
      });
      
      // Footer
      doc.setFontSize(8);
      doc.text('Generated by Materials Testing Laboratory Management System', 105, 280, { align: 'center' });
      doc.text(`Download date: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });
      
      // Save the PDF
      doc.save(`Quote-${material.id}-${quote.id}.pdf`);
    } catch (err) {
      console.error('Error generating quote PDF:', err);
      alert('Failed to generate quote PDF. Please try again.');
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
          
          {/* Material Progress Bar - Shadcn UI Style */}
          <div className="mb-12 mt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-3">
              <h2 className="text-xl font-semibold text-zinc-900 flex items-center">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2">
                  <path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L11.8536 6.14645C12.0488 6.34171 12.0488 6.65829 11.8536 6.85355L8.85355 9.85355C8.65829 10.0488 8.34171 10.0488 8.14645 9.85355C7.95118 9.65829 7.95118 9.34171 8.14645 9.14645L10.2929 7H3.5C3.22386 7 3 6.77614 3 6.5C3 6.22386 3.22386 6 3.5 6H10.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                </svg>
                Workflow Progress
              </h2>
              
              {/* Status Badges - Shadcn Style */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold transition-colors bg-zinc-900 text-white">
                  <span className="flex h-1.5 w-1.5 mr-1 rounded-full bg-green-500"></span>
                  Completed
                </div>
                <div className="inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold transition-colors border border-zinc-200 bg-white text-zinc-900">
                  <span className="flex h-1.5 w-1.5 mr-1 rounded-full bg-blue-500"></span>
                  Current
                </div>
                {material.status === 'rejected' && (
                  <div className="inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold transition-colors bg-red-500 text-white">
                    <span className="flex h-1.5 w-1.5 mr-1 rounded-full bg-white"></span>
                    Rejected
                  </div>
                )}
              </div>
            </div>
            
            <div className="relative pt-6 pb-14 mx-auto">
              {/* Card background - Shadcn card style */}
              <div className="absolute inset-0 rounded-lg border bg-card text-card-foreground shadow-sm -m-1 p-3 bg-white border-zinc-200"></div>
              
              {/* Progress Bar Track and Fill */}
              <div className="relative mx-6 mb-8">
                {/* Track (background) */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                  {/* Fill */}
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      material.status === 'rejected' ? 'bg-red-500' : 'bg-zinc-900'
                    }`}
                    style={{ 
                      width: `${(stageOrder.indexOf(material.current_stage) / (stageOrder.length - 1)) * 100}%`,
                      animation: 'progress 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  ></div>
                </div>
                
                {/* Simple progress animation */}
                <style jsx>{`
                  @keyframes progress {
                    0% { width: 0%; }
                    100% { width: ${(stageOrder.indexOf(material.current_stage) / (stageOrder.length - 1)) * 100}%; }
                  }
                `}</style>
                
                {/* Stage markers under progress bar */}
                <div className="absolute top-0 left-0 w-full flex">
                  {stageOrder.map((_, index) => (
                    <div 
                      key={`marker-${index}`} 
                      className="flex justify-center"
                      style={{ width: `${100 / (stageOrder.length - 1)}%`, marginLeft: index === 0 ? '0' : `-${50 / (stageOrder.length - 1)}%` }}
                    >
                      <div className="w-1 h-2 bg-transparent"></div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Step Markers in Shadcn style */}
              <div className="flex justify-between relative mx-6">
                {stageOrder.map((stage, index) => {
                  // Calculate status
                  const currentStageIndex = stageOrder.indexOf(material.current_stage);
                  const isCompleted = index < currentStageIndex;
                  const isCurrent = index === currentStageIndex;
                  const isRejected = material.status === 'rejected' && isCurrent;
                  const isUpcoming = index > currentStageIndex;
                  
                  return (
                    <div key={stage} className="flex flex-col items-center z-10" style={{ width: `${100 / stageOrder.length}%` }}>
                      {/* Step indicator */}
                      <div className={`
                        flex h-9 w-9 shrink-0 items-center justify-center rounded-full border
                        ${isCompleted ? 'border-zinc-900 bg-zinc-900 text-white' : ''}
                        ${isCurrent && !isRejected ? 'border-zinc-900 bg-white text-zinc-900 shadow-[0_0_0_2px_rgba(0,0,0,0.1)]' : ''}
                        ${isRejected ? 'border-red-500 bg-red-500 text-white' : ''}
                        ${isUpcoming ? 'border-zinc-200 bg-white text-zinc-400' : ''}
                        transition-colors duration-200
                      `}>
                        {isCompleted ? (
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                            <path d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                          </svg>
                        ) : isRejected ? (
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                            <path d="M8.4449 0.608765C8.0183 -0.107015 6.9817 -0.107015 6.55509 0.608766L0.161178 11.3368C-0.275824 12.07 0.252503 13 1.10608 13H13.8939C14.7475 13 15.2758 12.07 14.8388 11.3368L8.4449 0.608765ZM7.4141 1.12073C7.45288 1.05566 7.54712 1.05566 7.5859 1.12073L13.9798 11.8488C14.0196 11.9154 13.9715 12 13.8939 12H1.10608C1.02849 12 0.980454 11.9154 1.02018 11.8488L7.4141 1.12073ZM6.8269 4.48611C6.81221 4.10423 7.11783 3.78663 7.5 3.78663C7.88217 3.78663 8.18778 4.10423 8.1731 4.48612L8.01921 8.48701C8.00848 8.766 7.7792 8.98663 7.5 8.98663C7.2208 8.98663 6.99151 8.766 6.98078 8.48701L6.8269 4.48611ZM8.24989 10.476C8.24989 10.8902 7.9141 11.226 7.49989 11.226C7.08567 11.226 6.74989 10.8902 6.74989 10.476C6.74989 10.0618 7.08567 9.72599 7.49989 9.72599C7.9141 9.72599 8.24989 10.0618 8.24989 10.476Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                          </svg>
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      
                      {/* Step label - Shadcn typography */}
                      <div className={`
                        mt-3 text-center
                        ${isCurrent ? 'text-zinc-900 font-medium' : ''}
                        ${isCompleted ? 'text-zinc-900' : ''}
                        ${isRejected ? 'text-red-700 font-medium' : ''}
                        ${isUpcoming ? 'text-zinc-500' : ''}
                      `}>
                        {/* Desktop label */}
                        <div className="text-xs hidden sm:block">
                          {stageNames[stage]}
                        </div>
                        
                        {/* Mobile label */}
                        <div className="text-xs sm:hidden">
                          {stage === 'received' ? 'Rec.' : 
                           stage === 'testing' ? 'Test' : 
                           stage === 'review' ? 'Rev.' : 
                           stage === 'qc' ? 'QC' : 
                           stage === 'accounting' ? 'Acct.' : 
                           stage === 'final_approval' ? 'Aprv.' : 
                           stage === 'completed' ? 'Done' : ''}
                        </div>
                        
                        {/* Current stage status */}
                        {isCurrent && (
                          <div className={`
                            mt-1 text-[10px] px-1.5 py-0.5 rounded-full inline-flex items-center border
                            ${isRejected ? 'border-red-200 bg-red-50 text-red-900' : 'border-zinc-200 bg-zinc-50 text-zinc-900'}
                          `}>
                            <span className={`mr-1 h-1 w-1 rounded-full ${isRejected ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                            {material.status === 'rejected' ? 'Needs review' : 'In progress'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quotes.map((quote) => (
                    <tr key={quote.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {quote.id.substring(0, 8)}...
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => downloadQuotePdf(quote)}
                          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md shadow-sm text-sm font-medium transition"
                        >
                          Download Quote
                        </button>
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