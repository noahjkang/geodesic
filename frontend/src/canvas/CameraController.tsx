import { useFrame } from '@react-three/fiber';
import { useUIStore } from '../store/useUIStore';
import * as THREE from 'three';

const targetPosition = new THREE.Vector3();

export default function CameraController() {
  const cameraTarget = useUIStore((state) => state.cameraTarget);

  useFrame((state, delta) => {
    targetPosition.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
    
    // Smoothly interpolate the camera's current position towards the target
    state.camera.position.lerp(targetPosition, 4.0 * delta);
    
    // If MapControls is the default, we also need to interpolate its focal target 
    // to look precisely at the vector node, not the origin [0,0,0]
    if (state.controls) {
      // We want the controls to look at the node, which is just directly "down" from the camera on the Z axis
      const lookTarget = new THREE.Vector3(cameraTarget[0], cameraTarget[1], 0);
      // @ts-ignore - controls.target exists on MapControls/OrbitControls
      state.controls.target.lerp(lookTarget, 4.0 * delta);
    }
  });

  return null;
}
