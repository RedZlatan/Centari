"use client";

import { useMemo, useRef, useState } from "react";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Mesh, MeshPhysicalMaterial, Object3D } from "three";
import type { Group } from "three";
import { brainRegions, type BrainRegionId } from "@/lib/brain-regions";
import styles from "./BrainAtlas.module.css";

const BRAIN_MODEL_PATH = "/models/brain-atlas.glb";

const regionMeshMatchers: Record<string, string[]> = {
  prefrontal: ["frontal", "frontopolar", "orbital"],
  premotor: ["precentral", "central_sulcus"],
  somatosensory: ["postcentral", "paracentral", "parietal"],
  visual: ["occipital", "calcarine", "cuneus", "lingual"],
  temporal: ["temporal"],
  hippocampus: ["hippocampus", "fornix", "parahippocampal"],
  amygdala: ["amygdaloid"],
};

function meshBelongsToRegion(name: string, regionId: string) {
  const normalized = name.toLowerCase();
  return regionMeshMatchers[regionId]?.some((part) => normalized.includes(part)) ?? false;
}

export function BrainAtlas({
  selectedId,
  onRegionChange,
}: {
  selectedId?: BrainRegionId;
  onRegionChange?: (id: BrainRegionId) => void;
}) {
  const [internalActiveId, setInternalActiveId] = useState<BrainRegionId>(brainRegions[0].id);
  const activeId = selectedId ?? internalActiveId;
  const activeRegion = brainRegions.find((region) => region.id === activeId) ?? brainRegions[0];
  const selectRegion = (id: BrainRegionId) => {
    setInternalActiveId(id);
    onRegionChange?.(id);
  };

  return (
    <div className={styles.atlas}>
      <div className={styles.model} aria-label="Interactive brain atlas">
        <Canvas
          camera={{ position: [0, 0.12, 5.8], fov: 38 }}
          className={styles.canvas}
          dpr={[1, 1.8]}
        >
          <color attach="background" args={["#050808"]} />
          <ambientLight intensity={0.8} />
          <pointLight color="#9befff" intensity={24} position={[-2.5, 2.8, 3.4]} />
          <pointLight color="#2aa7ff" intensity={12} position={[2.6, -1.4, 2.2]} />
          <BrainModel activeId={activeId} onSelect={selectRegion} />
          <OrbitControls
            autoRotate
            autoRotateSpeed={0.42}
            enableDamping
            enablePan={false}
            maxDistance={7.2}
            minDistance={4.6}
          />
        </Canvas>
        <div className={styles.regionControls} aria-label="Brain regions">
          {brainRegions.map((region) => (
            <button
              key={region.id}
              type="button"
              className={region.id === activeId ? styles.regionActive : ""}
              onClick={() => selectRegion(region.id)}
            >
              <span>{region.area}</span>
              {region.label}
            </button>
          ))}
        </div>
      </div>

      <aside className={styles.panel} aria-live="polite">
        <p className={styles.panelKicker}>Selected region</p>
        <h2>{activeRegion.label}</h2>
        <span className={styles.area}>{activeRegion.area}</span>
        <p>{activeRegion.role}</p>
        <div className={styles.useCase}>
          <strong>Centari lens</strong>
          <p>{activeRegion.centariUse}</p>
        </div>
        <div className={styles.useCase}>
          <strong>Journal role</strong>
          <p>{activeRegion.archiveRole}</p>
        </div>
        <div className={styles.evidence}>
          {activeRegion.evidence.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </aside>
    </div>
  );
}

function BrainModel({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: BrainRegionId) => void;
}) {
  const groupRef = useRef<Group>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { scene } = useGLTF(BRAIN_MODEL_PATH);
  const brainScene = useMemo(() => {
    const cloned = scene.clone(true);
    const glassMaterial = new MeshPhysicalMaterial({
      color: "#34caff",
      emissive: "#056b9f",
      emissiveIntensity: 0.16,
      metalness: 0,
      opacity: 0.16,
      roughness: 0.2,
      thickness: 0.72,
      transparent: true,
      transmission: 0.42,
    });
    const focusMaterial = new MeshPhysicalMaterial({
      color: "#baf7ff",
      emissive: "#55ddff",
      emissiveIntensity: 0.9,
      metalness: 0,
      opacity: 0.42,
      roughness: 0.08,
      thickness: 0.46,
      transparent: true,
      transmission: 0.28,
    });

    cloned.traverse((child: Object3D) => {
      if (child instanceof Mesh) {
        child.material = meshBelongsToRegion(child.name, activeId) ? focusMaterial : glassMaterial;
        child.renderOrder = meshBelongsToRegion(child.name, activeId) ? 3 : 1;
      }
    });

    return cloned;
  }, [activeId, scene]);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    groupRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.45) * 0.03;
  });

  return (
    <group ref={groupRef} rotation={[0.08, -0.32, -0.03]} position={[0, 0.1, 0]}>
      <primitive object={brainScene} position={[0, -0.02, -0.12]} rotation={[0, 0.08, 0]} scale={[1.08, 1.08, 1.08]} />

      <mesh position={[0, 0.08, -0.18]} scale={[2.85, 1.55, 0.82]}>
        <sphereGeometry args={[1, 64, 32]} />
        <meshBasicMaterial color="#5edcff" opacity={0.055} transparent wireframe />
      </mesh>

      {brainRegions.map((region) => {
        const active = region.id === activeId;
        const hovered = region.id === hoveredId;
        const activeScale = region.scale.map((value) => value * (hovered ? 1.16 : 1)) as [
          number,
          number,
          number,
        ];

        return (
          <group key={region.id} position={region.position}>
            <mesh
              scale={activeScale}
              onClick={(event: ThreeEvent<MouseEvent>) => {
                event.stopPropagation();
                onSelect(region.id);
              }}
              onPointerOver={(event: ThreeEvent<PointerEvent>) => {
                event.stopPropagation();
                setHoveredId(region.id);
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                setHoveredId(null);
                document.body.style.cursor = "";
              }}
            >
              <sphereGeometry args={[1, 32, 18]} />
              <meshPhysicalMaterial
                color={active ? "#baf7ff" : hovered ? "#96efff" : "#52d9ff"}
                emissive={active ? "#55ddff" : hovered ? "#37c9ff" : "#0c83ba"}
                emissiveIntensity={active ? 0.75 : hovered ? 0.55 : 0.18}
                opacity={active ? 0.16 : hovered ? 0.18 : 0.055}
                roughness={0.08}
                transparent
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

useGLTF.preload(BRAIN_MODEL_PATH);
