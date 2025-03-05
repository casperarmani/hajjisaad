'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/lib/auth-context';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface LoginForm {
  email: string;
  password: string;
}

// Random floating particles animation
const Particles = ({ count = 100 }) => {
  const mesh = useRef<THREE.Group>(null);
  const particles = Array.from({ length: count }, () => ({
    position: [
      (Math.random() - 0.5) * 20, 
      (Math.random() - 0.5) * 20, 
      (Math.random() - 0.5) * 20
    ] as [number, number, number],
    size: Math.random() * 0.08 + 0.03,
    speed: Math.random() * 0.02 + 0.005,
    offset: Math.random() * Math.PI * 2,
  }));

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (mesh.current) {
      mesh.current.rotation.y = time * 0.05;
      mesh.current.rotation.x = time * 0.03;
    }
  });

  return (
    <group ref={mesh}>
      {particles.map((particle, i) => (
        <mesh key={i} position={particle.position}>
          <sphereGeometry args={[particle.size, 8, 8]} />
          <meshStandardMaterial 
            color={i % 3 === 0 ? "#8b5cf6" : i % 3 === 1 ? "#3b82f6" : "#10b981"} 
            transparent 
            opacity={0.6} 
          />
        </mesh>
      ))}
    </group>
  );
};

// Cement block model
const CementModel = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = time * 0.3;
      meshRef.current.rotation.x = Math.sin(time * 0.5) * 0.2;
    }
  });

  return (
    <Float 
      speed={2}
      rotationIntensity={0}
      floatIntensity={1}
    >
      <mesh ref={meshRef} castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial 
          color="#94a3b8" 
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>
    </Float>
  );
};

// Steel model
const SteelModel = () => {
  const group = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = time * 0.3;
    }
  });

  return (
    <Float 
      speed={2}
      rotationIntensity={0}
      floatIntensity={1}
    >
      <group ref={group}>
        {[-0.5, -0.25, 0, 0.25, 0.5].map((offset, index) => (
          <mesh key={index} position={[offset, 0, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 2, 16]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
      </group>
    </Float>
  );
};

// Brick model
const BrickModel = () => {
  const group = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = time * 0.3;
    }
  });

  // Create a small wall of bricks
  const bricks = [
    { position: [-0.6, -0.3, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
    { position: [0, -0.3, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
    { position: [0.6, -0.3, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
    { position: [-0.3, 0.15, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
    { position: [0.3, 0.15, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
    { position: [0, 0.6, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
  ];

  return (
    <Float 
      speed={2}
      rotationIntensity={0}
      floatIntensity={1}
    >
      <group ref={group}>
        {bricks.map((brick, index) => (
          <mesh 
            key={index} 
            position={brick.position} 
            rotation={brick.rotation} 
            castShadow
          >
            <boxGeometry args={[0.5, 0.25, 0.25]} />
            <meshStandardMaterial 
              color="#b91c1c" 
              roughness={0.9}
            />
          </mesh>
        ))}
      </group>
    </Float>
  );
};

// Generic unidentified material model
const GenericMaterialModel = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh & {material: THREE.MeshBasicMaterial}>(null);
  
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.x = time * 0.15;
      meshRef.current.rotation.y = time * 0.2;
    }
    
    // Subtle pulsing glow effect
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(time * 0.8) * 0.05);
      
      // Type-safe way to update opacity
      const material = glowRef.current.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = 0.5 + Math.sin(time * 0.8) * 0.15;
      }
    }
  });

  return (
    <Float 
      speed={1.5}
      rotationIntensity={0.5}
      floatIntensity={0.8}
    >
      <group>
        {/* Outer glow sphere */}
        <mesh ref={glowRef} scale={1.4}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color="#4f46e5" transparent opacity={0.15} />
        </mesh>
        
        {/* Main shape */}
        <mesh ref={meshRef} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial 
            color="#6b7280" 
            metalness={0.4} 
            roughness={0.5}
            emissive="#818cf8"
            emissiveIntensity={0.1}
          />
        </mesh>
        
        {/* Inner particles for effect */}
        {Array.from({ length: 10 }).map((_, i) => (
          <mesh 
            key={i} 
            position={[
              (Math.random() - 0.5) * 1.5,
              (Math.random() - 0.5) * 1.5,
              (Math.random() - 0.5) * 1.5
            ] as [number, number, number]}
            scale={Math.random() * 0.2 + 0.05}
          >
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial
              color="#a5b4fc"
              transparent
              opacity={0.7}
            />
          </mesh>
        ))}
      </group>
    </Float>
  );
};

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { signIn, user } = useAuth();

  // Check for authentication and redirect on component mount
  useEffect(() => {
    let redirectTimeout: any;
    
    // Skip during server-side rendering or while loading
    if (typeof window === 'undefined' || loading) return;
    
    // If user is already logged in, redirect to dashboard
    if (user) {
      console.log('Login page: User already authenticated, redirecting to dashboard');
      redirectTimeout = setTimeout(() => {
        window.location.replace('/dashboard');
      }, 100);
    }
    
    return () => {
      if (redirectTimeout) clearTimeout(redirectTimeout);
    };
  }, [user, loading]);

  const onSubmit = async (formData: LoginForm) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await signIn(formData.email, formData.password);
      
      if (error) {
        console.error("Login error in component:", error);
        setError(error.message);
      } else {
        // Safe access to optional data
        console.log("Login successful in component, session:", data && data.session ? "exists" : "missing");
        
        // Force navigation directly to dashboard after a successful login
        setTimeout(() => {
          window.location.replace('/dashboard');
        }, 100);
      }
    } catch (err: any) {
      console.error("Exception during login:", err);
      setError(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Remove AuthRedirect - let middleware handle redirects */}
      
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-900 overflow-hidden">
        {/* Animated Particles Background */}
        <div className="absolute inset-0 z-0 opacity-40 overflow-hidden">
          <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
            <ambientLight intensity={0.2} />
            <pointLight position={[10, 10, 10]} intensity={0.8} />
            <Particles count={150} />
            <Environment preset="city" />
          </Canvas>
        </div>
        
        {/* 3D Material Model */}
        <div className="w-48 h-48 mb-2 relative z-10">
          <div className="absolute inset-0 bg-white/10 rounded-full blur-xl"></div>
          <Canvas camera={{ position: [0, 0, 5], fov: 40 }} shadows>
            <ambientLight intensity={0.4} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
            <GenericMaterialModel />
            <Environment preset="sunset" />
            <OrbitControls enableZoom={false} />
          </Canvas>
        </div>
        
        {/* Glass Card Container */}
        <div className="relative max-w-md w-full z-10 px-5">
          <div className="absolute inset-0 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10"></div>
          <div className="relative p-8 space-y-8">
            <div>
              <h2 className="text-center text-3xl font-bold tracking-tight text-white">
                Hajji Saad's Material Testing
              </h2>
              <div className="flex justify-center mt-2">
                <div className="h-1 w-16 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full"></div>
              </div>
              <p className="mt-3 text-center text-sm text-indigo-200">
                Please sign in to access your account
              </p>
            </div>
            
            <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-4">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}
              
              <div className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-indigo-200 mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="appearance-none rounded-lg relative block w-full px-4 py-3 bg-white/10 border border-white/20 placeholder-indigo-300/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent"
                    placeholder="Enter your email"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-indigo-200 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className="appearance-none rounded-lg relative block w-full px-4 py-3 bg-white/10 border border-white/20 placeholder-indigo-300/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent"
                    placeholder="Enter your password"
                    {...register('password', { required: 'Password is required' })}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-all duration-200 shadow-lg shadow-indigo-500/30"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
        
        {/* Animated gradient orbs in background */}
        <div className="fixed top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="fixed top-40 right-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="fixed bottom-20 left-40 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>

        {/* Add animation keyframes */}
        <style jsx>{`
          @keyframes blob {
            0% {
              transform: translate(0px, 0px) scale(1);
            }
            33% {
              transform: translate(30px, -50px) scale(1.1);
            }
            66% {
              transform: translate(-20px, 20px) scale(0.9);
            }
            100% {
              transform: translate(0px, 0px) scale(1);
            }
          }
          .animate-blob {
            animation: blob 10s infinite;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `}</style>
      </div>
    </>
  );
}