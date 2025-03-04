'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import QRCode from 'qrcode.react';

interface MaterialForm {
  name: string;
  description: string;
  material_type: string;
  client_name: string;
  client_email: string;
}

export default function NewMaterial() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<MaterialForm>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [materialId, setMaterialId] = useState<string | null>(null);
  
  const onSubmit = async (data: MaterialForm) => {
    setLoading(true);
    setError(null);
    
    try {
      const newMaterial = {
        ...data,
        current_stage: 'received',
        status: 'pending',
        received_date: new Date().toISOString(),
      };
      
      const { data: material, error } = await supabase
        .from('materials')
        .insert(newMaterial)
        .select()
        .single();
      
      if (error) throw error;
      
      setMaterialId(material.id);
      setSuccess(true);
    } catch (err: any) {
      console.error('Error creating material:', err);
      setError(err.message || 'An error occurred while registering the material.');
    } finally {
      setLoading(false);
    }
  };

  const materialTypes = [
    'Cement',
    'Steel',
    'Concrete',
    'Aggregate',
    'Brick',
    'Sand',
    'Soil',
    'Asphalt',
    'Other'
  ];

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
                <div className="inline-block bg-white p-4 rounded-md shadow-sm">
                  <QRCode 
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/material/${materialId}`} 
                    size={200} 
                  />
                </div>
                <p className="mt-4 text-sm text-gray-500">Scan this QR code to access material details</p>
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
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Material Name *
                  </label>
                  <input
                    id="name"
                    type="text"
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Material name"
                    {...register('name', { required: 'Material name is required' })}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="material_type" className="block text-sm font-medium text-gray-700 mb-1">
                    Material Type *
                  </label>
                  <select
                    id="material_type"
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    {...register('material_type', { required: 'Material type is required' })}
                  >
                    <option value="">Select Material Type</option>
                    {materialTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.material_type && (
                    <p className="mt-1 text-sm text-red-600">{errors.material_type.message}</p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Material description"
                    {...register('description')}
                  />
                </div>
                
                <div>
                  <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name *
                  </label>
                  <input
                    id="client_name"
                    type="text"
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Client name"
                    {...register('client_name', { required: 'Client name is required' })}
                  />
                  {errors.client_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.client_name.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="client_email" className="block text-sm font-medium text-gray-700 mb-1">
                    Client Email *
                  </label>
                  <input
                    id="client_email"
                    type="email"
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="client@example.com"
                    {...register('client_email', {
                      required: 'Client email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                  />
                  {errors.client_email && (
                    <p className="mt-1 text-sm text-red-600">{errors.client_email.message}</p>
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