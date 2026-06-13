"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackSide, Vector3 } from "three";
import type { Group, Mesh } from "three";
import styles from "./workspace.module.css";

const MILESTONES = [
  "research",
  "projects",
  "case studies",
  "partnerships",
  "journal entries",
];

const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const PAPER_LIMIT = 420;
const SPAWN_POSITION = new Vector3(0, 1.42, 7.8);
const TYPEWRITER_POSITION = new Vector3(0, -0.36, 0);
const TYPEWRITER_LOOK_AT = new Vector3(0, 0.68, -0.18);
const WRITING_CAMERA_POSITION = new Vector3(0.08, 1.28, 2.42);
const WRITING_LOOK_AT = new Vector3(0, 0.68, -0.05);
const PAPER_WORLD_POSITION = new Vector3(0.02, 1.05, -0.48);

type KeyPress = {
  key: string;
  stamp: number;
};

type DragRotation = {
  x: number;
  y: number;
};

type VisionParticle = {
  id: number;
  text: string;
  createdAt: number;
  target: [number, number, number];
};

type VisionStar = {
  id: number;
  text: string;
  position: [number, number, number];
};

function normalizeKey(key: string) {
  if (key === " ") return "SPACE";
  if (key === "Backspace") return "BACKSPACE";
  const upper = key.toUpperCase();
  return /^[A-Z0-9]$/.test(upper) ? upper : "";
}

function WorkspaceScene({
  paperText,
  activeKey,
  isWriting,
  scrollProgress,
  dragRotation,
  launchedVisions,
  visionStars,
  onVisionSettled,
  onVisionSelect,
}: {
  paperText: string;
  activeKey: KeyPress | null;
  isWriting: boolean;
  scrollProgress: number;
  dragRotation: DragRotation;
  launchedVisions: VisionParticle[];
  visionStars: VisionStar[];
  onVisionSettled: (vision: VisionParticle) => void;
  onVisionSelect: (vision: VisionStar) => void;
}) {
  return (
    <Canvas
      className={styles.canvas}
      camera={{ position: SPAWN_POSITION.toArray(), fov: 58 }}
      dpr={[1, 1.75]}
      shadows
      gl={{ antialias: true }}
    >
      <CameraRig scrollProgress={scrollProgress} dragRotation={dragRotation} />
      <color attach="background" args={[isWriting ? "#070909" : "#0b0f0f"]} />
      <fog attach="fog" args={[isWriting ? "#070909" : "#0b0f0f", 7, 42]} />
      <ambientLight intensity={isWriting ? 0.34 : 0.48} />
      <directionalLight
        position={[-3.5, 5.4, 3.2]}
        intensity={isWriting ? 1.05 : 1.35}
        color="#d8cab3"
        castShadow
      />
      <spotLight
        position={[0.2, 5.4, 2.2]}
        angle={0.34}
        penumbra={0.75}
        intensity={isWriting ? 7.2 : 5.8}
        color="#caa772"
        castShadow
      />
      <pointLight position={[0.8, 1.35, 1.1]} intensity={isWriting ? 3.6 : 2.6} color="#b89562" />
      <pointLight position={[-6.8, 1.8, -5.2]} intensity={isWriting ? 0.38 : 0.8} color="#7f9d94" />
      <ObservatoryVoid />
      <SparseStarfield
        isWriting={isWriting}
        dragRotation={dragRotation}
        visionStars={visionStars}
        onVisionSelect={onVisionSelect}
      />
      <VisionLaunches visions={launchedVisions} onVisionSettled={onVisionSettled} />
      <CenterPath />
      <ResearchObservatory />
      <Typewriter paperText={paperText} activeKey={activeKey} isWriting={isWriting} />
    </Canvas>
  );
}

function CameraRig({
  scrollProgress,
  dragRotation,
}: {
  scrollProgress: number;
  dragRotation: DragRotation;
}) {
  const { camera } = useThree();
  const lookAtTarget = useRef(TYPEWRITER_LOOK_AT.clone());
  const easedProgress = Math.min(1, Math.max(0, scrollProgress));

  useFrame(() => {
    const approach = easedProgress * easedProgress * (3 - 2 * easedProgress);
    const targetPosition = SPAWN_POSITION.clone().lerp(WRITING_CAMERA_POSITION, approach);

    const targetLookAt = TYPEWRITER_LOOK_AT.clone().lerp(WRITING_LOOK_AT, approach);

    camera.position.lerp(targetPosition, 0.075);
    lookAtTarget.current.lerp(targetLookAt, 0.09);
    camera.lookAt(lookAtTarget.current);
  });

  return null;
}

function ObservatoryVoid() {
  return (
    <group>
      <mesh position={[0, 1.45, -14]} rotation={[0, 0, 0]}>
        <sphereGeometry args={[18, 48, 24, 0, Math.PI * 2, 0, Math.PI]} />
        <meshBasicMaterial color="#070b0b" transparent opacity={0.64} side={BackSide} />
      </mesh>
      <mesh position={[0, -0.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.46, 1.68, 0.24, 96]} />
        <meshStandardMaterial color="#111414" roughness={0.82} metalness={0.32} />
      </mesh>
      <mesh position={[0, -0.67, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.48, 2.12, 96]} />
        <meshBasicMaterial color="#b59661" transparent opacity={0.08} />
      </mesh>
      <mesh position={[0, -0.92, -0.34]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.8, 128]} />
        <meshBasicMaterial color="#050606" transparent opacity={0.2} />
      </mesh>
      <Text
        position={[-5.7, 3.4, -12.4]}
        rotation={[0, 0.28, 0]}
        fontSize={0.12}
        letterSpacing={0.16}
        color="#485651"
        anchorX="left"
      >
        OBSERVATORY VOID
      </Text>
    </group>
  );
}

function SparseStarfield({
  isWriting,
  dragRotation,
  visionStars,
  onVisionSelect,
}: {
  isWriting: boolean;
  dragRotation: DragRotation;
  visionStars: VisionStar[];
  onVisionSelect: (vision: VisionStar) => void;
}) {
  const stars = useMemo(
    () =>
      Array.from({ length: 190 }, (_, index) => {
        const lane = index % 9;
        const spread = lane === 0 ? 24 : 38;
        return {
          id: index,
          x: ((index * 37) % 100) / 100 * spread - spread / 2,
          y: -2.8 + ((index * 61) % 100) / 100 * 13.6,
          z: -5 - ((index * 43) % 100) / 100 * 28,
          size: 0.009 + (((index * 17) % 100) / 100) * 0.02,
          opacity: 0.1 + (((index * 29) % 100) / 100) * 0.32,
        };
      }),
    [],
  );

  return (
    <group rotation={[dragRotation.y * 0.72, dragRotation.x * 0.42, 0]}>
      {stars.map((star) => (
        <mesh key={star.id} position={[star.x, star.y, star.z]}>
          <sphereGeometry args={[star.size, 8, 8]} />
          <meshBasicMaterial
            color="#d7c7a8"
            transparent
            opacity={isWriting ? star.opacity * 0.42 : star.opacity}
          />
        </mesh>
      ))}
      {[[-1.8, 3.3, -15.6], [3.4, 4.6, -21], [6.7, 2.4, -13.8]].map((position, index) => (
        <group key={index} position={position as [number, number, number]}>
          <mesh>
            <sphereGeometry args={[0.035 + index * 0.012, 16, 16]} />
            <meshBasicMaterial color="#fff1c8" transparent opacity={isWriting ? 0.42 : 0.86} />
          </mesh>
          <mesh>
            <ringGeometry args={[0.18 + index * 0.06, 0.185 + index * 0.06, 48]} />
            <meshBasicMaterial color="#b59661" transparent opacity={isWriting ? 0.08 : 0.22} />
          </mesh>
        </group>
      ))}
      {visionStars.map((star) => (
        <group
          key={star.id}
          position={star.position}
          onClick={(event: ThreeEvent<MouseEvent>) => {
            event.stopPropagation();
            onVisionSelect(star);
          }}
        >
          <mesh>
            <sphereGeometry args={[0.09, 18, 18]} />
            <meshBasicMaterial color="#fff4c9" transparent opacity={0.94} />
          </mesh>
          <mesh>
            <ringGeometry args={[0.31, 0.318, 64]} />
            <meshBasicMaterial color="#d7a95f" transparent opacity={0.32} />
          </mesh>
        </group>
      ))}
      <Text
        position={[-6.1, 2.2, -9.5]}
        rotation={[0, 0.25, 0]}
        fontSize={0.11}
        letterSpacing={0.14}
        color="#5f6c67"
        anchorX="left"
      >
        EMPTY FIELD / AWAITING VISIONS
      </Text>
    </group>
  );
}

function VisionLaunches({
  visions,
  onVisionSettled,
}: {
  visions: VisionParticle[];
  onVisionSettled: (vision: VisionParticle) => void;
}) {
  return (
    <group>
      {visions.map((vision) => (
        <VisionParticle key={vision.id} vision={vision} onSettled={onVisionSettled} />
      ))}
    </group>
  );
}

function VisionParticle({
  vision,
  onSettled,
}: {
  vision: VisionParticle;
  onSettled: (vision: VisionParticle) => void;
}) {
  const group = useRef<Group>(null);
  const hasSettled = useRef(false);
  const start = PAPER_WORLD_POSITION;
  const target = useMemo(() => new Vector3(...vision.target), [vision.target]);
  const rocketTip = useRef<Mesh>(null);
  const leftFin = useRef<Mesh>(null);
  const rightFin = useRef<Mesh>(null);
  const paperBody = useRef<Mesh>(null);

  useFrame(() => {
    const age = performance.now() - vision.createdAt;
    const progress = Math.min(1, age / 2400);
    const eased = progress * progress * (3 - 2 * progress);
    const fold = Math.min(1, progress / 0.28);
    const launch = Math.max(0, (progress - 0.22) / 0.78);
    const arc = Math.sin(launch * Math.PI) * 1.6;

    if (group.current) {
      group.current.position.lerpVectors(start, target, launch * launch * (3 - 2 * launch));
      group.current.position.y += arc;
      group.current.scale.setScalar(1 - launch * 0.65);
      group.current.rotation.x = -0.18 - launch * 0.55;
      group.current.rotation.z = launch * 0.2;
    }

    if (paperBody.current) {
      paperBody.current.scale.x = 1 - fold * 0.52;
      paperBody.current.scale.y = 1 - fold * 0.28;
    }

    if (rocketTip.current) {
      rocketTip.current.visible = fold > 0.18;
      rocketTip.current.scale.y = fold;
    }

    if (leftFin.current && rightFin.current) {
      leftFin.current.visible = fold > 0.32;
      rightFin.current.visible = fold > 0.32;
      leftFin.current.rotation.z = -fold * 0.55;
      rightFin.current.rotation.z = fold * 0.55;
    }

    if (progress >= 1 && !hasSettled.current) {
      hasSettled.current = true;
      onSettled(vision);
    }
  });

  return (
    <group ref={group} position={start.toArray()} rotation={[-0.18, 0, 0]}>
      <mesh ref={paperBody}>
        <planeGeometry args={[1.16, 1.42]} />
        <meshBasicMaterial color="#efe3ca" transparent opacity={0.94} />
      </mesh>
      <mesh ref={rocketTip} position={[0, 0.82, 0.01]}>
        <coneGeometry args={[0.24, 0.54, 3]} />
        <meshBasicMaterial color="#f2e5c9" transparent opacity={0.94} />
      </mesh>
      <mesh ref={leftFin} position={[-0.32, -0.52, 0.012]}>
        <planeGeometry args={[0.34, 0.42]} />
        <meshBasicMaterial color="#d7c39e" transparent opacity={0.88} />
      </mesh>
      <mesh ref={rightFin} position={[0.32, -0.52, 0.012]}>
        <planeGeometry args={[0.34, 0.42]} />
        <meshBasicMaterial color="#d7c39e" transparent opacity={0.88} />
      </mesh>
      <mesh position={[0, -0.92, 0.02]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshBasicMaterial color="#ffc56f" transparent opacity={0.78} />
      </mesh>
      <Text
        position={[-0.46, 0.42, 0.02]}
        fontSize={0.07}
        maxWidth={0.9}
        lineHeight={1.2}
        color="#2b251d"
        anchorX="left"
        anchorY="top"
      >
        {vision.text.slice(0, 90)}
      </Text>
    </group>
  );
}

function CenterPath() {
  return (
    <group position={[-1.6, -0.58, -1.05]} rotation={[0, 0.08, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.12, 0.02, -3.1]}>
        <planeGeometry args={[0.026, 8.4]} />
        <meshBasicMaterial color="#b59661" transparent opacity={0.18} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.12, 0.02, -3.1]}>
        <planeGeometry args={[0.026, 8.4]} />
        <meshBasicMaterial color="#b59661" transparent opacity={0.18} />
      </mesh>
      {MILESTONES.map((label, index) => (
        <Milestone key={label} label={label} index={index} />
      ))}
      <Text
        position={[0, 0.08, -6.72]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.19}
        letterSpacing={0.12}
        color="#8f805f"
        anchorX="center"
      >
        FORWARD INDEX
      </Text>
    </group>
  );
}

function Milestone({ label, index }: { label: string; index: number }) {
  const z = -1.9 - index * 1.26;
  const depthScale = 1 - index * 0.055;
  const width = (index % 2 === 0 ? 1.5 : 1.22) * depthScale;

  return (
    <group position={[index % 2 === 0 ? -0.42 : 0.42, 0.075, z]} scale={depthScale}>
      <mesh rotation={[-Math.PI / 2, 0, index % 2 === 0 ? -0.05 : 0.05]} castShadow>
        <boxGeometry args={[width, 0.86, 0.06]} />
        <meshStandardMaterial color="#232522" roughness={0.86} metalness={0.15} transparent opacity={0.62} />
      </mesh>
      <Text
        position={[0, 0.055, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.125}
        color="#d3c7b4"
        anchorX="center"
      >
        {label.toUpperCase()}
      </Text>
      <Text
        position={[-width / 2 + 0.16, 0.057, 0.25]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.07}
        color="#a88a5a"
        anchorX="left"
      >
        {String(index + 1).padStart(2, "0")}
      </Text>
    </group>
  );
}

function ResearchObservatory() {
  return (
    <group position={[-5.5, 0.55, -3.9]} rotation={[0, 0.55, 0]} scale={0.68}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.34, 1.8, 32]} />
        <meshStandardMaterial color="#1b201d" roughness={0.86} metalness={0.28} />
      </mesh>
      <mesh position={[0, 0.95, 0]} rotation={[Math.PI / 2, 0.2, 0]}>
        <coneGeometry args={[0.7, 1.2, 32, 1, true]} />
        <meshStandardMaterial color="#151b19" roughness={0.78} metalness={0.36} />
      </mesh>
      <mesh position={[0, 1.02, -0.38]} rotation={[Math.PI / 2, 0.2, 0]}>
        <ringGeometry args={[0.42, 0.44, 48]} />
        <meshBasicMaterial color="#6c8f81" transparent opacity={0.32} />
      </mesh>
      <Text position={[0, -1.12, 0.14]} fontSize={0.12} letterSpacing={0.08} color="#c8b999">
        RESEARCH OBSERVATORY
      </Text>
    </group>
  );
}

function Typewriter({
  paperText,
  activeKey,
  isWriting,
}: {
  paperText: string;
  activeKey: KeyPress | null;
  isWriting: boolean;
}) {
  const carriage = useRef<Group>(null);
  const carriageAdvance = Math.min(paperText.length * 0.01, 0.88);

  useFrame(() => {
    if (!carriage.current) return;
    carriage.current.position.x += (carriageAdvance - carriage.current.position.x) * 0.12;
  });

  return (
    <group position={TYPEWRITER_POSITION.toArray()} rotation={[0, 0, 0]} scale={0.92}>
      <mesh position={[0, -0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.16, 0.42, 1.9]} />
        <meshStandardMaterial color="#111313" roughness={0.68} metalness={0.55} />
      </mesh>
      <mesh position={[0, -0.01, 0.08]} rotation={[-0.15, 0, 0]} castShadow>
        <boxGeometry args={[2.65, 0.22, 1.25]} />
        <meshStandardMaterial color="#1c1b18" roughness={0.78} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.08, 0.72]} castShadow>
        <boxGeometry args={[2.85, 0.18, 0.24]} />
        <meshStandardMaterial color="#070808" roughness={0.5} metalness={0.72} />
      </mesh>
      <group ref={carriage} position={[0, 0.72, -0.38]}>
        <mesh castShadow>
          <boxGeometry args={[2.55, 0.16, 0.22]} />
          <meshStandardMaterial color="#090a0a" roughness={0.42} metalness={0.82} />
        </mesh>
        <mesh position={[0, 0.55, -0.06]} rotation={[-0.18, 0, 0]} castShadow>
          <boxGeometry args={[2.02, 1.66, 0.045]} />
          <meshStandardMaterial color="#eee6d6" roughness={0.78} metalness={0.02} />
        </mesh>
        <Text
          position={[-0.78, 1.17, -0.142]}
          rotation={[-0.18, 0, 0]}
          fontSize={0.07}
          lineHeight={1.24}
          maxWidth={1.42}
          color="#26221b"
          anchorX="left"
          anchorY="top"
        >
          {paperText || " "}
        </Text>
      </group>
      <Keyboard activeKey={activeKey} />
      <TypeBars activeKey={activeKey} />
      <mesh position={[-1.55, 0.82, -0.37]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.065, 0.065, 0.46, 24]} />
        <meshStandardMaterial color="#0b0c0c" roughness={0.36} metalness={0.86} />
      </mesh>
      <mesh position={[1.55, 0.82, -0.37]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.065, 0.065, 0.46, 24]} />
        <meshStandardMaterial color="#0b0c0c" roughness={0.36} metalness={0.86} />
      </mesh>
      <Text position={[0, -0.02, 1.04]} fontSize={0.08} color="#8e7a5a" anchorX="center">
        {isWriting ? "LIVE CARRIAGE" : "WAITING FOR INPUT"}
      </Text>
    </group>
  );
}

function Keyboard({ activeKey }: { activeKey: KeyPress | null }) {
  const keys = useMemo(() => {
    const allKeys: Array<{ key: string; x: number; y: number; row: number }> = [];
    KEY_ROWS.forEach((row, rowIndex) => {
      const rowOffset = rowIndex * 0.14;
      const startX = -(row.length - 1) * 0.135 + rowOffset;
      row.split("").forEach((key, column) => {
        allKeys.push({
          key,
          x: startX + column * 0.27,
          y: 0.38 - rowIndex * 0.24,
          row: rowIndex,
        });
      });
    });
    allKeys.push({ key: "SPACE", x: 0, y: -0.42, row: 3 });
    return allKeys;
  }, []);

  return (
    <group position={[0, 0.22, 0.42]} rotation={[-0.58, 0, 0]}>
      {keys.map((key) => (
        <TypeKey key={key.key} item={key} activeKey={activeKey} />
      ))}
    </group>
  );
}

function TypeKey({
  item,
  activeKey,
}: {
  item: { key: string; x: number; y: number; row: number };
  activeKey: KeyPress | null;
}) {
  const ref = useRef<Mesh>(null);
  const isActive = activeKey?.key === item.key;
  const target = isActive ? -0.045 : 0;

  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.z += (target - ref.current.position.z) * 0.42;
  });

  return (
    <group position={[item.x, item.y, 0]}>
      <mesh ref={ref} castShadow>
        <cylinderGeometry args={[item.key === "SPACE" ? 0.31 : 0.095, item.key === "SPACE" ? 0.29 : 0.083, 0.07, 28]} />
        <meshStandardMaterial
          color={isActive ? "#d0b077" : "#151615"}
          roughness={0.44}
          metalness={0.68}
        />
      </mesh>
      <Text position={[0, 0, 0.055]} fontSize={item.key === "SPACE" ? 0.045 : 0.06} color="#d8d1c3">
        {item.key === "SPACE" ? "SPACE" : item.key}
      </Text>
    </group>
  );
}

function TypeBars({ activeKey }: { activeKey: KeyPress | null }) {
  const bars = useMemo(
    () =>
      "QWERTYUIOPASDFGHJKLZXCVBNM".split("").map((key, index, array) => ({
        key,
        angle: -0.68 + (index / (array.length - 1)) * 1.36,
      })),
    [],
  );

  return (
    <group position={[0, 0.62, 0.02]}>
      {bars.map((bar) => (
        <TypeBar key={bar.key} active={activeKey?.key === bar.key} angle={bar.angle} />
      ))}
    </group>
  );
}

function TypeBar({ active, angle }: { active: boolean; angle: number }) {
  const ref = useRef<Group>(null);

  useFrame(() => {
    if (!ref.current) return;
    const target = active ? -0.48 : 0;
    ref.current.rotation.x += (target - ref.current.rotation.x) * 0.36;
  });

  return (
    <group ref={ref} rotation={[0, angle, 0]} position={[0, 0, 0]}>
      <mesh position={[0, 0.03, -0.34]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.009, 0.009, 0.88, 8]} />
        <meshStandardMaterial color="#1f201e" roughness={0.5} metalness={0.9} />
      </mesh>
      <mesh position={[0, 0.1, -0.78]} castShadow>
        <boxGeometry args={[0.08, 0.06, 0.015]} />
        <meshStandardMaterial color="#090a0a" roughness={0.4} metalness={0.85} />
      </mesh>
    </group>
  );
}

export default function WorkspacePage() {
  const workspaceRef = useRef<HTMLElement>(null);
  const isDragging = useRef(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [dragRotation, setDragRotation] = useState<DragRotation>({ x: 0, y: 0 });
  const [isWriting, setIsWriting] = useState(false);
  const [paperText, setPaperText] = useState("");
  const [activeKey, setActiveKey] = useState<KeyPress | null>(null);
  const [launchedVisions, setLaunchedVisions] = useState<VisionParticle[]>([]);
  const [visionStars, setVisionStars] = useState<VisionStar[]>([]);
  const [selectedVision, setSelectedVision] = useState<VisionStar | null>(null);

  useEffect(() => {
    const updateProgress = () => {
      if (!workspaceRef.current) return;
      const rect = workspaceRef.current.getBoundingClientRect();
      const travel = workspaceRef.current.offsetHeight - window.innerHeight;
      const nextProgress = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
      setScrollProgress(nextProgress);
      setIsWriting(nextProgress > 0.82);

      const header = document.querySelector<HTMLElement>("header");
      if (header) {
        const headerFade = Math.min(1, Math.max(0, (nextProgress - 0.08) / 0.22));
        header.style.opacity = `${1 - headerFade}`;
        header.style.transform = `translateY(${-headerFade * 20}px)`;
        header.style.pointerEvents = headerFade > 0.9 ? "none" : "";
      }
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
      const header = document.querySelector<HTMLElement>("header");
      if (header) {
        header.style.opacity = "";
        header.style.transform = "";
        header.style.pointerEvents = "";
      }
    };
  }, []);

  const launchIdea = () => {
    const text = paperText.trim();
    if (!text) return;

    const id = Date.now();
    const target: [number, number, number] = [
      -2.4 + (id % 7) * 0.82,
      3.2 + (id % 5) * 0.48,
      -12 - (id % 9) * 1.15,
    ];

    setLaunchedVisions((current) => [
      ...current,
      { id, text, target, createdAt: performance.now() },
    ]);
    setPaperText("");
  };

  const settleVision = (vision: VisionParticle) => {
    setLaunchedVisions((current) => current.filter((item) => item.id !== vision.id));
    setVisionStars((current) => [
      ...current,
      { id: vision.id, text: vision.text, position: vision.target },
    ]);
  };

  useEffect(() => {
    if (!isWriting) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = normalizeKey(event.key);
      if (!key) return;

      event.preventDefault();
      setActiveKey({ key, stamp: performance.now() });

      if (key === "BACKSPACE") {
        setPaperText((current) => current.slice(0, -1));
        return;
      }

      const character = key === "SPACE" ? " " : event.key.length === 1 ? event.key : "";
      if (!character) return;

      setPaperText((current) => {
        if (current.length >= PAPER_LIMIT) return current;
        return `${current}${character}`;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isWriting]);

  useEffect(() => {
    if (!activeKey) return;
    const timeout = window.setTimeout(() => setActiveKey(null), 120);
    return () => window.clearTimeout(timeout);
  }, [activeKey]);

  return (
    <section
      ref={workspaceRef}
      className={styles.workspace}
      onPointerDown={() => {
        isDragging.current = true;
      }}
      onPointerMove={(event) => {
        if (!isDragging.current) return;
        setDragRotation((current) => ({
          x: Math.max(-1, Math.min(1, current.x + event.movementX * 0.004)),
          y: Math.max(-0.8, Math.min(0.8, current.y - event.movementY * 0.003)),
        }));
      }}
      onPointerUp={() => {
        isDragging.current = false;
      }}
      onPointerLeave={() => {
        isDragging.current = false;
      }}
    >
      <div className={`${styles.sceneFrame} ${isWriting ? styles.sceneFrameWriting : ""}`}>
        <WorkspaceScene
          paperText={paperText}
          activeKey={activeKey}
          isWriting={isWriting}
          scrollProgress={scrollProgress}
          dragRotation={dragRotation}
          launchedVisions={launchedVisions}
          visionStars={visionStars}
          onVisionSettled={settleVision}
          onVisionSelect={setSelectedVision}
        />
        <div className={`${styles.interfaceLayer} ${isWriting ? styles.interfaceLayerWriting : ""}`}>
          <div className={styles.statusBlock}>
            <span>Centari Workspace</span>
            <strong>Vision Machine</strong>
            <p>
              {isWriting
                ? "Write what should exist. The machine is listening."
                : "Cross the dark floor. Approach the machine."}
            </p>
          </div>
          <button
            type="button"
            className={`${styles.writeButton} ${isWriting ? styles.writeButtonActive : ""}`}
            onClick={launchIdea}
            disabled={!isWriting || !paperText.trim()}
          >
            Launch idea
          </button>
          <div className={styles.zoneReadout}>
            <span>{Math.round(scrollProgress * 100).toString().padStart(2, "0")} / approach</span>
            <span>{isWriting ? "Writing mode" : "Scroll forward"}</span>
            <span>{visionStars.length} temporary stars</span>
          </div>
          {selectedVision ? (
            <div className={styles.visionCard}>
              <span>Temporary Vision</span>
              <p>{selectedVision.text}</p>
              <button type="button" onClick={() => setSelectedVision(null)}>
                Close
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
