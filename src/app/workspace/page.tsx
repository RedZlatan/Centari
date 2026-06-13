"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Text } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
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
      camera={{ position: [0, 2.2, 7.6], fov: 43 }}
      dpr={[1, 1.75]}
      shadows
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#101313"]} />
      <fog attach="fog" args={["#101313", 7, 18]} />
      <ambientLight intensity={0.42} />
      <directionalLight
        position={[-4, 6, 4]}
        intensity={1.2}
        color="#d8cab3"
        castShadow
      />
      <pointLight position={[3.4, 2.1, 2.8]} intensity={2.2} color="#ad8d5b" />
      <pointLight position={[-3.6, 1.4, 0.4]} intensity={0.85} color="#7f9d94" />
      <Room />
      <CenterPath />
      <ResearchObservatory />
      <Typewriter paperText={paperText} activeKey={activeKey} isWriting={isWriting} />
    </Canvas>
  );
}

function Room() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.65, -2.2]} receiveShadow>
        <planeGeometry args={[15, 18]} />
        <meshStandardMaterial color="#151918" roughness={0.88} metalness={0.08} />
      </mesh>
      <mesh position={[0, 3.2, -8.2]} receiveShadow>
        <boxGeometry args={[15, 7.8, 0.18]} />
        <meshStandardMaterial color="#111514" roughness={0.96} />
      </mesh>
      <mesh position={[-7.2, 2.1, -2.8]} rotation={[0, 0.22, 0]} receiveShadow>
        <boxGeometry args={[0.18, 5.8, 11]} />
        <meshStandardMaterial color="#141817" roughness={0.92} />
      </mesh>
      <mesh position={[7.2, 2.1, -2.8]} rotation={[0, -0.22, 0]} receiveShadow>
        <boxGeometry args={[0.18, 5.8, 11]} />
        <meshStandardMaterial color="#141817" roughness={0.92} />
      </mesh>
      {[-5.2, -2.6, 0, 2.6, 5.2].map((x) => (
        <mesh key={x} position={[x, -0.62, -3.9]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.018, 10]} />
          <meshBasicMaterial color="#35302a" transparent opacity={0.34} />
        </mesh>
      ))}
    </group>
  );
}

function CenterPath() {
  return (
    <group position={[0, -0.58, -0.2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -3.2]} receiveShadow>
        <planeGeometry args={[2.1, 9.4]} />
        <meshStandardMaterial color="#1e211f" roughness={0.9} metalness={0.08} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.12, 0.02, -3.2]}>
        <planeGeometry args={[0.025, 9.4]} />
        <meshBasicMaterial color="#9d8158" transparent opacity={0.48} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.12, 0.02, -3.2]}>
        <planeGeometry args={[0.025, 9.4]} />
        <meshBasicMaterial color="#9d8158" transparent opacity={0.48} />
      </mesh>
      {MILESTONES.map((label, index) => (
        <Milestone key={label} label={label} index={index} />
      ))}
      <Text
        position={[0, 0.08, -7.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.16}
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
  const z = -1.55 - index * 1.25;
  const width = index % 2 === 0 ? 1.28 : 1.05;

  return (
    <group position={[index % 2 === 0 ? -0.34 : 0.34, 0.06, z]}>
      <mesh rotation={[-Math.PI / 2, 0, index % 2 === 0 ? -0.05 : 0.05]} castShadow>
        <boxGeometry args={[width, 0.78, 0.045]} />
        <meshStandardMaterial color="#232522" roughness={0.86} metalness={0.15} />
      </mesh>
      <Text
        position={[0, 0.055, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.105}
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
    <group position={[-3.95, 0.45, -2.75]} rotation={[0, 0.18, 0]}>
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
  const carriageAdvance = Math.min(paperText.length * 0.008, 0.72);

  useFrame(() => {
    if (!carriage.current) return;
    carriage.current.position.x += (carriageAdvance - carriage.current.position.x) * 0.12;
  });

  return (
    <group position={[3.0, -0.12, -1.18]} rotation={[0, -0.48, 0]}>
      <mesh position={[0, -0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.0, 0.34, 1.75]} />
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
          <boxGeometry args={[1.72, 1.42, 0.045]} />
          <meshStandardMaterial color="#e3ddcf" roughness={0.82} metalness={0.02} />
        </mesh>
        <Html
          transform
          position={[-0.74, 0.79, -0.087]}
          rotation={[-0.18, 0, 0]}
          distanceFactor={4.4}
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
      <div className={styles.sceneFrame}>
        <WorkspaceScene paperText={paperText} activeKey={activeKey} isWriting={isWriting} />
        <div className={styles.interfaceLayer}>
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
