import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Bvh } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useUIStore } from '../store/useUIStore';

const dummy = new THREE.Object3D();
const BASE_COLOR = new THREE.Color('#334455');
const ACTIVE_COLOR = new THREE.Color('#00ffcc');
const HOVER_COLOR = new THREE.Color('#ffffff');

// Advanced topological shader material
const TopologyNodeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
  },
  vertexShader: `
    attribute vec3 instanceColor;
    varying vec3 vColor;
    varying vec2 vUv;
    
    void main() {
      vColor = instanceColor;
      vUv = uv;
      
      // Add slight pulsing based on instance position to simulate "living" manifold
      vec3 pos = position;
      float pulse = sin(instanceMatrix[3][0] * 0.1 + instanceMatrix[3][1] * 0.1) * 0.05;
      pos += normal * pulse;
      
      gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying vec2 vUv;
    
    void main() {
      // Create a soft glowing sphere effect instead of a hard polygon
      float dist = distance(vUv, vec2(0.5));
      if (dist > 0.5) discard;
      
      float intensity = 1.0 - (dist * 2.0);
      intensity = pow(intensity, 1.5); // Sharp center, soft edge
      
      gl_FragColor = vec4(vColor * intensity * 1.5, 1.0);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});

export default function InstancedNodes() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const nodes = useUIStore((state) => state.nodes);
  const activeNodeId = useUIStore((state) => state.activeNodeId);
  const setActiveNode = useUIStore((state) => state.setActiveNode);
  const setHoveredNode = useUIStore((state) => state.setHoveredNode);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(nodes.length * 3);
    const colors = new Float32Array(nodes.length * 3);
    
    nodes.forEach((node, i) => {
      positions[i * 3] = node.umap_x;
      positions[i * 3 + 1] = node.umap_y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15; // Z-depth for 3D topology
      
      // Base color logic: distance from center alters hue slightly
      const distFromCenter = Math.sqrt(node.umap_x * node.umap_x + node.umap_y * node.umap_y);
      const color = new THREE.Color().setHSL(0.55 + (distFromCenter * 0.002), 0.8, 0.4);
      color.toArray(colors, i * 3);
    });
    
    return { positions, colors };
  }, [nodes]);

  useEffect(() => {
    if (!meshRef.current) return;
    
    for (let i = 0; i < nodes.length; i++) {
      dummy.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      
      // Randomize scale slightly for topological variety
      const scale = 0.5 + Math.random() * 1.5;
      dummy.scale.set(scale, scale, scale);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      
      const c = new THREE.Color(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]);
      meshRef.current.setColorAt(i, c);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [nodes, positions, colors]);

  useEffect(() => {
    if (!meshRef.current || !meshRef.current.instanceColor) return;
    
    for (let i = 0; i < nodes.length; i++) {
      const c = new THREE.Color(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]);
      meshRef.current.setColorAt(i, c);
    }
    
    if (activeNodeId) {
      const index = nodes.findIndex((n) => n.spotify_track_id === activeNodeId);
      if (index !== -1) {
        meshRef.current.setColorAt(index, ACTIVE_COLOR);
      }
    }
    
    meshRef.current.instanceColor.needsUpdate = true;
  }, [activeNodeId, nodes, colors]);

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    const instanceId = e.instanceId;
    if (instanceId === undefined || !meshRef.current || !meshRef.current.instanceColor) return;
    
    const hoveredNode = nodes[instanceId];
    if (hoveredNode.spotify_track_id === activeNodeId) return;

    meshRef.current.setColorAt(instanceId, HOVER_COLOR);
    meshRef.current.instanceColor.needsUpdate = true;
    
    document.body.style.cursor = 'pointer';
    setHoveredNode({ data: hoveredNode, x: e.clientX, y: e.clientY });
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    const instanceId = e.instanceId;
    if (instanceId === undefined || !meshRef.current || !meshRef.current.instanceColor) return;
    
    const node = nodes[instanceId];
    if (node.spotify_track_id !== activeNodeId) {
      const originalColor = new THREE.Color(colors[instanceId * 3], colors[instanceId * 3 + 1], colors[instanceId * 3 + 2]);
      meshRef.current.setColorAt(instanceId, originalColor);
      meshRef.current.instanceColor.needsUpdate = true;
    }
    
    document.body.style.cursor = 'default';
    setHoveredNode(null);
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    const instanceId = e.instanceId;
    if (instanceId !== undefined) {
      const node = nodes[instanceId];
      setActiveNode(node.spotify_track_id, true);
    }
  };

  return (
    <Bvh firstHitOnly>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, nodes.length]}
        onPointerOver={handlePointerOver}
        onPointerMove={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        frustumCulled={true}
        material={TopologyNodeMaterial}
      >
        <sphereGeometry args={[0.3, 16, 16]} />
      </instancedMesh>
    </Bvh>
  );
}
