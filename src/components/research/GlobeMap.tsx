"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { mesh } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import worldAtlas from "world-atlas/countries-110m.json";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Mission = "iss" | "hubble" | "jwst";

export interface GlobeSignal {
  id: string;
  lat: number;
  lng: number;
  category: string;
  title: string;
  intensity: number;
}

export interface GlobeMapProps {
  signals: GlobeSignal[];
  selectedId: string | null;
  onSignalClick: (id: string) => void;
  activeMission: Mission | null;
  onSatelliteClick: (mission: Mission) => void;
}

// ── Satellite definitions ─────────────────────────────────────────────────────

export const SATELLITES = [
  {
    id: "iss" as Mission,
    name: "ISS",
    fullName: "International Space Station",
    keyword: "international space station",
    radius: 1.08,
    inclination: 51.6,
    ascendingNode: 0,
    speed: 0.45,
    color: "#60a5fa",
  },
  {
    id: "hubble" as Mission,
    name: "Hubble",
    fullName: "Hubble Space Telescope",
    keyword: "hubble space telescope",
    radius: 1.13,
    inclination: 28.5,
    ascendingNode: Math.PI * 0.75,
    speed: 0.3,
    color: "#fbbf24",
  },
  {
    id: "jwst" as Mission,
    name: "JWST",
    fullName: "James Webb Space Telescope",
    keyword: "james webb space telescope",
    radius: 1.48,
    inclination: 5.0,
    ascendingNode: Math.PI * 1.4,
    speed: 0.13,
    color: "#a78bfa",
  },
] as const;

// ── Category colors ───────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<string, string> = {
  AI: "#c4a36f",
  "Spatial / XR": "#b79be0",
  Robotics: "#8fb6a2",
  Quantum: "#88bfe0",
  Space: "#9aa8c8",
  Energy: "#d0ad70",
  Materials: "#c7bca7",
  Nano: "#78c4a0",
};

// ── Geometry helpers ──────────────────────────────────────────────────────────

// Standard spherical coordinate conversion (East = positive lng, North = positive lat)
function latLngToVec3(lat: number, lng: number, r = 1.001): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  );
}

type WorldObjects = { countries: GeometryCollection };
const topo = worldAtlas as unknown as Topology<WorldObjects>;

// Build all country-border LineSegments into one BufferGeometry (batched for perf)
function buildBorderGeometry(): THREE.BufferGeometry {
  const borders = mesh(topo, topo.objects.countries, (a, b) => a !== b) as unknown as {
    coordinates: Array<Array<[number, number]>>;
  };
  const pos: number[] = [];
  for (const line of borders.coordinates) {
    for (let i = 0; i < line.length - 1; i++) {
      const [lon1, lat1] = line[i];
      const [lon2, lat2] = line[i + 1];
      // Skip segments that wrap across the antimeridian
      if (Math.abs(lon1 - lon2) > 170) continue;
      const a = latLngToVec3(lat1, lon1, 1.002);
      const b = latLngToVec3(lat2, lon2, 1.002);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return geo;
}

// Build orbit ring as a closed line matching the satellite position formula exactly
function buildOrbitGeometry(radius: number, inclination: number): THREE.BufferGeometry {
  const N   = 128;
  const inc = inclination * (Math.PI / 180);
  const pts: THREE.Vector3[] = [];
  for (let k = 0; k <= N; k++) {
    const t = (k / N) * Math.PI * 2;
    pts.push(new THREE.Vector3(
      Math.cos(t) * radius,
      Math.sin(t) * Math.sin(inc) * radius,
      Math.sin(t) * Math.cos(inc) * radius,
    ));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

// ── Scene sub-components ──────────────────────────────────────────────────────

function Earth() {
  return (
    <>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial
          color="#0a1628"
          emissive="#05101f"
          emissiveIntensity={0.5}
          shininess={6}
        />
      </mesh>
      {/* Thin atmosphere glow visible at the limb */}
      <mesh scale={1.02}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#1a4870" transparent opacity={0.07} side={THREE.BackSide} />
      </mesh>
    </>
  );
}

function CountryBorders() {
  const geo = useMemo(() => buildBorderGeometry(), []);
  const mat = useMemo(
    () => new THREE.LineBasicMaterial({ color: "#2a5a40", transparent: true, opacity: 0.5 }),
    [],
  );
  const obj = useMemo(() => new THREE.LineSegments(geo, mat), [geo, mat]);

  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  return <primitive object={obj} />;
}

function SignalDot({
  signal, selected, onClick,
}: {
  signal: GlobeSignal;
  selected: boolean;
  onClick: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const color = CATEGORY_COLOR[signal.category] ?? "#c0c8d0";
  const pos   = useMemo(() => latLngToVec3(signal.lat, signal.lng, 1.017), [signal.lat, signal.lng]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.scale.setScalar(
      selected ? 1 + 0.28 * Math.sin(clock.elapsedTime * 4) : 1,
    );
  });

  return (
    <mesh
      ref={ref}
      position={pos}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <sphereGeometry args={[selected ? 0.022 : 0.013, 8, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function SatelliteOrbit({
  sat, active, onClick,
}: {
  sat: typeof SATELLITES[number];
  active: boolean;
  onClick: () => void;
}) {
  const satRef  = useRef<THREE.Mesh>(null);
  const angle   = useRef(Math.random() * Math.PI * 2);
  const inc     = sat.inclination * (Math.PI / 180);

  const orbitGeo  = useMemo(() => buildOrbitGeometry(sat.radius, sat.inclination), [sat.radius, sat.inclination]);
  const orbitMat  = useMemo(
    () => new THREE.LineBasicMaterial({ color: sat.color, transparent: true, opacity: active ? 0.4 : 0.1 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sat.color, active],
  );
  const orbitLine = useMemo(() => new THREE.Line(orbitGeo, orbitMat), [orbitGeo, orbitMat]);

  useEffect(() => () => { orbitGeo.dispose(); orbitMat.dispose(); }, [orbitGeo, orbitMat]);

  useFrame((_, delta) => {
    angle.current += delta * sat.speed;
    if (satRef.current) {
      const a = angle.current;
      satRef.current.position.set(
        Math.cos(a) * sat.radius,
        Math.sin(a) * Math.sin(inc) * sat.radius,
        Math.sin(a) * Math.cos(inc) * sat.radius,
      );
    }
  });

  return (
    <group rotation={[0, sat.ascendingNode, 0]}>
      <primitive object={orbitLine} />
      <mesh
        ref={satRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <octahedronGeometry args={[active ? 0.036 : 0.025, 0]} />
        <meshBasicMaterial color={sat.color} />
      </mesh>
    </group>
  );
}

function GlobeScene(props: GlobeMapProps) {
  const { signals, selectedId, onSignalClick, activeMission, onSatelliteClick } = props;
  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight position={[5, 3, 4]} intensity={2} color="#fff6e0" />
      <Earth />
      <CountryBorders />

      {signals.map((sig) => (
        <SignalDot
          key={sig.id}
          signal={sig}
          selected={sig.id === selectedId}
          onClick={() => onSignalClick(sig.id)}
        />
      ))}

      {SATELLITES.map((sat) => (
        <SatelliteOrbit
          key={sat.id}
          sat={sat}
          active={activeMission === sat.id}
          onClick={() => onSatelliteClick(sat.id)}
        />
      ))}

      <OrbitControls
        enablePan={false}
        minDistance={1.6}
        maxDistance={4.5}
        rotateSpeed={0.5}
        zoomSpeed={0.6}
        makeDefault
      />
    </>
  );
}

// ── Public component (Canvas wrapper) ─────────────────────────────────────────

export default function GlobeMap(props: GlobeMapProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.25, 2.85], fov: 44 }}
      gl={{ antialias: true }}
      style={{ width: "100%", height: "100%", background: "#020912" }}
    >
      <GlobeScene {...props} />
    </Canvas>
  );
}
