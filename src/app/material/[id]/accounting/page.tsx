'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { supabase, Material } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';
import { jsPDF } from 'jspdf';

interface QuoteForm {
  amount: string;
  description: string;
  terms: string;
  validity_period: string;
}

export default function GenerateQuote() {
  const { id } = useParams();
  const { user, userRole } = useAuth();
  const [material, setMaterial] = useState<Material | null>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  
  const { register, handleSubmit } = useForm<QuoteForm>({
    defaultValues: {
      amount: '',
      description: 'Quote for material testing services',
      terms: 'Net 30 days',
      validity_period: '30 days'
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
        if (materialData.current_stage !== 'qc') {
          setError('This material is not ready for quote generation.');
        }
        
        // Fetch tests
        const { data: testsData, error: testsError } = await supabase
          .from('tests')
          .select('*')
          .eq('material_id', id)
          .order('performed_at', { ascending: false }); // Use performed_at instead of created_at
        
        if (testsError) throw testsError;
        setTests(testsData || []);
        
        // Fetch QC data
        const { data: qcInspections, error: qcError } = await supabase
          .from('qc_inspections')
          .select('*')
          .eq('material_id', id)
          .order('inspected_at', { ascending: false }); // Use inspected_at instead of created_at
        
        if (qcError) throw qcError;
        setQcData(qcInspections || []);
        
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

  const [formData, setFormData] = useState({
    amount: '',
    terms: 'Net 30 days',
    validity_period: '30 days',
    description: 'Quote for material testing services'
  });

  const onSubmit: SubmitHandler<QuoteForm> = async (data) => {
    if (!material) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Store form data for PDF generation
      setFormData({
        amount: data.amount,
        terms: data.terms,
        validity_period: data.validity_period,
        description: data.description
      });
      
      // Create quote record - only include fields that exist in the schema
      const quote = {
        material_id: id,
        amount: parseFloat(data.amount),
        created_by: user?.id || null // Use ID as it's UUID in schema
        // Fields below don't exist in the schema:
        // description, terms, validity_period, status
      };
      
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .insert(quote)
        .select()
        .single();
      
      if (quoteError) throw quoteError;
      
      // Update material stage
      const { error: materialError } = await supabase
        .from('materials')
        .update({
          current_stage: 'accounting'
          // No updated_at field in schema
        })
        .eq('id', id);
      
      if (materialError) throw materialError;
      
      setQuoteId(quoteData.id);
      setSuccess(true);
      
    } catch (err: any) {
      console.error('Error generating quote:', err);
      setError(err.message || 'An error occurred while generating the quote.');
    } finally {
      setSubmitting(false);
    }
  };

  const generatePdf = async () => {
    if (!material || !quoteId) return;
    
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
      
      // Quote Title
      doc.setFontSize(16);
      doc.text("QUOTATION", 105, 40, { align: 'center' });
      doc.line(75, 42, 135, 42);
      
      // Quote Details
      doc.setFontSize(11);
      doc.text(`Quote #: ${quoteId}`, 20, 55);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 62);
      doc.text(`Valid Until: ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}`, 20, 69);
      
      // Client Details
      doc.text("Client:", 140, 55);
      doc.text(`${material.customer_name}`, 140, 62);
      doc.text(`${material.customer_contact}`, 140, 69);
      
      // Material Details
      doc.setFontSize(12);
      doc.text("Material Information", 20, 85);
      doc.line(20, 87, 190, 87);
      
      doc.setFontSize(10);
      doc.text(`Material: ${material.type}`, 20, 95);
      doc.text(`QR Code: ${material.id}`, 20, 102);
      doc.text(`Received Date: ${new Date(material.received_date).toLocaleDateString()}`, 20, 109);
      
      // Tests Performed
      doc.setFontSize(12);
      doc.text("Tests Performed", 20, 125);
      doc.line(20, 127, 190, 127);
      
      let yPos = 135;
      doc.setFontSize(10);
      
      if (tests.length > 0) {
        tests.forEach((test, index) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`${index + 1}. ${test.test_type}: ${test.result}`, 20, yPos);
          yPos += 7;
        });
      } else {
        doc.text("No tests information available", 20, yPos);
      }
      
      // Quote Total
      yPos += 15;
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.text("Quote Summary", 20, yPos);
      doc.line(20, yPos + 2, 190, yPos + 2);
      
      yPos += 10;
      doc.setFontSize(10);
      
      doc.text(`Total Amount: $${parseFloat(formData.amount || '0').toFixed(2)}`, 150, yPos, { align: 'right' });
      
      yPos += 15;
      doc.text(`Terms: ${formData.terms || 'Net 30 days'}`, 20, yPos);
      
      yPos += 7;
      doc.text(`Validity: ${formData.validity_period || '30 days'}`, 20, yPos);
      
      // Footer
      doc.setFontSize(10);
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
        doc.text("Thank you for your business!", 105, 280, { align: 'center' });
      }
      
      // Save the PDF
      doc.save(`Quote_${quoteId}_${material.type.replace(/\s+/g, '_')}.pdf`);
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
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
  if (userRole !== 'accounting' && userRole !== 'uncle') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="text-center py-6">
              <p className="text-red-500">You do not have permission to generate quotes.</p>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Generate Quote</h1>
          <p className="text-gray-500 mb-6">Material: {material.type}</p>
          
          {success ? (
            <div className="space-y-6">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
                <p className="text-green-700">Quote generated successfully!</p>
              </div>
              
              <div className="flex justify-center">
                <button
                  onClick={generatePdf}
                  disabled={generating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium transition mr-3 disabled:bg-indigo-400"
                >
                  {generating ? 'Generating PDF...' : 'Download Quote as PDF'}
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
                <h2 className="text-lg font-medium text-gray-900 mb-4">Material Information</h2>
                <div className="bg-gray-50 rounded-md p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Material</p>
                      <p className="font-medium">{material.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">QR Code</p>
                      <p className="font-medium">{material.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Customer Name</p>
                      <p className="font-medium">{material.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Customer Contact</p>
                      <p className="font-medium">{material.customer_contact}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Test Details</h2>
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">No tests have been performed yet.</p>
                )}
              </div>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                      Quote Amount ($) *
                    </label>
                    <input
                      id="amount"
                      type="text"
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="0.00"
                      {...register('amount', {
                        required: 'Amount is required',
                        pattern: {
                          value: /^\d+(\.\d{1,2})?$/,
                          message: 'Please enter a valid amount (e.g., 100.00)'
                        }
                      })}
                    />
                    {errors.amount && (
                      <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="validity_period" className="block text-sm font-medium text-gray-700 mb-1">
                      Validity Period *
                    </label>
                    <input
                      id="validity_period"
                      type="text"
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="30 days"
                      {...register('validity_period', { required: 'Validity period is required' })}
                    />
                    {errors.validity_period && (
                      <p className="mt-1 text-sm text-red-600">{errors.validity_period.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="terms" className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Terms *
                    </label>
                    <input
                      id="terms"
                      type="text"
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Net 30 days"
                      {...register('terms', { required: 'Payment terms are required' })}
                    />
                    {errors.terms && (
                      <p className="mt-1 text-sm text-red-600">{errors.terms.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <input
                      id="description"
                      type="text"
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Quote for material testing services"
                      {...register('description', { required: 'Description is required' })}
                    />
                    {errors.description && (
                      <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
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
                    disabled={submitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium transition disabled:bg-indigo-400"
                  >
                    {submitting ? 'Generating...' : 'Generate Quote'}
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