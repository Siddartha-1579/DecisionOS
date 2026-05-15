import { motion } from 'framer-motion';
import { useState } from 'react';

type CoreState = 'Stable' | 'Elevated' | 'Critical' | 'Benchmark';

interface DecisionCoreProps {
  dis: number;
  domain: string;
  riskState: string;
  agent: string;
  isBenchmarking: boolean;
  riskScore: number;
}

export const DecisionCore = ({ dis, domain, riskState, agent, isBenchmarking, riskScore }: DecisionCoreProps) => {
  const [isHovered, setIsHovered] = useState(false);

  let coreState: CoreState = 'Stable';
  if (isBenchmarking) coreState = 'Benchmark';
  else if (riskScore > 60) coreState = 'Critical';
  else if (riskScore > 30) coreState = 'Elevated';

  const stateColors = {
    Stable: 'rgba(56, 189, 248, 0.8)', // soft blue
    Elevated: 'rgba(251, 191, 36, 0.8)', // amber
    Critical: 'rgba(248, 113, 113, 0.9)', // red
    Benchmark: 'rgba(167, 139, 250, 0.8)' // violet/cyan mix
  };

  const stateGlows = {
    Stable: '0 0 40px rgba(56, 189, 248, 0.4)',
    Elevated: '0 0 50px rgba(251, 191, 36, 0.5)',
    Critical: '0 0 60px rgba(248, 113, 113, 0.6)',
    Benchmark: '0 0 50px rgba(167, 139, 250, 0.5)'
  };

  const ringAnimation = isBenchmarking ? 
    { animate: { rotate: 360 } as any, transition: { repeat: Infinity, duration: 20, ease: "linear" as const } } : 
    { animate: { rotate: 360 } as any, transition: { repeat: Infinity, duration: 15, ease: "linear" as const } };

  const getRiskTerminology = (d: string) => {
    if (d === 'Healthcare') return 'Critical Patient Risk';
    if (d === 'Cybersecurity') return 'Threat Escalation';
    if (d === 'Finance') return 'Capital Exposure';
    if (d === 'Logistics') return 'Supply Chain Risk';
    return 'Operational Risk';
  };

  const getDomainIcon = (d: string) => {
    if (isBenchmarking) return 'memory';
    if (d === 'Healthcare') return 'medical_services';
    if (d === 'Cybersecurity') return 'security';
    if (d === 'Finance') return 'query_stats';
    if (d === 'Logistics') return 'local_shipping';
    return 'psychology';
  };

  return (
    <div 
      className="relative w-64 h-64 flex items-center justify-center mx-auto my-8"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Particle Field */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/40"
            initial={{ opacity: 0, scale: 0, x: 128, y: 128 }}
            animate={{ 
              opacity: [0, 1, 0], 
              scale: [0, 1.5, 0],
              x: 128 + Math.cos(i * 45) * 80,
              y: 128 + Math.sin(i * 45) * 80
            }}
            transition={{
              repeat: Infinity,
              duration: 2 + (i % 2),
              delay: i * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Outer Rings */}
      <motion.div
        className="absolute w-56 h-56 rounded-full border border-dashed opacity-30 pointer-events-none"
        style={{ borderColor: stateColors[coreState] }}
        animate={ringAnimation.animate}
        transition={ringAnimation.transition}
      />
      <motion.div
        className="absolute w-44 h-44 rounded-full border opacity-20 pointer-events-none"
        style={{ borderColor: stateColors[coreState] }}
        animate={{ ...ringAnimation.animate, rotate: -360 }}
        transition={ringAnimation.transition}
      />

      {/* Energy Waves */}
      {coreState === 'Critical' && (
        <motion.div
          className="absolute rounded-full border pointer-events-none"
          style={{ borderColor: stateColors[coreState] }}
          initial={{ width: 80, height: 80, opacity: 0.8 }}
          animate={{ width: 250, height: 250, opacity: 0 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
        />
      )}

      {/* Central Orb */}
      <motion.div
        className="relative w-24 h-24 rounded-full flex items-center justify-center cursor-pointer z-10"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${stateColors[coreState]}, rgba(0,0,0,0.8))`,
          boxShadow: stateGlows[coreState]
        }}
        animate={{
          scale: coreState === 'Critical' ? [1, 1.05, 1] : [1, 1.02, 1],
        }}
        transition={{
          repeat: Infinity,
          duration: coreState === 'Critical' ? 0.8 : 2,
          ease: "easeInOut"
        }}
      >
        <span className="material-symbols-outlined text-white/80 text-4xl">
          {getDomainIcon(domain)}
        </span>
      </motion.div>

      {/* Hover Panel */}
      <motion.div
        className="absolute top-full mt-4 bg-surface-container/90 backdrop-blur-md border border-outline-variant/30 rounded-xl p-4 w-48 z-20 pointer-events-none shadow-glass"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : -10 }}
        transition={{ duration: 0.2 }}
      >
        <div className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">Decision Core</div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="opacity-70">Domain:</span>
            <span className="font-medium text-primary">{domain}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="opacity-70">DIS Score:</span>
            <span className="font-data-mono">{dis.toFixed(4)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="opacity-70">{getRiskTerminology(domain)}:</span>
            <span className="font-medium" style={{ color: stateColors[coreState] }}>{riskState}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="opacity-70">Agent:</span>
            <span className="font-medium">{agent}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
