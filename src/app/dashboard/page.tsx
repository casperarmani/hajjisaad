'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase, Material, MaterialStage, UserRole } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { TableRowModel } from '@/components/MaterialModels';

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

// Define which roles can access which stages
const roleStageAccess: Record<UserRole, MaterialStage[]> = {
  secretary: ['received', 'completed'],
  tester: ['received', 'testing'],
  manager: ['testing', 'review'],
  qc: ['review', 'qc'],
  accounting: ['qc', 'accounting'],
  uncle: ['received', 'testing', 'review', 'qc', 'accounting', 'final_approval', 'completed']
};

import ProtectedRoute from '@/components/ProtectedRoute';

// Export the Dashboard component wrapped with ProtectedRoute
export default function Dashboard() {
  return <DashboardContent />;
};

function DashboardContent() {
  const { user, userRole } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MaterialStage | 'all'>('all');

  useEffect(() => {
    if (!user || !userRole) return;

    const fetchMaterials = async () => {
      setLoading(true);
      
      try {
        console.log('Fetching materials with role:', userRole);
        let query = supabase.from('materials').select('*');
        
        // If not uncle, filter by accessible stages
        if (userRole !== 'uncle') {
          const accessibleStages = roleStageAccess[userRole as UserRole];
          console.log('Filtering by stages:', accessibleStages);
          query = query.in('current_stage', accessibleStages);
        }
        
        // If tab is not 'all', filter by selected stage
        if (activeTab !== 'all') {
          console.log('Filtering by active tab:', activeTab);
          query = query.eq('current_stage', activeTab);
        }

        // Note: the materials table doesn't have a created_at column per the schema
        const response = await query.order('received_date', { ascending: false });
        console.log('Materials response:', response);
        
        if (response.error) {
          console.error('Supabase error:', response.error);
          throw response.error;
        }
        
        console.log('Materials data:', response.data);
        // Cast to Material array but include fallbacks in case properties are missing
        const materialsData = (response.data || []).map(material => ({
          // Only use properties that exist in the schema
          id: material.id || '',
          type: material.type || '',
          customer_name: material.customer_name || '',
          customer_contact: material.customer_contact || '',
          received_date: material.received_date || new Date().toISOString(),
          current_stage: material.current_stage || 'received',
          status: material.status || 'pending'
        }));
        
        console.log('Processed materials:', materialsData);
        setMaterials(materialsData as Material[]);
      } catch (error: any) {
        console.error('Error fetching materials:', error);
        console.error('Error details:', error.message, error.stack);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();

    // Set up real-time subscription for updates
    const materialsSubscription = supabase
      .channel('materials_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'materials' },
        () => fetchMaterials()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(materialsSubscription);
    };
  }, [user, userRole, activeTab]);

  // Get accessible stages for the current user
  const accessibleStages = userRole ? roleStageAccess[userRole as UserRole] : [];

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
        return 'Test';
      case 'testing':
        return 'Review';
      case 'review':
        return 'QC Inspect';
      case 'qc':
        return 'Generate Quote';
      case 'accounting':
        return 'Approve';
      case 'final_approval':
        return 'Complete';
      default:
        return 'View';
    }
  };

  const canAccessStage = (stage: MaterialStage) => {
    return userRole === 'uncle' || accessibleStages.includes(stage);
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Hajji Saad&apos;s Material Dashboard</h1>
            
            {(userRole === 'secretary' || userRole === 'uncle') && (
              <Link
                href="/material/new"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium transition"
              >
                Register New Material
              </Link>
            )}
          </div>
        
        {/* Tabs for filtering - Scrollable on mobile */}
        <div className="border-b border-gray-200 mb-6 overflow-x-auto pb-px">
          <nav className="-mb-px flex space-x-4 min-w-max">
            <button
              onClick={() => setActiveTab('all')}
              className={`whitespace-nowrap pb-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Materials
            </button>
            
            {accessibleStages.map((stage) => (
              <button
                key={stage}
                onClick={() => setActiveTab(stage)}
                className={`whitespace-nowrap pb-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === stage
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {stageNames[stage]}
              </button>
            ))}
          </nav>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="spinner"></div>
            <p className="mt-2 text-gray-500">Loading materials...</p>
          </div>
        ) : materials.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500">No materials found for selected filter.</p>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            {/* Mobile Card View */}
            <div className="block md:hidden">
              {materials.map((material) => (
                <div key={material.id} className="border-b border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    {userRole === 'uncle' && (
                      <div className="mr-3">
                        <TableRowModel
                          materialType={material.type}
                          size={50}
                          className="rounded-md overflow-hidden shadow-sm"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 mb-1">{material.type}</div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <div className="text-xs text-zinc-700">ID: {material.id.substring(0, 6)}...</div>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(material.status)}`}>
                          {material.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-700">{material.customer_name}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="block text-gray-500 mb-1">Stage</span>
                      <span className="font-medium text-zinc-900">{stageNames[material.current_stage]}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-1">Received</span>
                      <span className="font-medium text-zinc-900">{new Date(material.received_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <Link
                      href={`/material/${material.id}`}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      Details
                    </Link>
                    
                    {material.current_stage !== 'completed' && canAccessStage(material.current_stage) && (
                      <Link
                        href={getNextStageLink(material)}
                        className="px-3 py-1 bg-green-50 text-green-700 rounded-md text-sm font-medium"
                      >
                        {getNextStageAction(material.current_stage)}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {userRole === 'uncle' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Model
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Material
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Stage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Received Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {materials.map((material) => (
                    <tr key={material.id} className="hover:bg-gray-50">
                      {userRole === 'uncle' && (
                        <td className="pl-6 pr-2 py-2 align-middle">
                          <div className="flex justify-center items-center">
                            <TableRowModel
                              materialType={material.type}
                              size={58}
                              className="rounded-md overflow-hidden shadow-sm"
                            />
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{material.type}</div>
                        <div className="text-sm text-zinc-700">ID: {material.id.substring(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{material.customer_name}</div>
                        <div className="text-sm text-zinc-700">{material.customer_contact}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{stageNames[material.current_stage]}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(material.status)}`}>
                          {material.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-700">
                        {new Date(material.received_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/material/${material.id}`}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Details
                        </Link>
                        
                        {material.current_stage !== 'completed' && canAccessStage(material.current_stage) && (
                          <Link
                            href={getNextStageLink(material)}
                            className="text-green-600 hover:text-green-900"
                          >
                            {getNextStageAction(material.current_stage)}
                          </Link>
                        )}
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
    </ProtectedRoute>
  );
}