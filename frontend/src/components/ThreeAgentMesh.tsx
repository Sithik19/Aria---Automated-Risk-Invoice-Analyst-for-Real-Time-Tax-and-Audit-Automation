"use client";

import React, { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Html } from "@react-three/drei";
import * as THREE from "three";

interface ThreeAgentMeshProps {
  currentStep: string; // 'idle' | 'supervisor' | 'worker' | 'reasoner' | 'paused_hitl' | 'approved' | 'rejected' | 'completed'
  selectedAgent: string | null;
  onSelectAgent: (agentId: string) => void;
  telemetryLogs?: any[];
}

interface AgentNodeProps {
  id: string;
  name: string;
  role: string;
  position: [number, number, number];
  color: string;
  glowColor: string;
  isActive: boolean;
  isPaused: boolean;
  isApproved: boolean;
  onSelect: () => void;
  latency?: number;
}

function AgentNode({
  id,
  name,
  role,
  position,
  color,
  glowColor,
  isActive,
  isPaused,
  isApproved,
  onSelect,
  latency = 14.5
}: AgentNodeProps) {
  const meshRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Rotation speed increases when actively executing
      const speedMultiplier = isActive ? 2.5 : 0.8;
      meshRef.current.rotation.y += delta * 0.4 * speedMultiplier;
      meshRef.current.rotation.x += delta * 0.2 * speedMultiplier;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.6 * (isActive ? 3 : 1);
    }
    if (coreRef.current) {
      // Pulse scale
      const t = state.clock.getElapsedTime();
      const scale = isActive ? 1 + Math.sin(t * 6) * 0.12 : 1 + Math.sin(t * 2) * 0.04;
      coreRef.current.scale.set(scale, scale, scale);
    }
  });

  const nodeColor = isApproved ? "#10b981" : isPaused ? "#f59e0b" : color;

  return (
    <group position={position} onClick={onSelect}>
      <Float speed={1.8} rotationIntensity={0.4} floatIntensity={0.5}>
        <group ref={meshRef}>
          {/* Outer Wireframe Cage */}
          <mesh
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(true);
            }}
            onPointerOut={() => setHovered(false)}
          >
            <icosahedronGeometry args={[0.9, 1]} />
            <meshStandardMaterial
              color={nodeColor}
              wireframe
              emissive={nodeColor}
              emissiveIntensity={isActive ? 1.2 : hovered ? 0.8 : 0.4}
              roughness={0.2}
              metalness={0.9}
            />
          </mesh>

          {/* Inner Glowing Core */}
          <mesh ref={coreRef}>
            <sphereGeometry args={[0.5, 32, 32]} />
            <meshStandardMaterial
              color={nodeColor}
              emissive={nodeColor}
              emissiveIntensity={isActive ? 2.0 : isPaused ? 1.5 : 0.7}
              roughness={0.1}
              metalness={0.8}
            />
          </mesh>

          {/* Orbiting Ring */}
          <mesh ref={ringRef} rotation={[Math.PI / 3, 0, 0]}>
            <torusGeometry args={[1.2, 0.025, 16, 64]} />
            <meshStandardMaterial
              color={glowColor}
              emissive={glowColor}
              emissiveIntensity={isActive ? 1.5 : 0.4}
              transparent
              opacity={0.7}
            />
          </mesh>
        </group>

        {/* 3D Floating HUD / Label */}
        <Html distanceFactor={14} position={[0, -1.35, 0]} center sprite>
          <div
            className={`pointer-events-auto cursor-pointer rounded-lg px-2.5 py-1.5 transition-all duration-200 text-center whitespace-nowrap backdrop-blur-md border select-none ${
              isActive
                ? "bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-105"
                : isPaused
                ? "bg-amber-950/90 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                : hovered
                ? "bg-slate-900/90 border-slate-400 text-white scale-105"
                : "bg-slate-900/80 border-slate-700/60 text-slate-300"
            }`}
          >
            <div className="flex items-center gap-1.5 justify-center">
              <span
                className={`h-2 w-2 rounded-full ${
                  isActive
                    ? "bg-cyan-400 animate-ping"
                    : isPaused
                    ? "bg-amber-400 animate-pulse"
                    : isApproved
                    ? "bg-emerald-400"
                    : "bg-slate-500"
                }`}
              />
              <span className="text-[11px] font-semibold tracking-wide uppercase font-mono">{name}</span>
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">{role}</div>
            {hovered && (
              <div className="mt-1 pt-1 border-t border-slate-700 text-[8px] text-cyan-300 font-mono">
                Latency: {latency}ms | Status: {isActive ? "EXECUTING" : isPaused ? "PAUSED_HITL" : "STANDBY"}
              </div>
            )}
          </div>
        </Html>
      </Float>
    </group>
  );
}

// Glowing Energy Conduit connecting two nodes with animated particle flow
function DataBeam({
  start,
  end,
  active,
  color = "#00e5ff"
}: {
  start: [number, number, number];
  end: [number, number, number];
  active: boolean;
  color?: string;
}) {
  const particleRef = useRef<THREE.Mesh>(null);
  
  const startV = useMemo(() => new THREE.Vector3(...start), [start]);
  const endV = useMemo(() => new THREE.Vector3(...end), [end]);
  const midV = useMemo(() => {
    return new THREE.Vector3()
      .addVectors(startV, endV)
      .multiplyScalar(0.5)
      .add(new THREE.Vector3(0, 0.4, 0));
  }, [startV, endV]);

  const curve = useMemo(() => {
    return new THREE.QuadraticBezierCurve3(startV, midV, endV);
  }, [startV, midV, endV]);

  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 32, 0.035, 8, false);
  }, [curve]);

  useFrame((state) => {
    if (particleRef.current && active) {
      const t = (state.clock.getElapsedTime() * 0.8) % 1;
      const pos = curve.getPointAt(t);
      particleRef.current.position.copy(pos);
    }
  });

  return (
    <group>
      {/* Base Translucent Conduit */}
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          color={active ? color : "#334155"}
          emissive={active ? color : "#1e293b"}
          emissiveIntensity={active ? 0.8 : 0.15}
          transparent
          opacity={active ? 0.6 : 0.25}
          roughness={0.3}
        />
      </mesh>

      {/* Traveling Energy Pulse Packet */}
      {active && (
        <mesh ref={particleRef}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
    </group>
  );
}

// Center Statutory Audit Beacon (illuminates when paused for CA)
function StatutoryHITLBeacon({ isPaused, isApproved }: { isPaused: boolean; isApproved: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  if (!isPaused && !isApproved) return null;

  const beaconColor = isApproved ? "#10b981" : "#f59e0b";

  return (
    <group position={[0, -0.2, 0]}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial
          color={beaconColor}
          emissive={beaconColor}
          emissiveIntensity={isPaused ? 2.5 : 1.2}
          wireframe
        />
      </mesh>
      <Html distanceFactor={12} position={[0, 0.7, 0]} center sprite>
        <div
          className={`px-2 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase border select-none ${
            isApproved
              ? "bg-emerald-950/90 text-emerald-300 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              : "bg-amber-950/90 text-amber-300 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse"
          }`}
        >
          {isApproved ? "✓ UDIN Certified" : "⏸ Sec 141 CA Lock"}
        </div>
      </Html>
    </group>
  );
}

export default function ThreeAgentMesh({
  currentStep,
  selectedAgent,
  onSelectAgent,
  telemetryLogs = []
}: ThreeAgentMeshProps) {
  const isSupervisorActive = currentStep === "supervisor";
  const isWorkerActive = currentStep === "worker";
  const isReasonerActive = currentStep === "reasoner";
  const isPaused = currentStep === "paused_hitl";
  const isApproved = currentStep === "approved" || currentStep === "completed";

  const supervisorPos: [number, number, number] = [0, 1.6, 0];
  const workerPos: [number, number, number] = [-2.6, -1.0, 0];
  const reasonerPos: [number, number, number] = [2.6, -1.0, 0];

  return (
    <div className="relative w-full h-[380px] rounded-xl overflow-hidden glass-panel border border-cyan-500/20">
      {/* HUD Overlay Stats Header */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 backdrop-blur-md">
          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-mono font-semibold tracking-wider text-cyan-300 uppercase">
            LangGraph Multi-Agent Mesh
          </span>
        </div>
        <div className="px-2.5 py-1 rounded-md bg-slate-900/60 border border-slate-800 text-[10px] font-mono text-slate-400">
          State: <span className="text-slate-200 font-bold uppercase">{currentStep}</span>
        </div>
      </div>

      {/* Orbit Hint */}
      <div className="absolute bottom-2 right-3 z-10 text-[9px] font-mono text-slate-500 pointer-events-none">
        Rotate: Left-Click + Drag | Zoom: Scroll
      </div>

      <Canvas
        camera={{ position: [0, 0.2, 5.8], fov: 48 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.2} color="#00e5ff" />
        <pointLight position={[-10, -10, -10]} intensity={0.8} color="#a855f7" />

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={3.5}
          maxDistance={8.5}
          maxPolarAngle={Math.PI / 1.7}
          minPolarAngle={Math.PI / 3.5}
        />

        {/* Dynamic Energy Conduits */}
        <DataBeam
          start={supervisorPos}
          end={workerPos}
          active={isSupervisorActive || isWorkerActive}
          color="#00e5ff"
        />
        <DataBeam
          start={workerPos}
          end={reasonerPos}
          active={isWorkerActive || isReasonerActive}
          color="#10b981"
        />
        <DataBeam
          start={reasonerPos}
          end={supervisorPos}
          active={isReasonerActive || isPaused || isApproved}
          color="#a855f7"
        />

        {/* Central Statutory Beacon */}
        <StatutoryHITLBeacon isPaused={isPaused} isApproved={isApproved} />

        {/* 3 Glowing Agent Nodes */}
        <AgentNode
          id="supervisor"
          name="Supervisor Agent"
          role="Ingestion & Presidio PII Masking"
          position={supervisorPos}
          color="#00e5ff"
          glowColor="#38bdf8"
          isActive={isSupervisorActive}
          isPaused={isPaused}
          isApproved={isApproved}
          onSelect={() => onSelectAgent("supervisor")}
        />

        <AgentNode
          id="worker"
          name="Worker Agent"
          role="Quantitative SAP vs GSTR-2B"
          position={workerPos}
          color="#10b981"
          glowColor="#34d399"
          isActive={isWorkerActive}
          isPaused={isPaused}
          isApproved={isApproved}
          onSelect={() => onSelectAgent("worker")}
        />

        <AgentNode
          id="reasoner"
          name="Reasoning Agent"
          role="Qdrant RAG & Legal Decisions"
          position={reasonerPos}
          color="#a855f7"
          glowColor="#c084fc"
          isActive={isReasonerActive}
          isPaused={isPaused}
          isApproved={isApproved}
          onSelect={() => onSelectAgent("reasoner")}
        />
      </Canvas>
    </div>
  );
}
