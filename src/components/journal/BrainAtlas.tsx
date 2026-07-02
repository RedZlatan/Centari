"use client";

import { useMemo, useRef, useState } from "react";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Mesh, MeshPhysicalMaterial, Object3D } from "three";
import type { Group } from "three";
import styles from "./BrainAtlas.module.css";

const BRAIN_MODEL_PATH = "/models/brain-atlas.glb";

type BrainRegion = {
  id: string;
  label: string;
  area: string;
  role: string;
  centariUse: string;
  evidence: string[];
  position: [number, number, number];
  scale: [number, number, number];
};

const brainRegions: BrainRegion[] = [
  {
    id: "prefrontal",
    label: "Prefrontal cortex",
    area: "Planning / judgement",
    role: "Supports planning, inhibition, working memory, and deliberate decision making.",
    centariUse:
      "Useful when we study command interfaces, prioritisation, and how teams choose the next action under uncertainty.",
    evidence: ["decision stress", "task switching", "confidence"],
    position: [-0.82, 0.26, 0.78],
    scale: [0.28, 0.32, 0.22],
  },
  {
    id: "premotor",
    label: "Premotor cortex",
    area: "Action preparation",
    role: "Helps prepare movements and connect visual cues to planned action.",
    centariUse:
      "Important for spatial training, rehearsal, and interfaces where seeing something should make the right action easier.",
    evidence: ["rehearsal", "tool use", "procedural learning"],
    position: [-0.32, 0.62, 0.78],
    scale: [0.24, 0.3, 0.2],
  },
  {
    id: "somatosensory",
    label: "Somatosensory cortex",
    area: "Touch / body state",
    role: "Processes touch, pressure, body position, and physical feedback from the environment.",
    centariUse:
      "Guides notes on haptics, gloves, fatigue, field conditions, and when physical reality beats simulation.",
    evidence: ["haptics", "field friction", "physical feedback"],
    position: [0.08, 0.6, 0.78],
    scale: [0.24, 0.3, 0.2],
  },
  {
    id: "visual",
    label: "Visual cortex",
    area: "Sight / pattern",
    role: "Processes visual information and helps detect shape, motion, contrast, and spatial pattern.",
    centariUse:
      "Connects to dashboards, maps, 3D views, and the question of when information becomes easier to understand by seeing it.",
    evidence: ["maps", "pattern detection", "visual load"],
    position: [0.86, 0.18, 0.74],
    scale: [0.3, 0.32, 0.22],
  },
  {
    id: "temporal",
    label: "Temporal cortex",
    area: "Sound / meaning",
    role: "Supports auditory processing, language, and recognition of meaningful signals over time.",
    centariUse:
      "A home for notes on alerts, radio, speech, rhythm, signal recognition, and sonic interfaces.",
    evidence: ["audio cues", "language", "signal timing"],
    position: [0.42, -0.38, 0.8],
    scale: [0.28, 0.22, 0.2],
  },
  {
    id: "hippocampus",
    label: "Hippocampus",
    area: "Memory / place",
    role: "Central for forming memories and linking experience to place, context, and sequence.",
    centariUse:
      "This is the core of the Memory Bank: what we keep, where it belongs, and why people can find it again.",
    evidence: ["spatial memory", "story recall", "return paths"],
    position: [0.04, -0.12, 0.96],
    scale: [0.22, 0.16, 0.16],
  },
  {
    id: "amygdala",
    label: "Amygdala",
    area: "Threat / salience",
    role: "Helps assign emotional salience, especially around threat, fear, and urgent attention.",
    centariUse:
      "Useful for research on stress, fear, alarms, risk perception, and why people behave differently under pressure.",
    evidence: ["stress", "fear response", "attention capture"],
    position: [-0.18, -0.22, 0.98],
    scale: [0.18, 0.15, 0.14],
  },
];


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

export function BrainAtlas() {
  const [activeId, setActiveId] = useState(brainRegions[0].id);
  const activeRegion = brainRegions.find((region) => region.id === activeId) ?? brainRegions[0];

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
          <BrainModel activeId={activeId} onSelect={setActiveId} />
          <OrbitControls
            autoRotate
            autoRotateSpeed={0.42}
            enableDamping
            enablePan={false}
            maxDistance={7.2}
            minDistance={4.6}
          />
        </Canvas>
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
  onSelect: (id: string) => void;
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
