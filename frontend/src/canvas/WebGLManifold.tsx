import { Canvas, useFrame } from '@react-three/fiber';
import { MapControls, Stats } from '@react-three/drei';
import * as THREE from 'three';
import InstancedNodes from './InstancedNodes';
import CameraController from './CameraController';
import { useUIStore } from '../store/useUIStore';


export default function WebGLManifold() {
  return (
    <div className="absolute inset-0 z-0 bg-[#050505]">
      <Canvas
        camera={{ position: [0, 0, 50], fov: 60, near: 0.1, far: 1000 }}
        dpr={[1, 2]} // Optimize for high-DPI displays while maintaining perf
        gl={{ antialias: false, powerPreference: "high-performance" }} // Favor performance
      >
        <color attach="background" args={['#050505']} />
        
        {/* The visual core - thousands of interactive points */}
        <InstancedNodes />
        
        {/* Allows user to physically pan and zoom through acoustic space */}
        <MapControls 
          makeDefault 
          enableDamping 
          dampingFactor={0.05}
          maxDistance={200}
          minDistance={5}
        />
        
        {/* Handles programmatic flying/lerping across the manifold */}
        <CameraController />
        
        {/* Performance stats overlaid inside the WebGL context bounds */}
        <Stats />
      </Canvas>
    </div>
  );
}
