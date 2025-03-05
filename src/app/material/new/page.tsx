'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { QRCodeCanvas } from 'qrcode.react';

interface MaterialForm {
  type: string;            // Matches DB schema
  customer_name: string;   // Matches DB schema
  customer_contact: string; // Matches DB schema
  // We use the ID field as the identifier for QR codes now
  // No description field in DB schema
}

export default function NewMaterial() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<MaterialForm>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [materialId, setMaterialId] = useState<string | null>(null);
  const [qrCodeValue, setQrCodeValue] = useState<string | null>(null);
  
  const onSubmit = async (data: MaterialForm) => {
    setLoading(true);
    setError(null);
    
    try {
      // Map form fields to DB column names - exactly matching the schema
      const newMaterial = {
        type: data.type,
        customer_name: data.customer_name,
        customer_contact: data.customer_contact,
        current_stage: 'received',
        status: 'pending',
        received_date: new Date().toISOString(),
      };
      
      // We'll use the material.id from the response after insertion
      
      const { data: material, error } = await supabase
        .from('materials')
        .insert(newMaterial)
        .select()
        .single();
      
      if (error) throw error;
      
      setMaterialId(material.id);
      // Set QR code value to the material URL with ID
      setQrCodeValue(`${typeof window !== 'undefined' ? window.location.origin : ''}/material/${material.id}`);
      setSuccess(true);
    } catch (err: any) {
      console.error('Error creating material:', err);
      setError(err.message || 'An error occurred while registering the material.');
    } finally {
      setLoading(false);
    }
  };

  // Material type is now a free text input

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800">
            &larr; Back to Dashboard
          </Link>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Register New Material</h1>
          
          {success && materialId ? (
            <div className="text-center">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
                <p className="text-green-700">Material registered successfully!</p>
              </div>
              
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Material QR Code</h2>
                
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* QR Code Card */}
                  <div className="inline-block bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
                    {/* Display Material ID above the QR code */}
                    <div className="mb-3 text-center">
                      <p className="font-mono text-sm font-bold mb-1 text-black">Material ID:</p>
                      <div className="p-2 bg-gray-100 rounded border border-gray-300">
                        <span className="font-mono text-xs break-all text-black">{materialId}</span>
                      </div>
                    </div>
                    
                    {/* QR code image */}
                    <div className="flex justify-center">
                      <QRCodeCanvas 
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/material/${materialId}`} 
                        size={180}
                        includeMargin={true}
                        level={"H"} // High error correction
                      />
                    </div>
                  </div>
                  
                  {/* Instructions */}
                  <div className="flex-1">
                    <div className="text-sm text-gray-700">
                      <div className="flex items-center mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium text-zinc-900">For material bags:</span>
                      </div>
                      
                      <ol className="list-decimal list-outside ml-6 mb-4 space-y-1.5">
                        <li className="text-zinc-800">Print this card with both the QR code and ID number</li>
                        <li className="text-zinc-800">Cut it out and attach to the material bag</li>
                        <li className="text-zinc-800">Scan with any QR scanner to access material details</li>
                      </ol>
                      
                      <div className="mt-4">
                        <button
                          onClick={() => {
                            // Create a printable version with just the QR code and ID
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(`
                                <html>
                                  <head>
                                    <title>Material QR Code</title>
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                    <style>
                                      body { font-family: Arial, sans-serif; padding: 20px; text-align: center; color: black; }
                                      .container { display: inline-block; border: 1px solid #ccc; padding: 15px; border-radius: 5px; background: white; box-shadow: 0px 2px 5px rgba(0,0,0,0.1); }
                                      .qr-id { font-family: monospace; font-size: 12px; margin-bottom: 10px; word-break: break-all; 
                                        border: 1px solid #ddd; padding: 5px; background: #f9f9f9; border-radius: 3px; color: black; }
                                      .qr-note { margin-top: 10px; font-size: 10px; color: black; }
                                      .print-instructions { margin-bottom: 20px; text-align: left; background: #f0f2ff; padding: 10px; border-radius: 5px; }
                                      .print-instructions h3 { margin-top: 0; font-size: 14px; }
                                      .print-instructions ul { padding-left: 20px; margin-bottom: 0; }
                                      @media print {
                                        .print-instructions { display: none; }
                                        @page { margin: 0; }
                                        body { margin: 1cm; }
                                      }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="print-instructions">
                                      <h3>Print Instructions:</h3>
                                      <ul>
                                        <li>Make sure to use the correct paper size</li>
                                        <li>Print at 100% scale (no resizing)</li>
                                        <li>The QR code will print automatically</li>
                                      </ul>
                                    </div>
                                    <div class="container">
                                      <div class="qr-id">
                                        <strong>Material ID:</strong> ${materialId}
                                      </div>
                                      <img src="${document.querySelector('canvas')?.toDataURL()}" width="200" />
                                      <div class="qr-note">
                                        Created: ${new Date().toLocaleString()}
                                      </div>
                                    </div>
                                    <script>
                                      setTimeout(() => { window.print(); }, 500);
                                    </script>
                                  </body>
                                </html>
                              `);
                              printWindow.document.close();
                            }
                          }}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          Print QR Code Card
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  href={`/material/${materialId}`}
                  className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium transition text-center"
                >
                  View Material Details
                </Link>
                
                <button
                  onClick={() => {
                    setSuccess(false);
                    setMaterialId(null);
                  }}
                  className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md shadow-sm text-sm font-medium transition"
                >
                  Register Another Material
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                  <p className="text-red-700">{error}</p>
                </div>
              )}
              
              {/* Improved form layout for mobile and desktop */}
              <div className="space-y-6">
                <div className="w-full">
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Material Type *
                  </label>
                  <input
                    id="type"
                    type="text"
                    className="appearance-none rounded-md relative block w-full px-3 py-3 md:py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base md:text-sm"
                    placeholder="Enter material type"
                    {...register('type', { required: 'Material type is required' })}
                  />
                  {errors.type && (
                    <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name *
                    </label>
                    <input
                      id="customer_name"
                      type="text"
                      className="appearance-none rounded-md relative block w-full px-3 py-3 md:py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base md:text-sm"
                      placeholder="Customer name"
                      {...register('customer_name', { required: 'Customer name is required' })}
                    />
                    {errors.customer_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.customer_name.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="customer_contact" className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Contact *
                    </label>
                    <input
                      id="customer_contact"
                      type="text"
                      className="appearance-none rounded-md relative block w-full px-3 py-3 md:py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base md:text-sm"
                      placeholder="Email or phone number"
                      {...register('customer_contact', {
                        required: 'Customer contact is required'
                      })}
                    />
                    {errors.customer_contact && (
                      <p className="mt-1 text-sm text-red-600">{errors.customer_contact.message}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4">
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md shadow-sm text-sm font-medium transition text-center"
                >
                  Cancel
                </Link>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium transition disabled:bg-indigo-400"
                >
                  {loading ? 'Registering...' : 'Register Material'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}