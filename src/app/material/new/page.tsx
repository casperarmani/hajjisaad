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
                <h2 className="text-lg font-medium text-gray-900 mb-4">Material QR Code</h2>
                <div className="inline-block bg-white p-6 rounded-md shadow-sm border border-gray-200">
                  {/* Display Material ID above the QR code */}
                  <div className="mb-3 text-center">
                    <p className="font-mono text-sm font-bold mb-1">Material ID:</p>
                    <div className="p-2 bg-gray-100 rounded border border-gray-300">
                      <span className="font-mono text-xs break-all">{materialId}</span>
                    </div>
                  </div>
                  
                  {/* QR code image */}
                  <div className="flex justify-center">
                    <QRCodeCanvas 
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/material/${materialId}`} 
                      size={200}
                      includeMargin={true}
                      level={"H"} // High error correction
                    />
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-700">
                  <p className="mb-1">For material bags:</p>
                  <ol className="list-decimal list-inside ml-2 text-gray-500">
                    <li>Print this card with both the QR code and ID number</li>
                    <li>Cut it out and attach to the material bag</li>
                    <li>Scan with any QR scanner to access material details</li>
                  </ol>
                  
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        // Create a printable version with just the QR code and ID
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>Material QR Code</title>
                                <style>
                                  body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
                                  .container { display: inline-block; border: 1px solid #ccc; padding: 15px; border-radius: 5px; background: white; }
                                  .qr-id { font-family: monospace; font-size: 12px; margin-bottom: 10px; word-break: break-all; 
                                    border: 1px solid #ddd; padding: 5px; background: #f9f9f9; border-radius: 3px; }
                                  .qr-note { margin-top: 10px; font-size: 10px; color: #666; }
                                  @media print {
                                    @page { margin: 0; }
                                    body { margin: 1cm; }
                                  }
                                </style>
                              </head>
                              <body>
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
                                  setTimeout(() => { window.print(); window.close(); }, 500);
                                </script>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                        }
                      }}
                      className="inline-flex items-center px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print QR Code Card
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center space-x-4">
                <Link
                  href={`/material/${materialId}`}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium transition"
                >
                  View Material Details
                </Link>
                
                <button
                  onClick={() => {
                    setSuccess(false);
                    setMaterialId(null);
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md shadow-sm text-sm font-medium transition"
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Material Type *
                  </label>
                  <input
                    id="type"
                    type="text"
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter material type"
                    {...register('type', { required: 'Material type is required' })}
                  />
                  {errors.type && (
                    <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                  )}
                </div>
                
                {/* Removed description field as it's not in the database schema */}
                
                <div>
                  <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    id="customer_name"
                    type="text"
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
              
              <div className="flex justify-end">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md shadow-sm text-sm font-medium transition mr-3"
                >
                  Cancel
                </Link>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium transition disabled:bg-indigo-400"
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