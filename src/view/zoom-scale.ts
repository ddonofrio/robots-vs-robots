import * as THREE from 'three';

export function zoomDistanceAt(progress: number, minimumDistance: number, maximumDistance: number): number {
  const normalized = THREE.MathUtils.clamp(progress,0,1);
  return maximumDistance * (minimumDistance / maximumDistance) ** normalized;
}

export function zoomProgressAt(distance: number, minimumDistance: number, maximumDistance: number): number {
  const clamped = THREE.MathUtils.clamp(distance,minimumDistance,maximumDistance);
  if(clamped===maximumDistance)return 0;
  if(clamped===minimumDistance)return 1;
  return Math.log(clamped / maximumDistance) / Math.log(minimumDistance / maximumDistance);
}
