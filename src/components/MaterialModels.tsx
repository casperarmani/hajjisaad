'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, useCubeTexture, Center, PerspectiveCamera, Environment, MeshTransmissionMaterial, Float } from '@react-three/drei';

// Ambient lighting component
const AmbientScene = () => {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} />
      <directionalLight position={[-10, -10, -5]} intensity={0.2} color="#fff" />
    </>
  );
};

// CEMENT MODEL
const CementModel = () => {
  const mesh = useRef<THREE.Mesh>(null!);
  
  // Animate the model
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    mesh.current.rotation.y = time * 0.15;
    mesh.current.position.y = Math.sin(time * 0.5) * 0.05;
  });

  // Generate random particles as cement dust
  const particles = Array.from({ length: 50 }, () => ({
    position: [
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 1.5
    ],
    scale: Math.random() * 0.05 + 0.02
  }));

  return (
    <group>
      {/* Main cement block */}
      <mesh ref={mesh} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial 
          color="#a3a3a3" 
          roughness={0.7} 
          metalness={0.1}
        />
      </mesh>
      
      {/* Small particles representing cement dust */}
      {particles.map((particle, i) => (
        <mesh key={i} position={particle.position as [number, number, number]}>
          <sphereGeometry args={[particle.scale, 8, 8]} />
          <meshStandardMaterial color="#d4d4d4" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
};

// STEEL MODEL
const SteelModel = () => {
  const rodRef = useRef<THREE.Group>(null!);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    rodRef.current.rotation.y = time * 0.2;
    rodRef.current.rotation.z = Math.sin(time * 0.3) * 0.1;
  });

  return (
    <group ref={rodRef}>
      {/* Main steel rods */}
      {[-0.3, -0.1, 0.1, 0.3].map((offset, index) => (
        <mesh key={index} position={[offset, 0, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 1.5, 16]} />
          <MeshTransmissionMaterial
            backside
            samples={4}
            thickness={0.5}
            chromaticAberration={0.2}
            anisotropy={0.1}
            distortion={0.2}
            distortionScale={0.5}
            color="#555555"
            metalness={1}
            roughness={0.2}
            reflectivity={1}
          />
        </mesh>
      ))}
      
      {/* Connecting rings */}
      {[-0.3, 0, 0.3].map((offset, index) => (
        <mesh key={`ring-${index}`} position={[0, offset, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.4, 0.03, 16, 32]} />
          <meshStandardMaterial color="#777" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
};

// SAND MODEL
const SandModel = () => {
  const sandRef = useRef<THREE.Group>(null!);
  const particles = useRef<Array<THREE.Mesh>>(null!);
  particles.current = [];
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    sandRef.current.rotation.y = time * 0.1;
    
    // Animate individual sand particles
    particles.current.forEach((particle, i) => {
      particle.position.y = Math.sin(time * 0.8 + i) * 0.05;
      particle.rotation.x = time * 0.5 + i;
      particle.rotation.z = time * 0.3 + i * 0.2;
    });
  });

  // Generate small random particles for sand
  const sandParticles = Array.from({ length: 200 }, () => ({
    position: [
      (Math.random() - 0.5) * 1,
      (Math.random() - 0.5) * 1,
      (Math.random() - 0.5) * 1
    ],
    rotation: [
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    ],
    scale: Math.random() * 0.04 + 0.01
  }));

  return (
    <group ref={sandRef}>
      {/* Base sand pile */}
      <mesh position={[0, -0.2, 0]} castShadow>
        <coneGeometry args={[0.6, 0.4, 16]} />
        <meshStandardMaterial color="#e0c179" roughness={1} />
      </mesh>
      
      {/* Individual sand particles */}
      {sandParticles.map((particle, i) => (
        <mesh 
          key={i} 
          position={particle.position as [number, number, number]} 
          rotation={particle.rotation as [number, number, number]}
          ref={(el: THREE.Mesh) => particles.current[i] = el}
        >
          <dodecahedronGeometry args={[particle.scale, 0]} />
          <meshStandardMaterial 
            color={i % 2 === 0 ? "#deb868" : "#c9a55b"} 
            roughness={1} 
          />
        </mesh>
      ))}
    </group>
  );
};

// BRICK MODEL
const BrickModel = () => {
  const brickGroupRef = useRef<THREE.Group>(null!);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    brickGroupRef.current.rotation.y = time * 0.2;
    brickGroupRef.current.position.y = Math.sin(time * 0.5) * 0.05;
  });

  // Create a small wall of bricks
  const brickArrangement = [
    { position: [-0.35, -0.15, 0], rotation: [0, 0, 0] },
    { position: [0, -0.15, 0], rotation: [0, 0, 0] },
    { position: [0.35, -0.15, 0], rotation: [0, 0, 0] },
    { position: [-0.175, 0.05, 0], rotation: [0, 0, 0] },
    { position: [0.175, 0.05, 0], rotation: [0, 0, 0] },
    { position: [0, 0.25, 0], rotation: [0, 0, 0] },
  ];

  return (
    <group ref={brickGroupRef}>
      {brickArrangement.map((brick, index) => (
        <mesh 
          key={index} 
          position={brick.position} 
          rotation={brick.rotation} 
          castShadow
        >
          <boxGeometry args={[0.3, 0.15, 0.15]} />
          <meshStandardMaterial 
            color="#b8564d" 
            roughness={0.9} 
            bumpScale={0.01}
          />
        </mesh>
      ))}
    </group>
  );
};

// Generic material for unknown types
const GenericModel = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    meshRef.current.rotation.x = time * 0.15;
    meshRef.current.rotation.y = time * 0.2;
  });

  return (
    <mesh ref={meshRef} castShadow>
      <dodecahedronGeometry args={[0.6, 0]} />
      <meshStandardMaterial 
        color="#6b7280" 
        metalness={0.3} 
        roughness={0.6} 
      />
    </mesh>
  );
};

// Container component to manage 3D scene and model selection
export const MaterialModelViewer = ({ 
  materialType, 
  width = 200, 
  height = 200,
  className = ""
}: { 
  materialType: string; 
  width?: number; 
  height?: number;
  className?: string;
}) => {
  // Create div to hold Canvas for SSR compatibility
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    
    // Mock function to load textures - will replace with real textures
    const loadTextures = async () => {
      try {
        // Dummy texture loading
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error("Failed to load textures", err);
      }
    };
    
    loadTextures();
  }, []);

  // Function to render appropriate model based on material type
  const renderModel = () => {
    const type = materialType.toLowerCase();
    
    if (type.includes('cement')) return <CementModel />;
    if (type.includes('steel')) return <SteelModel />;
    if (type.includes('sand')) return <SandModel />;
    if (type.includes('brick')) return <BrickModel />;
    
    // Default generic model
    return <GenericModel />;
  };

  if (!mounted) return <div style={{ width, height }} className={`${className} bg-gray-50 rounded-lg animate-pulse`}></div>;

  return (
    <div style={{ width, height }} className={`${className} relative overflow-hidden rounded-lg`}>
      <Canvas shadows camera={{ position: [0, 0, 3], fov: 50 }}>
        <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={50} />
        <color attach="background" args={['#f8f8f8']} />
        
        <AmbientScene />
        
        <Float
          speed={2}
          rotationIntensity={0.5}
          floatIntensity={0.5}
        >
          <Center>
            {renderModel()}
          </Center>
        </Float>
        
        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          autoRotate
          autoRotateSpeed={1}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.5}
        />
        
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};

// Larger display component for more detailed view
export const MaterialModelDisplay = ({ 
  materialType, 
  width = 400, 
  height = 400,
  className = ""
}: { 
  materialType: string; 
  width?: number; 
  height?: number;
  className?: string;
}) => {
  return (
    <MaterialModelViewer 
      materialType={materialType} 
      width={width} 
      height={height} 
      className={className}
    />
  );
};