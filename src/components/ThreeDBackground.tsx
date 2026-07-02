
import { useEffect, useState, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Simple fallback component
const ErrorFallback = () => (
  <div className="fixed top-0 left-0 w-full h-full -z-10 bg-gradient-to-br from-blue-50 to-indigo-50" />
);

// Check for WebGL support
const hasWebGL = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    console.error('WebGL check failed:', e);
    return false;
  }
};

// Simple loading component
const Loader = () => (
  <div className="fixed top-0 left-0 w-full h-full -z-10 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
  </div>
);

// Optimized sphere component
const AnimatedSphere = ({ 
  position, 
  scale, 
  color,
  speed = 0.5 
}: { 
  position: [number, number, number]; 
  scale: number; 
  color: string;
  speed?: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01 * speed;
      meshRef.current.rotation.y += 0.01 * speed;
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial 
        color={color}
        roughness={0.5}
        metalness={0.2}
      />
    </mesh>
  );
};

// Main scene component
const Scene = () => {
  const { gl } = useThree();
  const [error, setError] = useState(false);
  
  const colors = {
    primary: '#6366f1',
    secondary: '#a78bfa',
    accent: '#3b82f6'
  };

  useEffect(() => {
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('WebGL context lost');
      setError(true);
    };

    const canvas = gl.domElement;
    canvas.addEventListener('webglcontextlost', handleContextLost, false);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost, false);
    };
  }, [gl]);

  if (error) {
    return null;
  }

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 10]} intensity={1.5} />
      
      <AnimatedSphere 
        position={[-4, -1, -5]}
        scale={2.5}
        color={colors.primary}
        speed={0.4}
      />
      
      <AnimatedSphere 
        position={[4, 2, -10]}
        scale={3}
        color={colors.secondary}
        speed={0.3}
      />
      
      <AnimatedSphere 
        position={[0, -2, -5]}
        scale={1.5}
        color={colors.accent}
        speed={0.2}
      />
      
      <OrbitControls 
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  );
};

// Main component
export default function ThreeDBackground() {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  if (!mounted) {
    return <Loader />;
  }
  
  if (error || !hasWebGL()) {
    return <ErrorFallback />;
  }
  
  return (
    <div className="fixed top-0 left-0 w-full h-full -z-10">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        onCreated={({ gl }) => {
          try {
            gl.setClearColor(new THREE.Color('#000000'), 0);
          } catch (e) {
            console.error('WebGL error:', e);
            setError(true);
          }
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
