'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { supabase, Material } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';
import { jsPDF } from 'jspdf';

interface CompletionForm {
  payment_method: string;
  payment_amount: string;
  // Fields below aren't in database schema but kept in form for UX:
  payment_reference: string;
  notes: string;
}

export default function CompleteProcess() {
  const { id } = useParams();
  const { user, userRole } = useAuth();
  const [material, setMaterial] = useState<Material | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const { register, handleSubmit } = useForm<CompletionForm>({
    defaultValues: {
      payment_method: 'Bank Transfer',
      payment_amount: '',
      payment_reference: '',
      notes: ''
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
        if (materialData.current_stage !== 'final_approval') {
          setError('This material is not ready to be marked as completed.');
        }
        
        // Fetch quotes
        const { data: quotesData, error: quotesError } = await supabase
          .from('quotes')
          .select('*')
          .eq('material_id', id);
        
        if (quotesError) throw quotesError;
        setQuotes(quotesData || []);
        
        // Fetch approvals
        const { data: approvalsData, error: approvalsError } = await supabase
          .from('final_approvals')
          .select('*')
          .eq('material_id', id)
          .order('approved_at', { ascending: false });
        
        if (approvalsError) throw approvalsError;
        setApprovals(approvalsData || []);
        
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

  const onSubmit: SubmitHandler<CompletionForm> = async (data) => {
    if (!material) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Create payment record - match schema field names
      const payment = {
        material_id: id,
        payment_method: data.payment_method,
        amount: parseFloat(data.payment_amount),
        recorded_by: user?.id || null // UUID in schema
        // Fields below don't exist in schema:
        // reference, notes, status
      };
      
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert(payment)
        .select()
        .single();
      
      if (paymentError) throw paymentError;
      
      // Update material stage
      const { error: materialError } = await supabase
        .from('materials')
        .update({
          current_stage: 'completed',
          status: 'completed'
          // No updated_at field in schema
        })
        .eq('id', id);
      
      if (materialError) throw materialError;
      
      setCompletionId(paymentData.id);
      setSuccess(true);
      
    } catch (err: any) {
      console.error('Error completing process:', err);
      setError(err.message || 'An error occurred while completing the process.');
    } finally {
      setSubmitting(false);
    }
  };

  const generateCertificate = () => {
    if (!material || !quotes.length) return;
    
    setGenerating(true);
    
    try {
      const doc = new jsPDF();
      const company = "Materials Testing Shop";
      const companyAddress = "123 Testing Lane, Engineering City";
      
      // Header
      doc.setFontSize(18);
      doc.text(company, 105, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.text(companyAddress, 105, 27, { align: 'center' });
      
      // Certificate Title
      doc.setFontSize(22);
      doc.text("CERTIFICATE OF TESTING", 105, 45, { align: 'center' });
      doc.line(60, 48, 150, 48);
      
      // Certificate Details
      doc.setFontSize(12);
      doc.text(`Certificate No: MTS-${material.id.substring(0, 8).toUpperCase()}`, 105, 60, { align: 'center' });
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 105, 70, { align: 'center' });
      
      // Client Details
      doc.setFontSize(11);
      doc.text("This Certificate is issued to:", 105, 85, { align: 'center' });
      doc.setFontSize(14);
      doc.text(`${material.customer_name}`, 105, 95, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`${material.customer_contact}`, 105, 105, { align: 'center' });
      
      // Material Details
      doc.setFontSize(12);
      doc.text("Material Information", 20, 125);
      doc.line(20, 127, 190, 127);
      
      doc.setFontSize(11);
      doc.text(`Material Type: ${material.type}`, 20, 135);
      doc.text(`QR Code: ${material.id}`, 20, 145);
      doc.text(`Customer: ${material.customer_name}`, 20, 155);
      doc.text(`Received Date: ${new Date(material.received_date).toLocaleDateString()}`, 20, 165);
      
      // Declaration
      doc.setFontSize(12);
      doc.text("Certification", 105, 185, { align: 'center' });
      doc.setFontSize(10);
      doc.text(
        "This is to certify that the above material has been tested according to the relevant industry standards " +
        "and has been found to meet the required specifications and quality standards.",
        105, 195, { align: 'center', maxWidth: 160 }
      );
      
      // Signatures
      doc.setFontSize(11);
      doc.text("Authorized Signature", 60, 230, { align: 'center' });
      doc.text("Quality Control", 150, 230, { align: 'center' });
      
      doc.line(30, 225, 90, 225);
      doc.line(120, 225, 180, 225);
      
      // Footer
      doc.setFontSize(8);
      doc.text(
        "This certificate is issued subject to terms and conditions of the Materials Testing Shop. " +
        "This certificate shall not be reproduced except in full without written approval from the laboratory.",
        105, 250, { align: 'center', maxWidth: 160 }
      );
      
      // Page numbering
      doc.setFontSize(10);
      doc.text("Page 1 of 1", 105, 275, { align: 'center' });
      
      // Save the PDF
      doc.save(`Certificate_${material.type.replace(/\s+/g, '_')}.pdf`);
      
    } catch (err) {
      console.error('Error generating certificate:', err);
      setError('Failed to generate certificate. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approve':
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'reject':
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
  if (userRole !== 'secretary' && userRole !== 'uncle') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="text-center py-6">
              <p className="text-red-500">You do not have permission to complete material processes.</p>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Process</h1>
          <p className="text-gray-500 mb-6">Material: {material.type}</p>
          
          {success ? (
            <div className="space-y-6">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
                <p className="text-green-700">Material process completed successfully!</p>
              </div>
              
              <div className="flex justify-center">
                <button
                  onClick={generateCertificate}
                  disabled={generating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium transition mr-3 disabled:bg-indigo-400"
                >
                  {generating ? 'Generating...' : 'Generate Certificate PDF'}
                </button>
                
                <Link
                  href={`/material/${id}`}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md shadow-sm text-sm font-medium transition"
                >
                  Return to Material Details
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Approved Quote</h2>
                {quotes.length > 0 ? (
                  <div className="bg-gray-50 rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Terms
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {quotes.map((quote) => (
                          <tr key={quote.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ${quote.amount}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              Quote for Material Testing
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              Standard Terms
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass('approved')}`}>
                                Approved
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">No quotes available.</p>
                )}
              </div>
              
              {approvals.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Final Approval</h2>
                  <div className="bg-gray-50 rounded-md p-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Approved By</p>
                        <p className="font-medium">{approvals[0].approved_by}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(approvals[0].status)}`}>
                          {approvals[0].status}
                        </span>
                      </div>
                      {approvals[0].comments && (
                        <div>
                          <p className="text-sm text-gray-500">Comments</p>
                          <p>{approvals[0].comments}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method *
                    </label>
                    <select
                      id="payment_method"
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      {...register('payment_method', { required: 'Payment method is required' })}
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Cash">Cash</option>
                      <option value="Check">Check</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.payment_method && (
                      <p className="mt-1 text-sm text-red-600">{errors.payment_method.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="payment_amount" className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Amount ($) *
                    </label>
                    <input
                      id="payment_amount"
                      type="text"
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="0.00"
                      defaultValue={quotes.length > 0 ? quotes[0].amount : ''}
                      {...register('payment_amount', {
                        required: 'Payment amount is required',
                        pattern: {
                          value: /^\d+(\.\d{1,2})?$/,
                          message: 'Please enter a valid amount (e.g., 100.00)'
                        }
                      })}
                    />
                    {errors.payment_amount && (
                      <p className="mt-1 text-sm text-red-600">{errors.payment_amount.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="payment_reference" className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Reference *
                    </label>
                    <input
                      id="payment_reference"
                      type="text"
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Transaction ID, Check Number, etc."
                      {...register('payment_reference', { required: 'Payment reference is required' })}
                    />
                    {errors.payment_reference && (
                      <p className="mt-1 text-sm text-red-600">{errors.payment_reference.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      rows={3}
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Additional notes about the payment or completion"
                      {...register('notes')}
                    />
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
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md shadow-sm text-sm font-medium transition disabled:bg-green-400"
                  >
                    {submitting ? 'Processing...' : 'Mark as Completed'}
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