"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackSide, CanvasTexture, ClampToEdgeWrapping, LinearFilter, Vector3 } from "three";
import type { Group, Mesh, Object3D } from "three";
import { Header } from "@/components/layout/Header";
import styles from "./workspace.module.css";

const KEY_ROWS = ["QWERTYUIOPÅ", "ASDFGHJKLÄÖ", "ZXCVBNM"];
const PAPER_LIMIT = 420;
const SPAWN_POSITION = new Vector3(0, 1.42, 7.8);
const TYPEWRITER_POSITION = new Vector3(0, -0.36, 0);
const TYPEWRITER_LOOK_AT = new Vector3(0, 0.68, -0.18);
const WRITING_CAMERA_POSITION = new Vector3(0.03, 1.72, 2.58);
const WRITING_LOOK_AT = new Vector3(0, 0.94, -0.2);
const PAPER_WORLD_POSITION = new Vector3(0.02, 1.05, -0.48);
const TYPEWRITER_MODEL_PATH = "/models/typewriter-lite.glb";
const AUDIO_SOURCES = {
  backspace: "/audio/typewriter-backspace-click.mp3",
  bell: "/audio/typewriter-bell.mp3",
  key: "/audio/typewriter-key-click.mp3",
  pull: "/audio/typewriter-pull.mp3",
} as const;

type AudioCue = keyof typeof AUDIO_SOURCES;

type KeyPress = {
  key: string;
  stamp: number;
};

type DragRotation = {
  x: number;
  y: number;
};

type VisionParticle = {
  id: string;
  text: string;
  createdAt: number;
  target: [number, number, number];
};

type VisionStar = {
  id: string;
  text: string;
  position: [number, number, number];
  createdAt?: string;
};

function normalizeKey(key: string) {
  if (key === " ") return "SPACE";
  if (key === "Backspace") return "BACKSPACE";
  if (key === "Enter") return "ENTER";
  const upper = key.toUpperCase();
  return /^[A-ZÅÄÖ0-9]$/.test(upper) ? upper : "";
}

function useAudioBank() {
  const audioRef = useRef<Partial<Record<AudioCue, HTMLAudioElement>>>({});

  useEffect(() => {
    audioRef.current = Object.fromEntries(
      Object.entries(AUDIO_SOURCES).map(([cue, src]) => {
        const audio = new Audio(src);
        audio.preload = "auto";
        audio.volume = cue === "bell" ? 0.52 : cue === "pull" ? 0.36 : 0.34;
        return [cue, audio];
      }),
    ) as Partial<Record<AudioCue, HTMLAudioElement>>;

    return () => {
      Object.values(audioRef.current).forEach((audio) => {
        audio.pause();
      });
    };
  }, []);

  return useCallback((cue: AudioCue, allowOverlap = false) => {
    const audio = audioRef.current[cue];

    if (!audio) {
      return;
    }

    const node = allowOverlap ? (audio.cloneNode(true) as HTMLAudioElement) : audio;
    node.volume = audio.volume;
    node.currentTime = 0;
    void node.play().catch(() => undefined);
  }, []);
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
      <pointLight position={[0, 0.5, 1.45]} intensity={isWriting ? 1.8 : 1.1} color="#e0c58e" />
      <pointLight position={[-6.8, 1.8, -5.2]} intensity={isWriting ? 0.38 : 0.8} color="#7f9d94" />
      <ObservatoryVoid />
      <SparseStarfield
        isWriting={isWriting}
        dragRotation={dragRotation}
        visionStars={visionStars}
        onVisionSelect={onVisionSelect}
      />
      <VisionLaunches visions={launchedVisions} onVisionSettled={onVisionSettled} />
      <Typewriter
        paperText={paperText}
        activeKey={activeKey}
        isWriting={isWriting}
        isLaunching={launchedVisions.length > 0}
      />
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
      <mesh position={[0, -0.82, -0.08]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.08, 1.22, 0.18, 96]} />
        <meshStandardMaterial color="#101313" roughness={0.86} metalness={0.26} />
      </mesh>
      <mesh position={[0, -0.7, -0.08]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.18, 1.56, 96]} />
        <meshBasicMaterial color="#b59661" transparent opacity={0.06} />
      </mesh>
      <mesh position={[0, -0.94, -0.18]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.72, 128]} />
        <meshBasicMaterial color="#050606" transparent opacity={0.12} />
      </mesh>
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
          <mesh visible={false}>
            <sphereGeometry args={[0.42, 16, 16]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.09, 18, 18]} />
            <meshBasicMaterial color="#fff4c9" transparent opacity={0.94} />
          </mesh>
          <mesh>
            <ringGeometry args={[0.31, 0.318, 64]} />
            <meshBasicMaterial color="#d7a95f" transparent opacity={0.32} />
          </mesh>
          <Html center distanceFactor={18} className={styles.starHitArea}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onVisionSelect(star);
              }}
              aria-label="Open dream"
            />
          </Html>
        </group>
      ))}
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
  const paperBody = useRef<Mesh>(null);
  const lightCore = useRef<Mesh>(null);
  const lightHalo = useRef<Mesh>(null);

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
      group.current.scale.setScalar(1 - launch * 0.18);
      group.current.rotation.x = -0.18 - launch * 0.28;
      group.current.rotation.z = launch * 0.16;
    }

    if (paperBody.current) {
      paperBody.current.scale.x = 1 - fold * 0.86;
      paperBody.current.scale.y = 1 - fold * 0.86;
    }

    if (lightCore.current && lightHalo.current) {
      const pulse = 1 + Math.sin(progress * Math.PI * 8) * 0.08;
      lightCore.current.scale.setScalar((0.18 + fold * 0.72 + launch * 0.5) * pulse);
      lightHalo.current.scale.setScalar(0.55 + fold * 1.1 + launch * 1.3);
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
      <PaperTextTexture text={vision.text.slice(0, 140)} width={0.88} height={0.98} position={[0, 0.05, 0.026]} />
      <mesh ref={lightCore} position={[0, 0, 0.035]}>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshBasicMaterial color="#fff0bd" transparent opacity={0.94} />
      </mesh>
      <mesh ref={lightHalo} position={[0, 0, 0.03]}>
        <ringGeometry args={[0.22, 0.24, 64]} />
        <meshBasicMaterial color="#d7a95f" transparent opacity={0.26} />
      </mesh>
    </group>
  );
}

function PaperTextTexture({
  text,
  width,
  height,
  position,
  rotation = [0, 0, 0],
}: {
  text: string;
  width: number;
  height: number;
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 640;
    const nextTexture = new CanvasTexture(canvas);
    nextTexture.minFilter = LinearFilter;
    nextTexture.magFilter = LinearFilter;
    nextTexture.wrapS = ClampToEdgeWrapping;
    nextTexture.wrapT = ClampToEdgeWrapping;
    return nextTexture;
  }, []);

  useEffect(() => {
    const canvas = texture.image as HTMLCanvasElement;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(38, 34, 27, 0.92)";
    context.font = "28px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    context.textBaseline = "top";

    const left = 46;
    const top = 54;
    const lineHeight = 38;
    const maxWidth = canvas.width - left * 2;
    const lines: string[] = [];

    (text || "").split("\n").forEach((paragraph) => {
      const words = paragraph.split(/(\s+)/);
      let line = "";

      words.forEach((word) => {
        const nextLine = `${line}${word}`;
        if (context.measureText(nextLine).width > maxWidth && line.trim()) {
          lines.push(line.trimEnd());
          line = word.trimStart();
        } else {
          line = nextLine;
        }
      });

      lines.push(line.trimEnd());
    });

    lines.slice(0, 12).forEach((nextLine, index) => {
      context.fillText(nextLine, left, top + index * lineHeight);
    });

    texture.needsUpdate = true;
  }, [text, texture]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

function Typewriter({
  paperText,
  activeKey,
  isWriting,
  isLaunching,
}: {
  paperText: string;
  activeKey: KeyPress | null;
  isWriting: boolean;
  isLaunching: boolean;
}) {
  const carriage = useRef<Group>(null);
  const carriageAdvance = Math.min(paperText.length * 0.01, 0.88);

  useFrame(() => {
    if (!carriage.current) return;
    carriage.current.position.x += (carriageAdvance - carriage.current.position.x) * 0.12;
  });

  return (
    <group position={TYPEWRITER_POSITION.toArray()} rotation={[0, 0, 0]}>
      <ImportedTypewriterShell activeKey={activeKey} isWriting={isWriting} />
      <TypeStrikeArm activeKey={activeKey} />
      <group ref={carriage} position={[0, 0.72, -0.38]}>
        {!isLaunching ? (
          <>
            <mesh position={[-0.02, 0.7, -0.04]} rotation={[-0.15, 0, 0]} castShadow>
              <planeGeometry args={[1.62, 1.14]} />
              <meshStandardMaterial color="#e2d2b3" roughness={0.82} metalness={0.02} />
            </mesh>
            <PaperTextTexture
              text={paperText}
              width={1.38}
              height={0.98}
              position={[-0.02, 0.72, -0.034]}
              rotation={[-0.15, 0, 0]}
            />
          </>
        ) : null}
      </group>
    </group>
  );
}

function TypeStrikeArm({ activeKey }: { activeKey: KeyPress | null }) {
  const groupRef = useRef<Group>(null);
  const lastStrikeRef = useRef(0);
  const targetXRef = useRef(0);

  useEffect(() => {
    if (!activeKey || activeKey.key === "BACKSPACE") {
      return;
    }

    lastStrikeRef.current = activeKey.stamp;
    targetXRef.current = (((activeKey.key.charCodeAt(0) || 0) % 9) - 4) * 0.032;
  }, [activeKey]);

  useFrame(() => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    const age = performance.now() - lastStrikeRef.current;
    const progress = Math.max(0, Math.min(1, age / 170));
    const strike = progress < 1 ? Math.sin(progress * Math.PI) : 0;

    group.visible = strike > 0.02;
    group.position.x += (targetXRef.current - group.position.x) * 0.4;
    group.rotation.x = 0.98 - strike * 1.22;
    group.rotation.z = strike * 0.018;
  });

  return (
    <group ref={groupRef} position={[0, 0.12, 0.06]} rotation={[0.98, 0, 0]} visible={false}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.01, 0.014, 1.02, 8]} />
        <meshStandardMaterial color="#c7bda8" roughness={0.42} metalness={0.78} />
      </mesh>
      <mesh position={[0, 0.98, 0.012]} castShadow>
        <boxGeometry args={[0.14, 0.055, 0.022]} />
        <meshStandardMaterial color="#e7dbc8" roughness={0.36} metalness={0.54} />
      </mesh>
      <mesh position={[0, 1.06, 0.016]}>
        <sphereGeometry args={[0.035, 14, 14]} />
        <meshBasicMaterial color="#f5ead4" transparent opacity={0.38} />
      </mesh>
    </group>
  );
}

function ImportedTypewriterShell({
  activeKey,
  isWriting,
}: {
  activeKey: KeyPress | null;
  isWriting: boolean;
}) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(TYPEWRITER_MODEL_PATH);
  const model = useMemo(() => scene.clone(true) as Object3D, [scene]);
  const strikePulse = activeKey ? Math.max(0, 1 - (performance.now() - activeKey.stamp) / 180) : 0;

  useEffect(() => {
    model.traverse((object) => {
      object.castShadow = true;
      object.receiveShadow = true;
    });
  }, [model]);

  useFrame((_, delta) => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    const targetY = isWriting ? -0.74 : -0.72;
    const targetZ = isWriting ? 0.02 : 0.04;
    group.position.y += (targetY - group.position.y) * Math.min(1, delta * 5);
    group.position.z += (targetZ - group.position.z) * Math.min(1, delta * 5);
    group.rotation.x = -0.04 - strikePulse * 0.004;
  });

  return (
    <group ref={groupRef} position={[0, -0.72, 0.04]} rotation={[-0.04, 0, 0]} scale={4.85}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(TYPEWRITER_MODEL_PATH);

function Keyboard({ activeKey }: { activeKey: KeyPress | null }) {
  const keys = useMemo(() => {
    const allKeys: Array<{ key: string; x: number; y: number; row: number }> = [];
    KEY_ROWS.forEach((row, rowIndex) => {
      const rowOffset = rowIndex * 0.12;
      const startX = -(row.length - 1) * 0.122 + rowOffset;
      row.split("").forEach((key, column) => {
        allKeys.push({
          key,
          x: startX + column * 0.244,
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
      <mesh position={[0.08, -0.03, -0.055]} castShadow receiveShadow>
        <boxGeometry args={[3.18, 1.22, 0.075]} />
        <meshStandardMaterial color="#2a251d" roughness={0.56} metalness={0.44} />
      </mesh>
      <mesh position={[0.08, 0.5, -0.005]} castShadow>
        <boxGeometry args={[2.72, 0.08, 0.055]} />
        <meshStandardMaterial color="#120f0b" roughness={0.46} metalness={0.58} />
      </mesh>
      <mesh position={[0.08, -0.03, -0.01]}>
        <boxGeometry args={[2.96, 1.0, 0.022]} />
        <meshStandardMaterial color="#3b3123" roughness={0.64} metalness={0.22} />
      </mesh>
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
  const ref = useRef<Group>(null);
  const isActive = activeKey?.key === item.key;
  const target = isActive ? -0.115 : 0;

  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.z += (target - ref.current.position.z) * 0.5;
  });

  return (
    <group position={[item.x, item.y, 0]}>
      <mesh position={[0, 0, -0.055]} castShadow>
        <cylinderGeometry args={[item.key === "SPACE" ? 0.24 : 0.055, item.key === "SPACE" ? 0.22 : 0.048, 0.09, 18]} />
        <meshStandardMaterial color="#201a13" roughness={0.48} metalness={0.62} />
      </mesh>
      <group ref={ref}>
        <mesh position={[0, 0, -0.072]} castShadow>
          <cylinderGeometry args={[item.key === "SPACE" ? 0.055 : 0.024, item.key === "SPACE" ? 0.048 : 0.02, 0.16, 14]} />
          <meshStandardMaterial color="#100e0b" roughness={0.42} metalness={0.74} />
        </mesh>
        <mesh castShadow>
          <cylinderGeometry args={[item.key === "SPACE" ? 0.31 : 0.098, item.key === "SPACE" ? 0.285 : 0.084, 0.075, 30]} />
          <meshStandardMaterial
            color={isActive ? "#d8ba81" : "#6a583c"}
            roughness={0.5}
            metalness={0.26}
          />
        </mesh>
        <Html
          transform
          position={[0, 0, 0.078]}
          distanceFactor={5.2}
          className={styles.keyLabel}
          center
        >
          <span className={item.key === "SPACE" ? styles.spaceKeyLabel : ""}>
            {item.key === "SPACE" ? "SPACE" : item.key}
          </span>
        </Html>
      </group>
    </group>
  );
}

function TypeBars({ activeKey }: { activeKey: KeyPress | null }) {
  const bars = useMemo(
    () =>
      "QWERTYUIOPÅASDFGHJKLÄÖZXCVBNM".split("").map((key, index, array) => ({
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
        <cylinderGeometry args={[0.011, 0.011, 0.9, 8]} />
        <meshStandardMaterial color={active ? "#b59661" : "#252521"} roughness={0.44} metalness={0.9} />
      </mesh>
      <mesh position={[0, 0.1, -0.78]} castShadow>
        <boxGeometry args={[0.08, 0.06, 0.015]} />
        <meshStandardMaterial color={active ? "#c7a160" : "#090a0a"} roughness={0.4} metalness={0.85} />
      </mesh>
    </group>
  );
}

export default function WorkspacePage() {
  const workspaceRef = useRef<HTMLElement>(null);
  const isDragging = useRef(false);
  const playCue = useAudioBank();
  const [hasMounted, setHasMounted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [dragRotation, setDragRotation] = useState<DragRotation>({ x: 0, y: 0 });
  const [isWriting, setIsWriting] = useState(false);
  const [paperText, setPaperText] = useState("");
  const [activeKey, setActiveKey] = useState<KeyPress | null>(null);
  const [launchedVisions, setLaunchedVisions] = useState<VisionParticle[]>([]);
  const [visionStars, setVisionStars] = useState<VisionStar[]>([]);
  const [selectedVision, setSelectedVision] = useState<VisionStar | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadVisions = async () => {
      const response = await fetch("/api/visions", { cache: "no-store" }).catch(() => null);

      if (!response?.ok) {
        return;
      }

      const data = (await response.json().catch(() => null)) as { notes?: VisionStar[] } | null;

      if (!cancelled && Array.isArray(data?.notes)) {
        setVisionStars(data.notes);
      }
    };

    void loadVisions();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const launchIdea = useCallback(() => {
    const text = paperText.trim();
    if (!text) return;

    playCue("pull");
    playCue("bell", true);

    const seed = Date.now();
    const id = `vision-${seed}`;
    const target: [number, number, number] = [
      -2.4 + (seed % 7) * 0.82,
      3.2 + (seed % 5) * 0.48,
      -12 - (seed % 9) * 1.15,
    ];

    setLaunchedVisions((current) => [
      ...current,
      { id, text, target, createdAt: performance.now() },
    ]);
    void fetch("/api/visions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, text, position: target }),
    }).catch(() => undefined);
    window.setTimeout(() => setPaperText(""), 260);
  }, [paperText, playCue]);

  const settleVision = (vision: VisionParticle) => {
    setLaunchedVisions((current) => current.filter((item) => item.id !== vision.id));
    setVisionStars((current) => [
      ...current,
      { id: vision.id, text: vision.text, position: vision.target, createdAt: new Date().toISOString() },
    ]);
  };

  useEffect(() => {
    if (!isWriting) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = normalizeKey(event.key);
      if (!key) return;

      event.preventDefault();

      if (key === "ENTER") {
        playCue("pull");
        setPaperText((current) => {
          if (current.length >= PAPER_LIMIT || current.endsWith("\n\n")) return current;
          return `${current}\n`;
        });
        return;
      }

      setActiveKey({ key, stamp: performance.now() });

      if (key === "BACKSPACE") {
        playCue("backspace", true);
        setPaperText((current) => current.slice(0, -1));
        return;
      }

      const character = key === "SPACE" ? " " : event.key.length === 1 ? event.key : "";
      if (!character) return;

      playCue("key", true);
      setPaperText((current) => {
        if (current.length >= PAPER_LIMIT) return current;
        return `${current}${character}`;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isWriting, launchIdea, paperText.length, playCue]);

  useEffect(() => {
    if (!activeKey) return;
    const timeout = window.setTimeout(() => setActiveKey(null), 120);
    return () => window.clearTimeout(timeout);
  }, [activeKey]);

  return (
    <>
      <Header />
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
        {hasMounted ? (
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
        ) : (
          <div className={styles.sceneFallback} />
        )}
        <div className={`${styles.interfaceLayer} ${isWriting ? styles.interfaceLayerWriting : ""}`}>
          <div className={styles.visionHeader}>
            <span>Bonus layer</span>
            <strong>Vision room</strong>
          </div>
          <div className={styles.statusBlock}>
            <span>Draft instrument</span>
            <strong>Writing desk</strong>
            <p>
              {isWriting
                ? "Type on your keyboard. Send turns the page into a temporary star."
                : "Scroll through the dark room. The desk wakes up when you arrive."}
            </p>
          </div>
          <button
            type="button"
            className={`${styles.writeButton} ${isWriting ? styles.writeButtonActive : ""}`}
            onClick={launchIdea}
            disabled={!isWriting || !paperText.trim()}
          >
            Send
          </button>
          <div className={styles.zoneReadout}>
            <span>{Math.round(scrollProgress * 100).toString().padStart(2, "0")} / approach</span>
            <span>{isWriting ? "Writing mode" : "Scroll forward"}</span>
            <span>{visionStars.length} sent notes</span>
          </div>
          {selectedVision ? (
            <div className={styles.visionCard}>
              <span>Dream fragment</span>
              <p>{selectedVision.text}</p>
              <button type="button" onClick={() => setSelectedVision(null)}>
                Close
              </button>
            </div>
          ) : null}
        </div>
      </div>
      </section>
    </>
  );
}
