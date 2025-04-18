'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase, Material, MaterialStage, Certificate, Test, getUserEmailById, getCertificates } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
import { MaterialModelViewer } from '@/components/MaterialModels';
import FilePreviewer from '@/components/FilePreviewer';
import Modal from 'react-modal';

// Set app element for react-modal
if (typeof window !== 'undefined') {
  // In Next.js, we'll use body as the app element
  Modal.setAppElement('body');
}

// Custom modal styles
const customModalStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '900px',
    maxHeight: '90vh',
    overflow: 'auto',
    borderRadius: '0.375rem',
    padding: '1.5rem',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 1000,
  }
};

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
  const { userRole } = useAuth();
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [qcResults, setQcResults] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentPreviewFile, setCurrentPreviewFile] = useState<{ path: string; type: string } | null>(null);

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
          
          {/* 3D Material Model Visualization */}
          <div className="flex justify-center items-center mb-10 flex-col">
            <div className="text-sm font-medium text-zinc-500 mb-3 flex items-center">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1">
                <path d="M7.49991 0.876892C3.84222 0.876892 0.877075 3.84204 0.877075 7.49972C0.877075 11.1574 3.84222 14.1226 7.49991 14.1226C11.1576 14.1226 14.1227 11.1574 14.1227 7.49972C14.1227 3.84204 11.1576 0.876892 7.49991 0.876892ZM7.49988 1.82689C4.36688 1.8269 1.82707 4.36672 1.82707 7.49972C1.82707 10.6327 4.36688 13.1725 7.49988 13.1726C10.6329 13.1726 13.1727 10.6328 13.1727 7.49979C13.1727 4.36679 10.6329 1.82699 7.49988 1.82689Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                <path d="M7.49991 3.60645C7.77405 3.60645 7.99991 3.83231 7.99991 4.10645V7.49992H10.5C10.7761 7.49992 11 7.72578 11 8.00002C11 8.27416 10.7761 8.50002 10.5 8.50002H7.49991C7.22577 8.50002 6.99991 8.27416 6.99991 8.00002V4.10645C6.99991 3.83231 7.22577 3.60645 7.49991 3.60645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
              </svg>
              3D Model Visualization
            </div>
            <div className="relative p-4 rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-b from-zinc-50/80 to-blue-50/50 rounded-xl backdrop-blur-sm border border-zinc-100/50"></div>
              <MaterialModelViewer 
                materialType={material.type} 
                width={220} 
                height={220} 
                className="z-10 shadow-lg"
              />
              
              {/* Interactive prompt */}
              <div className="absolute bottom-4 right-4 text-xs flex items-center text-zinc-500 bg-white bg-opacity-80 px-2 py-1 rounded-full">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 animate-spin-slow">
                  <path d="M7.5 0.875C5.49797 0.875 3.875 2.49797 3.875 4.5C3.875 6.15288 4.98124 7.54738 6.49373 7.98351C5.2997 8.12901 4.27557 8.55134 3.50407 9.31302C2.52216 10.2824 2.02502 11.72 2.02502 13.5999C2.02502 13.8623 2.23769 14.0749 2.50002 14.0749C2.76236 14.0749 2.97502 13.8623 2.97502 13.5999C2.97502 11.8799 3.42786 10.7176 4.17091 9.9869C4.91536 9.25463 6.02674 8.87499 7.49995 8.87499C8.97317 8.87499 10.0846 9.25463 10.8291 9.98689C11.5721 10.7176 12.025 11.8799 12.025 13.5999C12.025 13.8623 12.2376 14.0749 12.5 14.0749C12.7623 14.0749 12.975 13.8623 12.975 13.5999C12.975 11.72 12.4779 10.2824 11.4959 9.31301C10.7244 8.55135 9.70025 8.12903 8.50625 7.98352C10.0187 7.5474 11.125 6.15289 11.125 4.5C11.125 2.49797 9.50203 0.875 7.5 0.875ZM4.825 4.5C4.825 3.02264 6.02264 1.825 7.5 1.825C8.97736 1.825 10.175 3.02264 10.175 4.5C10.175 5.97736 8.97736 7.175 7.5 7.175C6.02264 7.175 4.825 5.97736 4.825 4.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                </svg>
                Drag to rotate
              </div>
            </div>
            
            {/* Material type indicator */}
            <div className="flex items-center mt-2 mb-1">
              <span className="text-sm font-semibold text-zinc-800 mr-2">Type:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-xs font-medium text-zinc-800">
                {material.type}
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
                        ${isUpcoming ? 'border-zinc-200 bg-white text-zinc-700' : ''}
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
                        ${isUpcoming ? 'text-zinc-700' : ''}
                      `}>
                        {/* Desktop label */}
                        <div className="text-xs hidden sm:block text-zinc-900">
                          {stageNames[stage]}
                        </div>
                        
                        {/* Mobile label */}
                        <div className="text-xs sm:hidden text-zinc-900">
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
              {/* First row of info cards - inline on mobile */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Material Info</h2>
                  <div className="bg-gray-50 rounded-md p-4 h-full">
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <p className="text-sm text-gray-500">Material Type</p>
                        <p className="text-zinc-900 font-medium">{material.type}</p>
                      </div>
                      <div className="break-all">
                        <p className="text-sm text-gray-500">Material ID</p>
                        <p className="text-zinc-900 font-medium text-xs sm:text-sm">{material.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Received Date</p>
                        <p className="text-zinc-900 font-medium">{new Date(material.received_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Client Info</h2>
                  <div className="bg-gray-50 rounded-md p-4 h-full">
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <p className="text-sm text-gray-500">Customer Name</p>
                        <p className="text-zinc-900 font-medium">{material.customer_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Customer Contact</p>
                        <p className="text-zinc-900 font-medium">{material.customer_contact}</p>
                      </div>
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
                    <p className="mt-2 text-sm text-black font-medium">Scan to view material details</p>
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
            <h2 className="text-xl font-bold text-gray-900 mb-4">Test Documents</h2>
            
            {/* Mobile Cards View */}
            <div className="md:hidden space-y-4">
              {tests.map((test) => (
                <div key={test.id} className="border border-gray-200 rounded-md p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="font-medium text-gray-900">{test.test_type}</div>
                    <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${getStatusBadgeClass(material.status)}`}>
                      {material.status ? material.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Pending'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Result</div>
                      <div className="font-medium text-zinc-900">{test.result || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Date</div>
                      <div className="font-medium text-zinc-900">{new Date(test.performed_at).toLocaleDateString()}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-gray-500 text-xs mb-1">Test Document</div>
                      <div className="font-medium text-zinc-900">{test.file_name}</div>
                      <div className="mt-2 flex space-x-2">
                        <a 
                          href={test.file_path} 
                          download
                          className="px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded text-xs font-medium transition"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Download
                        </a>
                        <button
                          onClick={() => {
                            setCurrentPreviewFile({ path: test.file_path, type: test.file_type || '' });
                            setIsPreviewOpen(true);
                          }}
                          className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs font-medium transition"
                        >
                          View
                        </button>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-gray-500 text-xs mb-1">Performed By</div>
                      <div className="font-medium text-zinc-900">{userEmails[test.performed_by] || test.performed_by || 'Unknown'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
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
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Performed By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tests.map((test) => (
                    <tr key={test.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {test.test_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900">
                        {test.result || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-900">
                        <div className="truncate max-w-xs" title={test.file_name}>
                          {test.file_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900">
                        {userEmails[test.performed_by] || test.performed_by || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900">
                        {new Date(test.performed_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 space-x-2">
                        <button
                          onClick={() => {
                            setCurrentPreviewFile({ path: test.file_path, type: test.file_type || '' });
                            setIsPreviewOpen(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          View
                        </button>
                        <a
                          href={test.file_path}
                          download
                          className="text-green-600 hover:text-green-900 font-medium"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Download
                        </a>
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
            
            {/* Mobile Cards View */}
            <div className="md:hidden space-y-4">
              {qcResults.map((qc) => (
                <div key={qc.id} className="border border-gray-200 rounded-md p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="font-medium text-gray-900">
                      {userEmails[qc.inspected_by] || qc.inspector_name || 'Unknown'}
                    </div>
                    <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${getStatusBadgeClass(qc.status)}`}>
                      {qc.status}
                    </span>
                  </div>
                  
                  <div className="text-sm mb-3">
                    <div className="text-gray-500 text-xs mb-1">Date</div>
                    <div className="font-medium text-zinc-900">{new Date(qc.inspected_at).toLocaleDateString()}</div>
                  </div>
                  
                  <div className="text-sm">
                    <div className="text-gray-500 text-xs mb-1">Comments</div>
                    <div className="font-medium text-zinc-900 text-sm">{qc.comments}</div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
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
                      <td className="px-6 py-4 text-sm text-zinc-900">
                        {qc.comments}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900">
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
      
      {/* File Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onRequestClose={() => setIsPreviewOpen(false)}
        style={customModalStyles}
        contentLabel="Document Preview"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Document Preview</h2>
          <button 
            onClick={() => setIsPreviewOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {currentPreviewFile && (
          <FilePreviewer 
            filePath={currentPreviewFile.path} 
            fileType={currentPreviewFile.type} 
          />
        )}
        
        <div className="mt-4 flex justify-end">
          {currentPreviewFile && (
            <a
              href={currentPreviewFile.path}
              download
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium transition"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download File
            </a>
          )}
        </div>
      </Modal>
    </div>
  );
}