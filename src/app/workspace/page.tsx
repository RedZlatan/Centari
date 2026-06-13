"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Text } from "@react-three/drei";
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
const DEFAULT_CAMERA_POSITION = new Vector3(1.08, 1.58, 3.05);
const DEFAULT_LOOK_AT = new Vector3(0.92, 0.58, 0.12);
const WRITING_CAMERA_POSITION = new Vector3(1.52, 1.42, 2.24);
const WRITING_LOOK_AT = new Vector3(1.16, 0.84, -0.08);

type KeyPress = {
  key: string;
  stamp: number;
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
}: {
  paperText: string;
  activeKey: KeyPress | null;
  isWriting: boolean;
}) {
  return (
    <Canvas
      className={styles.canvas}
      camera={{ position: DEFAULT_CAMERA_POSITION.toArray(), fov: 50 }}
      dpr={[1, 1.75]}
      shadows
      gl={{ antialias: true }}
    >
      <CameraRig isWriting={isWriting} />
      <color attach="background" args={[isWriting ? "#070909" : "#0b0f0f"]} />
      <fog attach="fog" args={[isWriting ? "#070909" : "#0b0f0f", 5.8, 24]} />
      <ambientLight intensity={isWriting ? 0.38 : 0.5} />
      <directionalLight
        position={[-3.5, 5.4, 3.2]}
        intensity={isWriting ? 1.05 : 1.35}
        color="#d8cab3"
        castShadow
      />
      <spotLight
        position={[2.35, 3.2, 2.4]}
        angle={0.46}
        penumbra={0.75}
        intensity={isWriting ? 7.2 : 5.8}
        color="#caa772"
        castShadow
      />
      <pointLight position={[1.95, 1.25, 1.15]} intensity={isWriting ? 3.6 : 3.0} color="#b89562" />
      <pointLight position={[-3.4, 1.35, -0.15]} intensity={isWriting ? 0.55 : 0.95} color="#7f9d94" />
      <ObservatoryVoid />
      <SparseStarfield isWriting={isWriting} />
      <CenterPath />
      <ResearchObservatory />
      <Typewriter paperText={paperText} activeKey={activeKey} isWriting={isWriting} />
    </Canvas>
  );
}

function CameraRig({ isWriting }: { isWriting: boolean }) {
  const { camera } = useThree();
  const lookAtTarget = useRef(DEFAULT_LOOK_AT.clone());

  useFrame(() => {
    const targetPosition = isWriting ? WRITING_CAMERA_POSITION : DEFAULT_CAMERA_POSITION;
    const targetLookAt = isWriting ? WRITING_LOOK_AT : DEFAULT_LOOK_AT;
    camera.position.lerp(targetPosition, 0.055);
    lookAtTarget.current.lerp(targetLookAt, 0.08);
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
      <mesh position={[1.1, -0.82, 0.24]} rotation={[-Math.PI / 2, 0, -0.08]}>
        <ringGeometry args={[1.25, 2.95, 96]} />
        <meshBasicMaterial color="#b59661" transparent opacity={0.07} />
      </mesh>
      <mesh position={[1.1, -0.84, 0.24]} rotation={[-Math.PI / 2, 0, -0.08]}>
        <circleGeometry args={[2.25, 96]} />
        <meshBasicMaterial color="#050606" transparent opacity={0.36} />
      </mesh>
      <Text
        position={[-4.8, 3.3, -11.5]}
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

function SparseStarfield({ isWriting }: { isWriting: boolean }) {
  const stars = useMemo(
    () =>
      Array.from({ length: 150 }, (_, index) => {
        const lane = index % 9;
        const spread = lane === 0 ? 24 : 38;
        return {
          id: index,
          x: ((index * 37) % 100) / 100 * spread - spread / 2,
          y: -2.8 + ((index * 61) % 100) / 100 * 13.6,
          z: -5 - ((index * 43) % 100) / 100 * 28,
          size: 0.009 + (((index * 17) % 100) / 100) * 0.02,
          opacity: 0.12 + (((index * 29) % 100) / 100) * 0.34,
        };
      }),
    [],
  );

  return (
    <group>
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

function CenterPath() {
  return (
    <group position={[-1.95, -0.56, -2.45]} rotation={[0, 0.16, 0]}>
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
    <group position={[-4.6, 0.32, -3.6]} rotation={[0, 0.42, 0]} scale={0.74}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.35, 1.65, 0.16]} />
        <meshStandardMaterial color="#1b201d" roughness={0.9} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0, 0.09]}>
        <planeGeometry args={[2.1, 1.36]} />
        <meshBasicMaterial color="#17201e" transparent opacity={0.88} />
      </mesh>
      {[-0.64, 0, 0.64].map((x) => (
        <mesh key={x} position={[x, 0, 0.11]}>
          <ringGeometry args={[0.2, 0.205, 48]} />
          <meshBasicMaterial color="#6c8f81" transparent opacity={0.36} />
        </mesh>
      ))}
      <Text position={[0, 0.64, 0.14]} fontSize={0.12} letterSpacing={0.08} color="#c8b999">
        RESEARCH OBSERVATORY
      </Text>
      <Text position={[0, -0.62, 0.14]} fontSize={0.075} color="#7f8a83">
        placeholder / inactive
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
    <group position={[1.02, -0.21, 0.8]} rotation={[0, -0.7, 0]} scale={1.62}>
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
        <Html
          transform
          position={[-0.88, 0.91, -0.087]}
          rotation={[-0.18, 0, 0]}
          distanceFactor={3.35}
          occlude
        >
          <div className={styles.paperText}>
            {paperText || <span className={styles.paperGhost}> </span>}
          </div>
        </Html>
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
  const [isWriting, setIsWriting] = useState(false);
  const [paperText, setPaperText] = useState("");
  const [activeKey, setActiveKey] = useState<KeyPress | null>(null);

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
    <section className={styles.workspace}>
      <div className={`${styles.sceneFrame} ${isWriting ? styles.sceneFrameWriting : ""}`}>
        <WorkspaceScene paperText={paperText} activeKey={activeKey} isWriting={isWriting} />
        <div className={`${styles.interfaceLayer} ${isWriting ? styles.interfaceLayerWriting : ""}`}>
          <div className={styles.statusBlock}>
            <span>Workspace W1</span>
            <strong>Vision Machine</strong>
          </div>
          <button
            type="button"
            className={`${styles.writeButton} ${isWriting ? styles.writeButtonActive : ""}`}
            onClick={() => setIsWriting((current) => !current)}
          >
            {isWriting ? "Writing mode active" : "Enter writing mode"}
          </button>
          <div className={styles.zoneReadout}>
            <span>Center: Future index</span>
            <span>Left: Research Observatory</span>
            <span>Right: Typewriter</span>
          </div>
        </div>
      </div>
    </section>
  );
}
