import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, memo } from 'react';

export const BenchmarkOverlay = memo(({
  isBenchmarking,
  benchmarkComplete,
  benchmarkProgress,
  currentAgent,
  timeElapsed,
  seed,
  onClose,
  leaderboard
}: any) => {
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (benchmarkComplete && leaderboard.length > 0) {
      setTimeout(() => setShowResults(true), 500);
    } else {
      setShowResults(false);
    }
  }, [benchmarkComplete, leaderboard]);

  if (!isBenchmarking && !showResults && !benchmarkComplete) return null;

  // Active domain and risk state (mock live updates for immersion)
  const [liveMetrics, setLiveMetrics] = useState({ domain: 'Logistics', risk: 'Normal', dis: '0.000' });
  
  useEffect(() => {
    if (isBenchmarking) {
      const interval = setInterval(() => {
        const domains = ['Logistics', 'Finance', 'Cybersecurity', 'Healthcare', 'Operations'];
        const risks = ['Normal', 'Elevated', 'Normal', 'High', 'Normal'];
        setLiveMetrics({
          domain: domains[Math.floor(Math.random() * domains.length)],
          risk: risks[Math.floor(Math.random() * risks.length)],
          dis: (Math.random() * 0.9 + 0.1).toFixed(3)
        });
      }, 600);
      return () => clearInterval(interval);
    }
  }, [isBenchmarking]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-space-900/90 backdrop-blur-3xl flex items-center justify-center overflow-hidden font-['Space_Grotesk']"
    >
      {/* Animated Scan Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(56, 189, 248, 0.1) 51%, transparent 51%)', backgroundSize: '100% 4px' }}></div>
      <motion.div 
        animate={{ y: ['-100%', '200%'] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
        className="absolute top-0 left-0 w-full h-[20vh] bg-gradient-to-b from-transparent via-primary/10 to-transparent pointer-events-none mix-blend-screen"
      ></motion.div>

      <div className="relative z-10 w-full max-w-6xl px-8 flex flex-col items-center">
        
        {/* Integrity Badge */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute top-8 right-8 flex flex-col items-end"
        >
          <div className="bg-signal-green/10 border border-signal-green/30 px-4 py-2 rounded-full flex items-center gap-2 shadow-glow-cyan">
            <span className="material-symbols-outlined text-signal-green text-sm">verified</span>
            <span className="text-signal-green font-label-caps text-xs tracking-widest uppercase">Benchmark Integrity Verified</span>
          </div>
          <p className="text-on-surface-variant text-[10px] uppercase tracking-widest mt-2 opacity-70">
            Evaluating under identical environment conditions
          </p>
          <p className="text-primary font-data-mono text-[10px] mt-1">Seed: {seed}</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {isBenchmarking ? (
            <motion.div 
              key="benchmarking"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center w-full"
            >
              {/* Central Core */}
              <motion.div 
                animate={{ rotate: 360 } as any}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" as const }}
                className="relative w-64 h-64 flex items-center justify-center mb-12"
              >
                <div className="absolute inset-0 rounded-full border-t-4 border-secondary shadow-glow-violet opacity-80"></div>
                <div className="absolute inset-4 rounded-full border-b-4 border-primary shadow-glow-cyan opacity-60" style={{ animationDirection: 'reverse' }}></div>
                <div className="absolute inset-8 rounded-full border-l-2 border-tertiary shadow-glow-cyan opacity-40"></div>
                
                <motion.span 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="material-symbols-outlined text-6xl text-primary absolute"
                >
                  memory
                </motion.span>
              </motion.div>
              
              <h2 className="text-5xl font-display-lg text-on-surface mb-4 tracking-tight drop-shadow-lg">
                Evaluating AI Core
              </h2>
              <div className="flex items-center gap-4 mb-12">
                <span className="px-4 py-1 bg-primary/20 border border-primary/50 text-primary rounded font-label-caps tracking-widest uppercase shadow-glow-cyan animate-pulse">
                  {currentAgent?.replace('_', ' ')}
                </span>
                <span className="text-on-surface-variant">|</span>
                <span className="font-data-mono text-secondary">T+{timeElapsed}s</span>
              </div>
              
              <div className="w-full max-w-3xl bg-surface-container rounded-full h-2 mb-6 overflow-hidden border border-outline-variant/30 shadow-glass relative">
                <motion.div 
                  className="bg-gradient-to-r from-primary via-secondary to-primary h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${benchmarkProgress}%` }}
                  style={{ backgroundSize: '200% 100%' }}
                />
              </div>
              
              {/* Live Metric Updates */}
              <div className="grid grid-cols-3 gap-8 w-full max-w-3xl">
                <div className="bg-space-800/80 border border-outline-variant/20 p-4 rounded-xl text-center shadow-glass relative overflow-hidden">
                  <div className="absolute inset-0 bg-primary/5"></div>
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1 relative z-10">Active Domain</div>
                  <motion.div key={liveMetrics.domain} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-data-mono text-primary text-lg relative z-10">
                    {liveMetrics.domain}
                  </motion.div>
                </div>
                <div className="bg-space-800/80 border border-outline-variant/20 p-4 rounded-xl text-center shadow-glass relative overflow-hidden">
                  <div className={`absolute inset-0 ${liveMetrics.risk === 'Normal' ? 'bg-signal-green/5' : liveMetrics.risk === 'Elevated' ? 'bg-tertiary-container/5' : 'bg-error/10'}`}></div>
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1 relative z-10">Risk State</div>
                  <motion.div key={liveMetrics.risk} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`font-data-mono text-lg relative z-10 ${liveMetrics.risk === 'Normal' ? 'text-signal-green' : liveMetrics.risk === 'Elevated' ? 'text-tertiary-container' : 'text-error animate-pulse'}`}>
                    {liveMetrics.risk}
                  </motion.div>
                </div>
                <div className="bg-space-800/80 border border-outline-variant/20 p-4 rounded-xl text-center shadow-glass relative overflow-hidden">
                  <div className="absolute inset-0 bg-secondary/5"></div>
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1 relative z-10">Live Evaluator (DIS)</div>
                  <motion.div key={liveMetrics.dis} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-data-mono text-secondary text-lg relative z-10">
                    {liveMetrics.dis}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ) : showResults ? (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center w-full mt-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center border border-primary/50 shadow-glow-cyan-lg mb-6"
              >
                <span className="material-symbols-outlined text-4xl text-primary animate-pulse">emoji_events</span>
              </motion.div>
              
              <h2 className="text-4xl font-display-lg text-on-surface mb-2">Benchmark Complete</h2>
              <p className="text-on-surface-variant font-label-caps uppercase tracking-widest mb-12">Top Performing Agent Revealed</p>
              
              {/* Glowing Comparison Pillars */}
              <div className="flex items-end justify-center gap-6 h-64 mb-12 w-full max-w-4xl border-b border-outline-variant/30 pb-2">
                {[...leaderboard].sort((a, b) => b.final_dis - a.final_dis).map((agent, i) => {
                  const isWinner = i === 0;
                  const height = Math.max(20, agent.final_dis * 100);
                  return (
                    <motion.div 
                      key={agent.agent_name}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: `${height}%`, opacity: 1 }}
                      transition={{ duration: 1.5, delay: i * 0.2, type: 'spring' }}
                      className={`relative w-32 rounded-t-xl border-t border-l border-r flex flex-col items-center justify-end pb-4 ${isWinner ? 'bg-primary/20 border-primary/50 shadow-glow-cyan-lg z-10' : 'bg-surface-container/50 border-outline-variant/30 opacity-70'}`}
                    >
                      <span className={`font-data-mono text-xl mb-1 ${isWinner ? 'text-primary font-bold' : 'text-on-surface'}`}>
                        {(agent.final_dis).toFixed(3)}
                      </span>
                      <span className={`font-label-caps text-[10px] uppercase tracking-widest text-center px-2 ${isWinner ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {agent.agent_name.replace('_', ' ')}
                      </span>
                      {isWinner && (
                        <motion.div 
                          className="absolute inset-0 bg-gradient-to-t from-transparent to-primary/40 rounded-t-xl"
                          animate={{ y: ['100%', '-100%'] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-8 py-3 bg-space-800 border border-outline-variant/50 rounded-lg text-on-surface font-label-caps uppercase tracking-widest hover:border-primary/50 hover:text-primary transition-colors shadow-glass flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">dashboard</span>
                Return to Dashboard
              </motion.button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});
