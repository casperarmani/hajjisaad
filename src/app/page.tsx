'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, Float } from "@react-three/drei";
import * as THREE from "three";

// Import placeholder images (using Next.js public directory)
// In production, you'd replace these with actual optimized images
import testingLabImg from "../../public/next.svg";
import clientLogoImg from "../../public/vercel.svg";

// Material models with enhanced visualization for the landing page
const GenericTestingModel = ({ scale = 1.2 }) => {
  const meshRef = useRef();
  const glowRef = useRef();
  
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.x = t * 0.4;
      meshRef.current.rotation.y = t * 0.5;
      meshRef.current.rotation.z = t * 0.2;
    }
    if (glowRef.current) {
      glowRef.current.scale.set(
        1 + Math.sin(t * 0.6) * 0.1,
        1 + Math.sin(t * 0.6) * 0.1,
        1 + Math.sin(t * 0.6) * 0.1
      );
    }
  });

  return (
    <group scale={scale}>
      {/* Outer glow sphere */}
      <mesh ref={glowRef} scale={[1.4, 1.4, 1.4]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#4f46e5" transparent opacity={0.15} />
      </mesh>
      
      {/* Main shape - capsule/oblong */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <capsuleGeometry args={[0.7, 2, 16, 32]} />
        <meshStandardMaterial 
          color="#6366f1" 
          metalness={0.7}
          roughness={0.2}
          emissive="#818cf8"
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Decorative rings */}
      <group rotation={[Math.PI/2, 0, 0]}>
        <mesh position={[0, 0, 0]}>
          <torusGeometry args={[1.1, 0.05, 16, 100]} />
          <meshStandardMaterial color="#a5b4fc" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[Math.PI/2, 0, 0]}>
          <torusGeometry args={[1.1, 0.05, 16, 100]} />
          <meshStandardMaterial color="#a5b4fc" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
      
      {/* Particle effect */}
      {Array.from({ length: 15 }).map((_, i) => (
        <mesh 
          key={i} 
          position={[
            (Math.random() - 0.5) * 2.5,
            (Math.random() - 0.5) * 2.5,
            (Math.random() - 0.5) * 2.5
          ]}
          scale={Math.random() * 0.12 + 0.03}
        >
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="#c7d2fe" transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
};

const CementModel = ({ scale = 1.2 }) => {
  const meshRef = useRef();
  
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.5;
      meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.2;
    }
  });

  return (
    <group scale={scale}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial 
          color="#94a3b8" 
          metalness={0.2}
          roughness={0.7}
        />
      </mesh>
      
      {/* Decorative elements */}
      <group rotation={[0, Math.PI/4, 0]}>
        {Array.from({ length: 4 }).map((_, i) => (
          <mesh 
            key={i} 
            position={[0, 0, 0]}
            rotation={[0, i * Math.PI/2, 0]}
          >
            <boxGeometry args={[1.6, 0.05, 0.05]} />
            <meshStandardMaterial color="#60a5fa" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

const SteelModel = ({ scale = 1.2 }) => {
  const groupRef = useRef();
  
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.5;
      groupRef.current.rotation.z = Math.sin(t * 0.3) * 0.1;
    }
  });

  return (
    <group scale={scale} ref={groupRef}>
      {[-0.5, -0.25, 0, 0.25, 0.5].map((offset, index) => (
        <mesh key={index} position={[offset, 0, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 2, 16]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      
      {/* Decorative caps */}
      {[-1, 1].map((yPos, i) => (
        <mesh key={i} position={[0, yPos, 0]} castShadow>
          <cylinderGeometry args={[0.7, 0.7, 0.1, 32]} />
          <meshStandardMaterial color="#4f46e5" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
};

const BrickModel = ({ scale = 1.2 }) => {
  const groupRef = useRef();
  
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.5;
      groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.1;
    }
  });

  const bricks = [
    { position: [-0.6, -0.3, 0], rotation: [0, 0, 0] },
    { position: [0, -0.3, 0], rotation: [0, 0, 0] },
    { position: [0.6, -0.3, 0], rotation: [0, 0, 0] },
    { position: [-0.3, 0.15, 0], rotation: [0, 0, 0] },
    { position: [0.3, 0.15, 0], rotation: [0, 0, 0] },
    { position: [0, 0.6, 0], rotation: [0, 0, 0] },
  ];

  return (
    <group scale={scale} ref={groupRef}>
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
      
      {/* Decorative highlights */}
      {bricks.map((brick, index) => (
        <mesh 
          key={`highlight-${index}`} 
          position={[brick.position[0], brick.position[1] + 0.127, brick.position[2]]}
          rotation={brick.rotation}
          scale={[0.48, 0.02, 0.23]}
        >
          <boxGeometry />
          <meshStandardMaterial 
            color="#fecaca" 
            roughness={0.5}
            metalness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
};

export default function Home() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [isClient, setIsClient] = useState(false);
  
  // Handle client-side rendering for Three.js
  useEffect(() => {
    setIsClient(true);
  }, []);

  const testimonials = [
    {
      quote: "Utor Lab has revolutionized our quality assurance process with their precision testing and rapid turnaround times. Their analytics revealed previously undetected stress patterns, helping us improve structural integrity by 43%.",
      author: "Sarah Chen",
      position: "Quality Director, ConstructTech Global",
      image: clientLogoImg, // Use imported image
    },
    {
      quote: "The comprehensive analysis reports from Utor Lab helped us optimize our material composition, saving millions in production costs. Their rigorous test standards are unmatched in the industry.",
      author: "Marcus Johansson",
      position: "Chief Engineer, Nordic Infrastructure",
      image: clientLogoImg, // Use imported image
    },
    {
      quote: "When regulatory compliance is on the line, we trust only Utor Lab. Their certification is recognized by authorities worldwide and has helped us secure approvals in 13 different countries simultaneously.",
      author: "Priya Kapoor",
      position: "Compliance Officer, Eastgate Development",
      image: clientLogoImg, // Use imported image
    }
  ];

  const modelProps = { position: [0, 0, 0], scale: 1.2 };
  
  const services = [
    {
      title: "Structural Material Testing",
      description: "Comprehensive analysis of load-bearing capabilities, structural integrity, and long-term performance metrics for construction materials.",
      icon: (
        <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
          </svg>
        </div>
      ),
      model: <SteelModel {...modelProps} />,
    },
    {
      title: "Chemical Composition Analysis",
      description: "State-of-the-art spectrometry and chromatography to determine exact material composition down to parts per billion.",
      icon: (
        <div className="h-16 w-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.611L5 14.5" />
          </svg>
        </div>
      ),
      model: (
        <mesh castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial 
            color="#6b7280" 
            metalness={0.3} 
            roughness={0.6} 
          />
        </mesh>
      ),
    },
    {
      title: "Thermal & Environmental Resilience",
      description: "Specialized testing for material performance under extreme temperatures, pressure, humidity, and environmental stressors.",
      icon: (
        <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
          </svg>
        </div>
      ),
      model: <BrickModel {...modelProps} />,
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Premium navbar with glassmorphism effect */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg shadow-md border-b border-gray-100">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="flex items-center group">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:shadow-indigo-500/30 transition-all duration-300 mr-3">
                  U
                </div>
                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-blue-800">
                  Utor Lab
                </span>
              </Link>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#services" className="text-gray-700 hover:text-indigo-600 transition-colors duration-200 font-medium">Services</a>
              <a href="#technology" className="text-gray-700 hover:text-indigo-600 transition-colors duration-200 font-medium">Technology</a>
              <a href="#testimonials" className="text-gray-700 hover:text-indigo-600 transition-colors duration-200 font-medium">Testimonials</a>
              <a href="#about" className="text-gray-700 hover:text-indigo-600 transition-colors duration-200 font-medium">About Us</a>
              <Link 
                href="/login" 
                className="bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 transition-all duration-300 text-white py-2.5 px-6 rounded-lg shadow-lg hover:shadow-indigo-500/30 font-medium flex items-center"
              >
                <span>Client Portal</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            
            <div className="md:hidden">
              <button className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 focus:outline-none transition-colors duration-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 sm:pt-24 pb-32 sm:pb-40 bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-900 text-white">
        {/* Enhanced animated background with particles and glow */}
        <div className="absolute inset-0">
          {/* Glowing orbs */}
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-600 rounded-full opacity-10 blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-blue-600 rounded-full opacity-10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          {/* Grid pattern */}
          <div className="absolute top-0 left-0 w-full h-full opacity-20" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px), radial-gradient(circle, rgba(255,255,255,0.1) 2px, transparent 2px)',
            backgroundSize: '30px 30px, 90px 90px',
            backgroundPosition: '0 0, 15px 15px'
          }}></div>
          
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/50 to-transparent"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col-reverse lg:flex-row items-center justify-between">
            <div className="lg:w-7/12 lg:pr-12 mt-6 sm:mt-8 lg:mt-0">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4 sm:mb-6">
                Precision Material Testing for
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 block mt-1 sm:mt-2">
                  Industry Leaders
                </span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-100 mb-6 sm:mb-8 leading-relaxed">
                Utor Lab delivers unparalleled accuracy with advanced testing methodologies, providing the data-driven insights that define world-class engineering and manufacturing.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link href="/login" className="px-6 sm:px-8 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-lg transition-all duration-200 text-center font-medium text-sm sm:text-base">
                  Access Portal
                </Link>
                <a href="#services" className="px-6 sm:px-8 py-2.5 sm:py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white rounded-md shadow-md transition-all duration-200 text-center font-medium text-sm sm:text-base">
                  Explore Services
                </a>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mt-8 sm:mt-12">
                <div className="text-center sm:text-left p-2 sm:p-3 bg-black/20 backdrop-blur-sm rounded-lg">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-300">99.98%</div>
                  <div className="text-white text-xs sm:text-sm mt-1">Testing Accuracy</div>
                </div>
                <div className="text-center sm:text-left p-2 sm:p-3 bg-black/20 backdrop-blur-sm rounded-lg">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-300">15,000+</div>
                  <div className="text-white text-xs sm:text-sm mt-1">Tests Completed</div>
                </div>
                <div className="text-center sm:text-left col-span-2 lg:col-span-1 p-2 sm:p-3 bg-black/20 backdrop-blur-sm rounded-lg">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-300">24h</div>
                  <div className="text-white text-xs sm:text-sm mt-1">Average Turnaround</div>
                </div>
              </div>
            </div>

            <div className="lg:w-5/12 h-64 md:h-80 lg:h-96">
              {/* Mobile View */}
              <div className="sm:hidden w-full h-full">
                <div className="grid grid-cols-2 gap-2 h-full">
                  {/* Left: Image */}
                  <div className="relative h-full rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
                    <img 
                      src="https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=800" 
                      alt="Material tensile testing" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-indigo-900/30"></div>
                    <div className="absolute bottom-2 left-2 bg-white/10 backdrop-blur-md px-2 py-1 rounded-full text-xs font-medium text-white border border-white/20">
                      Materials Testing
                    </div>
                  </div>
                  
                  {/* Right: 3D Model */}
                  {isClient && (
                    <div className="relative h-full rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-blue-700/30 backdrop-blur-3xl"></div>
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-blue-600/10 border border-white/20 overflow-hidden shadow-2xl">
                        <Canvas camera={{ position: [0, 0, 5], fov: 45 }} shadows dpr={[1, 2]}>
                          <ambientLight intensity={0.7} />
                          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                          <pointLight position={[-10, -10, -10]} intensity={0.5} />
                          <GenericTestingModel />
                          <Environment preset="city" />
                          <OrbitControls 
                            enableZoom={false} 
                            autoRotate={true}
                            autoRotateSpeed={4}
                            enablePan={false}
                          />
                        </Canvas>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-white/10 backdrop-blur-md px-2 py-1 rounded-full text-xs font-medium text-white border border-white/20">
                        Interactive Model
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Tablet and Desktop View */}
              <div className="hidden sm:grid w-full h-full grid-cols-2 gap-4">
                {/* Real concrete testing image */}
                <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
                  <img 
                    src="https://images.pexels.com/photos/6474343/pexels-photo-6474343.jpeg?auto=compress&cs=tinysrgb&w=800" 
                    alt="Concrete testing" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-indigo-900/30"></div>
                  <div className="absolute bottom-2 left-2 bg-white/10 backdrop-blur-md px-2 py-1 rounded-full text-xs font-medium text-white border border-white/20">
                    Concrete Testing
                  </div>
                </div>

                {/* 3D Model */}
                {isClient && (
                  <div className="relative rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-blue-700/30 backdrop-blur-3xl"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-blue-600/10 border border-white/20 overflow-hidden shadow-2xl">
                      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} shadows dpr={[1, 2]}>
                        <ambientLight intensity={0.7} />
                        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                        <pointLight position={[-10, -10, -10]} intensity={0.5} />
                        <GenericTestingModel />
                        <Environment preset="city" />
                        <OrbitControls 
                          enableZoom={false} 
                          autoRotate={true}
                          autoRotateSpeed={4}
                          enablePan={false}
                        />
                      </Canvas>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-white/10 backdrop-blur-md px-2 py-1 rounded-full text-xs font-medium text-white border border-white/20">
                      Interactive Model
                    </div>
                  </div>
                )}

                {/* Material tensile testing image */}
                <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl col-span-2">
                  <img 
                    src="https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=800" 
                    alt="Material tensile testing" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-indigo-900/30"></div>
                  <div className="absolute bottom-2 left-2 bg-white/10 backdrop-blur-md px-2 py-1 rounded-full text-xs font-medium text-white border border-white/20">
                    Tensile Strength Testing
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom wave - positioned lower down and more subtle */}
        <div className="absolute -bottom-1 left-0 right-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-auto" preserveAspectRatio="none">
            <path fill="#ffffff" fillOpacity="1" d="M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,229.3C672,245,768,267,864,261.3C960,256,1056,224,1152,213.3C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-white"></div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-gradient-to-br from-white to-indigo-50">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Industry-Leading Testing Services</h2>
            <div className="h-1 w-24 bg-gradient-to-r from-indigo-600 to-blue-500 mx-auto mb-6 rounded-full"></div>
            <p className="text-gray-700 text-lg">
              Our specialized testing methodologies deliver precise data to optimize your materials and ensure compliance with international standards.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {services.map((service, index) => (
              <div key={index} className="bg-white rounded-xl shadow-xl overflow-hidden transition-all duration-300 transform hover:-translate-y-2 group border border-gray-100">
                <div className="h-56 relative overflow-hidden flex items-center justify-center">
                  {index === 0 && (
                    <img 
                      src="https://images.pexels.com/photos/1216544/pexels-photo-1216544.jpeg?auto=compress&cs=tinysrgb&w=800" 
                      alt="Structural Material Testing" 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  {index === 1 && (
                    <img 
                      src="https://images.pexels.com/photos/2280549/pexels-photo-2280549.jpeg?auto=compress&cs=tinysrgb&w=800" 
                      alt="Chemical Composition Analysis" 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  {index === 2 && (
                    <img 
                      src="https://images.pexels.com/photos/5726837/pexels-photo-5726837.jpeg?auto=compress&cs=tinysrgb&w=800" 
                      alt="Thermal & Environmental Resilience" 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-slate-900/70 via-indigo-900/50 to-blue-900/70"></div>
                  <div className="absolute z-10 flex items-center justify-center">
                    {isClient && (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center">
                        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                          <ambientLight intensity={0.7} />
                          <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
                          {service.model}
                          <Environment preset="city" />
                          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={4} />
                        </Canvas>
                      </div>
                    )}
                  </div>
                  <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="p-8 relative">
                  <div className="absolute -top-8 left-8 bg-white p-3 rounded-lg shadow-lg">
                    {service.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 mt-6">{service.title}</h3>
                  <p className="text-gray-600 text-lg">{service.description}</p>
                  <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="flex -space-x-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-white">
                            <span className="text-xs font-bold text-indigo-800">{['SP', 'AM', 'JL'][i]}</span>
                          </div>
                        ))}
                      </div>
                      <span className="ml-2 text-sm text-gray-500">+45 projects</span>
                    </div>
                    <a href="#" className="flex items-center text-indigo-600 font-medium hover:text-indigo-800 transition-colors duration-200 group-hover:underline">
                      Learn more
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-16 text-center">
            <Link href="/login" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-lg transition-all duration-200 inline-flex items-center">
              <span>View All Services</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Technology Section with Parallax Effect */}
      <section id="technology" className="relative py-24 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        <div className="absolute inset-0 opacity-50">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-10">
            {/* Image section - on top for mobile, on right for desktop */}
            <div className="w-full lg:w-6/12 order-1 lg:order-2 mb-8 lg:mb-0">
              <div className="relative mx-auto max-w-md lg:max-w-full">
                <div className="absolute -top-4 -left-4 w-16 h-16 sm:w-24 sm:h-24 bg-indigo-600 rounded-lg opacity-50 animate-pulse"></div>
                <div className="absolute -bottom-4 -right-4 w-16 h-16 sm:w-24 sm:h-24 bg-blue-600 rounded-lg opacity-50 animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="relative bg-white rounded-lg overflow-hidden shadow-2xl">
                  <img
                    src="https://images.pexels.com/photos/3912368/pexels-photo-3912368.jpeg?auto=compress&cs=tinysrgb&w=600"
                    alt="Utor Lab Advanced Testing Facility"
                    className="w-full h-auto aspect-video object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 via-indigo-800/70 to-transparent flex items-center">
                    <div className="p-4 sm:p-8 max-w-[180px] sm:max-w-sm">
                      <div className="p-2 sm:p-4 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 mb-2 sm:mb-4 shadow-lg">
                        <h4 className="text-white text-sm sm:text-lg font-semibold">ISO 17025 Certified</h4>
                        <p className="text-white text-xs sm:text-sm mt-1">Internationally accredited testing methods</p>
                      </div>
                      <div className="hidden sm:block mt-4 bg-blue-600/30 backdrop-blur-sm rounded-lg p-3 border border-blue-400/30">
                        <span className="text-blue-100 text-sm font-medium">Certified Excellence Since 2005</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Content section - below image on mobile, on left for desktop */}
            <div className="w-full lg:w-6/12 order-2 lg:order-1">
              <div className="bg-white shadow-xl rounded-xl p-5 sm:p-8 backdrop-blur-sm bg-white/50">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Next-Generation Testing Technology</h2>
                
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex gap-3 sm:gap-4 items-start">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Quantum Material Analysis</h3>
                      <p className="text-sm sm:text-base text-gray-600">
                        Our proprietary QMA™ system analyzes materials at the molecular level, detecting microscopic imperfections with unmatched precision.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 sm:gap-4 items-start">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">AI-Powered Predictive Modeling</h3>
                      <p className="text-sm sm:text-base text-gray-600">
                        Our machine learning algorithms forecast material performance under real-world conditions, simulating decades of wear in minutes.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 sm:gap-4 items-start">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Real-Time Digital Certification</h3>
                      <p className="text-sm sm:text-base text-gray-600">
                        Blockchain-secured certification ensures tamper-proof documentation that meets international standards and regulatory requirements.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 sm:mt-8">
                  <a href="#" className="inline-flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-800 transition-colors duration-200 text-sm sm:text-base">
                    Explore our lab facilities
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-gradient-to-br from-indigo-50 to-white">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Trusted by Industry Leaders</h2>
            <div className="h-1 w-20 bg-indigo-600 mx-auto mb-6"></div>
            <p className="text-gray-700 text-lg">
              Our clients rely on our testing expertise to ensure their materials meet the highest standards of quality and performance.
            </p>
          </div>

          <div className="bg-gradient-to-br from-indigo-800 to-blue-900 rounded-2xl p-8 md:p-12 shadow-xl max-w-4xl mx-auto">
            <div className="mb-8 relative">
              <svg className="text-blue-300 w-12 h-12 absolute -top-6 -left-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.192 15.757c0-.88-.23-1.618-.69-2.217-.326-.412-.768-.683-1.327-.812-.55-.128-1.07-.137-1.54-.028-.16.036-.33.084-.507.143l.138-1.14c.414-.11.858-.192 1.33-.242.403-.04.812-.033 1.207.025.966.15 1.707.5 2.22 1.05.434.466.796 1.1 1.092 1.9.094.25.17.53.232.84.034.162.062.33.086.51.024.165.042.33.054.5.03.425.036.864.002 1.32-.044.558-.142 1.106-.276 1.65-.154.628-.358 1.24-.595 1.83-.217.534-.486 1.058-.797 1.59-.44.754-.96 1.42-1.53 2.01-.82.84-1.69 1.54-2.57 2.09-.42.26-.83.49-1.24.7-.41.21-.82.39-1.22.55l-.66-1.29c.35-.18.69-.37 1.02-.58.36-.23.7-.47 1.02-.73.35-.28.68-.59 1.01-.93.33-.35.63-.73.91-1.14.36-.53.66-1.1.91-1.68.25-.59.45-1.21.59-1.86.14-.65.22-1.29.25-1.91.01-.32.01-.59-.01-.83-.02-.23-.05-.43-.09-.61-.3-1.32-.97-1.76-1.99-1.34-.85.35-1.51.86-1.97 1.54-.48.67-.75 1.5-.75 2.47 0 .26.03.54.1.84.07.29.18.59.34.87.16.28.38.53.67.74.29.21.66.34 1.11.4l.33 1.47c-.49-.05-.9-.15-1.25-.32-.35-.15-.65-.36-.9-.61-.51-.53-.85-1.11-1.01-1.78-.17-.65-.23-1.32-.16-2 .07-.68.26-1.34.57-1.98.31-.65.74-1.23 1.3-1.75.55-.52 1.25-.96 2.1-1.34.85-.37 1.83-.56 2.94-.56h.16c.97 0 1.83.1 2.57.32.74.2 1.37.5 1.89.88.51.39.91.88 1.18 1.48.28.6.45 1.29.51 2.07.04.45.05.89.02 1.33-.03.41-.1.82-.19 1.24-.1.42-.22.85-.36 1.3-.15.48-.33.97-.52 1.47-.2.5-.43 1.03-.68 1.58-.26.55-.55 1.12-.86 1.72-.31.61-.67 1.23-1.04 1.89-.38.65-.82 1.34-1.32 2.06l-.66-1.34c.33-.4.66-.83.97-1.29.31-.45.62-.97.9-1.56.28-.58.54-1.21.77-1.9.2-.56.38-1.13.53-1.73.15-.58.27-1.18.36-1.78.09-.61.13-1.24.13-1.9v-.04zm1.29 11.15c.34.28.59.53.75.74.16.2.29.37.39.52.1.15.18.29.25.43.07.13.13.26.17.38.05.13.08.23.11.3.03.08.05.13.05.16.02.05.03.08.03.1h1.61c0-.25-.08-.58-.23-.99-.15-.41-.39-.87-.72-1.37-.32-.48-.92-1.09-1.77-1.83-.85-.74-1.94-1.46-3.28-2.16v1.54c.58.34 1.1.69 1.55 1.05.45.36.84.69 1.18.99l.02.02z" />
              </svg>
              <blockquote className="text-white text-lg md:text-xl leading-relaxed">
                {testimonials[activeTestimonial].quote}
              </blockquote>
            </div>
            
            <div className="flex items-center">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-white/20 mr-4 p-2 border-2 border-blue-300">
                <Image 
                  src={testimonials[activeTestimonial].image}
                  alt={testimonials[activeTestimonial].author}
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="font-semibold text-white text-lg">{testimonials[activeTestimonial].author}</div>
                <div className="text-sm text-blue-200">{testimonials[activeTestimonial].position}</div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-center gap-3">
              {testimonials.map((_, index) => (
                <button 
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`w-4 h-4 rounded-full ${index === activeTestimonial ? 'bg-blue-300' : 'bg-white/30'} transition-colors duration-200 hover:bg-blue-200`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Client Logos */}
          <div className="mt-20 bg-white p-8 rounded-xl shadow-lg">
            <p className="text-center text-gray-700 mb-8 font-medium">Trusted by forward-thinking companies worldwide</p>
            <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-10">
              {/* Would use actual client logos instead of placeholders */}
              {[...Array(6)].map((_, index) => (
                <div key={index} className="grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300 transform hover:scale-110">
                  <Image
                    src={clientLogoImg}
                    alt={`Client ${index + 1}`}
                    width={120}
                    height={40}
                    className="h-10 w-auto object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-900 text-white">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Setting the Global Standard for Material Testing</h2>
              <div className="h-1 w-20 bg-blue-400 mb-8"></div>
              
              <p className="text-gray-300 text-lg mb-6">
                Founded by a team of materials scientists and engineers with over 50 years of combined experience, Utor Lab has established itself as the premier testing facility for industries where precision matters most.
              </p>
              
              <p className="text-gray-300 text-lg mb-8">
                Our ISO-certified methodologies and proprietary testing protocols enable us to deliver actionable insights that drive innovation and ensure regulatory compliance.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="#" className="px-6 py-3 bg-white text-indigo-900 hover:bg-gray-100 rounded-md shadow-md transition-all duration-200 text-center font-medium">
                  Our Quality Promise
                </a>
                <a href="#" className="px-6 py-3 bg-transparent border border-white hover:bg-white/10 text-white rounded-md transition-all duration-200 text-center font-medium">
                  Meet Our Scientists
                </a>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-blue-500 rounded-lg opacity-30"></div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-indigo-500 rounded-lg opacity-30"></div>
              <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 md:p-8">
                <div className="grid grid-cols-2 gap-6 text-center">
                  <div className="p-4 rounded-lg bg-white/5 backdrop-blur-sm">
                    <div className="text-3xl md:text-4xl font-bold text-blue-400 mb-2">25+</div>
                    <div className="text-gray-300">International Patents</div>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 backdrop-blur-sm">
                    <div className="text-3xl md:text-4xl font-bold text-blue-400 mb-2">12</div>
                    <div className="text-gray-300">Global Locations</div>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 backdrop-blur-sm">
                    <div className="text-3xl md:text-4xl font-bold text-blue-400 mb-2">200+</div>
                    <div className="text-gray-300">Expert Scientists</div>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 backdrop-blur-sm">
                    <div className="text-3xl md:text-4xl font-bold text-blue-400 mb-2">5000+</div>
                    <div className="text-gray-300">Enterprise Clients</div>
                  </div>
                </div>
                
                <div className="mt-8 border-t border-white/10 pt-8">
                  <h3 className="text-xl font-semibold mb-4">International Certifications</h3>
                  <div className="flex flex-wrap gap-4">
                    <div className="px-3 py-2 bg-white/10 rounded-lg text-sm">ISO 17025</div>
                    <div className="px-3 py-2 bg-white/10 rounded-lg text-sm">ASTM E329</div>
                    <div className="px-3 py-2 bg-white/10 rounded-lg text-sm">AASHTO</div>
                    <div className="px-3 py-2 bg-white/10 rounded-lg text-sm">UKAS</div>
                    <div className="px-3 py-2 bg-white/10 rounded-lg text-sm">NATA</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-br from-white to-indigo-50">
        <div className="container mx-auto px-6">
          <div className="bg-gradient-to-r from-indigo-700 to-blue-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="relative">
              {/* Abstract decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full opacity-20 blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500 rounded-full opacity-20 blur-3xl transform -translate-x-1/3 translate-y-1/3"></div>
              
              <div className="flex flex-col md:flex-row items-center relative z-10">
                {/* Mobile optimized image - top on mobile, right on desktop */}
                <div className="w-full md:hidden mb-8">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden shadow-2xl border border-white/20 max-w-md mx-auto">
                    <img 
                      src="https://images.pexels.com/photos/6474344/pexels-photo-6474344.jpeg?auto=compress&cs=tinysrgb&w=800" 
                      alt="Advanced material testing equipment" 
                      className="w-full h-56 object-cover"
                    />
                    <div className="absolute top-0 left-0 right-0 bottom-0 bg-indigo-900/20"></div>
                    {isClient && (
                      <div className="absolute bottom-4 right-4 w-16 h-16">
                        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                          <ambientLight intensity={0.5} />
                          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
                          <BrickModel />
                          <Environment preset="sunset" />
                          <OrbitControls enableZoom={false} />
                        </Canvas>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6 sm:p-8 md:p-12 md:w-7/12">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">Ready to elevate your material standards?</h2>
                  <div className="h-1 w-20 bg-blue-400 mb-4 sm:mb-6"></div>
                  <p className="text-white text-base sm:text-lg mb-6 sm:mb-8">
                    Join the world's leading companies that trust Utor Lab for mission-critical material testing and certification.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="/login" className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-indigo-700 hover:bg-blue-50 rounded-lg shadow-lg transition-all duration-200 text-center font-medium transform hover:-translate-y-1 text-sm sm:text-base">
                      Get Started
                    </Link>
                    <a href="#" className="px-6 sm:px-8 py-3 sm:py-4 bg-transparent border-2 border-white/70 hover:bg-white/10 hover:border-white text-white rounded-lg transition-all duration-200 text-center font-medium text-sm sm:text-base">
                      Request Consultation
                    </a>
                  </div>
                  
                  <div className="mt-6 pt-6 sm:mt-8 sm:pt-8 border-t border-white/20">
                    <p className="text-blue-200 text-xs sm:text-sm">ISO-certified laboratories available in 12 countries</p>
                  </div>
                </div>
                
                {/* Desktop image - hidden on mobile */}
                <div className="hidden md:block md:w-5/12 p-0">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden shadow-2xl border border-white/20">
                    <img 
                      src="https://images.pexels.com/photos/6474344/pexels-photo-6474344.jpeg?auto=compress&cs=tinysrgb&w=800" 
                      alt="Advanced material testing equipment" 
                      className="w-full h-72 object-cover"
                    />
                    <div className="absolute top-0 left-0 right-0 bottom-0 bg-indigo-900/20"></div>
                    {isClient && (
                      <div className="absolute bottom-4 right-4 w-20 h-20">
                        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                          <ambientLight intensity={0.5} />
                          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
                          <BrickModel />
                          <Environment preset="sunset" />
                          <OrbitControls enableZoom={false} />
                        </Canvas>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white pt-16 pb-8">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="text-xl font-bold mb-4">Utor Lab</h3>
              <p className="text-gray-400 mb-4">
                Setting the global standard for precision material testing and certification.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.048-1.067-.06-1.407-.06-4.123v-.08c0-2.643.012-2.987.06-4.043.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm6.605 4.61a8.502 8.502 0 011.93 5.314c-.281-.054-3.101-.629-5.943-.271-.065-.141-.12-.293-.184-.445a25.416 25.416 0 00-.564-1.236c3.145-1.28 4.577-3.124 4.761-3.362zM12 3.475c2.17 0 4.154.813 5.662 2.148-.152.216-1.443 1.941-4.48 3.08-1.399-2.57-2.95-4.675-3.189-5A8.687 8.687 0 0112 3.475zm-3.633.803a53.896 53.896 0 013.167 4.935c-3.992 1.063-7.517 1.04-7.896 1.04a8.581 8.581 0 014.729-5.975zM3.453 12.01v-.26c.37.01 4.512.065 8.775-1.215.25.477.477.965.694 1.453-.109.033-.228.065-.336.098-4.404 1.42-6.747 5.303-6.942 5.629a8.522 8.522 0 01-2.19-5.705zM12 20.547a8.482 8.482 0 01-5.239-1.8c.152-.315 1.888-3.656 6.703-5.337.022-.01.033-.01.054-.022a35.318 35.318 0 011.823 6.475 8.4 8.4 0 01-3.341.684zm4.761-1.465c-.086-.52-.542-3.015-1.659-6.084 2.679-.423 5.022.271 5.314.369a8.468 8.468 0 01-3.655 5.715z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Services</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Structural Testing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Chemical Analysis</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Thermal Testing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Quality Certification</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Regulatory Compliance</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">News & Press</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Sustainability</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Locations</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-400">1234 Innovation Drive<br />Tech City, CA 90210</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-gray-400">+1 (555) 123-4567</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-400">info@utorlab.com</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Utor Lab. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Action Button - For mobile navigation to client portal */}
      <div className="fixed bottom-6 right-6 md:hidden z-50">
        <Link href="/login" className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl flex items-center justify-center transition-all duration-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        </Link>
      </div>
    </div>
  );
}