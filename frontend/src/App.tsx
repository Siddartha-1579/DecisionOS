import { useState, useEffect } from 'react';
import { api } from './lib/api';
import type { ActionPayload } from './lib/api';
import { motion, AnimatePresence } from 'framer-motion';

const generateExplainabilityFactors = (action: string, activeTask: any, prevState: any, result: any) => {
  let explanation = '';
  let urgencyImpact = 'Neutral';
  let riskImpact = 'Neutral';
  let resourceImpact = 'Neutral';
  let indicator: 'green' | 'yellow' | 'red' = 'yellow';

  const taskUrgency = activeTask?.urgency || 'Normal';
  const taskImportance = activeTask?.importance || 'Normal';
  const prevRisk = prevState?.risk_level || 'Normal';
  const newRisk = result.observation?.risk_level || 'Normal';
  const reward = result.reward || 0;

  if (action === 'prioritize_task') {
    if (taskUrgency === 'Critical' || taskUrgency === 'High') {
      explanation = `Prioritized due to ${taskUrgency} urgency and ${taskImportance} operational impact.`;
      urgencyImpact = 'Resolved High Urgency';
      indicator = reward > 0 ? 'green' : 'yellow';
    } else {
      explanation = `Prioritized standard task to maintain operational flow.`;
      urgencyImpact = 'Handled Standard Urgency';
      indicator = 'yellow';
    }
  } else if (action === 'allocate_resources') {
    explanation = `Resources allocated to ensure task completion.`;
    resourceImpact = 'High Resource Utilization';
    indicator = 'yellow';
    if (reward > 10) indicator = 'green';
    if (reward < 0) indicator = 'red';
  } else if (action === 'veto_task') {
    if (prevRisk === 'Elevated' || prevRisk === 'High') {
      explanation = `Escalated/Vetoed because risk exceeded safety threshold.`;
      riskImpact = 'Mitigated High Risk';
      indicator = 'green';
    } else {
      explanation = `Vetoed standard task; potential missed opportunity.`;
      riskImpact = 'Unnecessary Escalation';
      indicator = 'red';
    }
  } else if (action === 'step') {
    explanation = `Routine operational step executed.`;
    indicator = reward >= 0 ? 'green' : 'yellow';
  } else {
    explanation = result.info?.explanation || 'Action executed based on current state parameters.';
  }

  if (newRisk === 'High' && prevRisk !== 'High') riskImpact = 'Increased Risk Profile';
  if (newRisk === 'Normal' && prevRisk !== 'Normal') riskImpact = 'Stabilized Risk Profile';
  
  if (reward > 20 && indicator !== 'red') indicator = 'green';
  if (reward < -10) indicator = 'red';

  return { explanation, urgencyImpact, riskImpact, resourceImpact, indicator };
};

const generateFutureProjections = (state: any) => {
  if (!state || !state.observation) return { severity: 'Stable', projections: [] };
  
  const obs = state.observation;
  const tasks = obs?.active_tasks || [];
  const nextTask = tasks[0];
  
  const projections = [];
  let severityScore = 0;

  // 1. Risk Projection
  if (obs.risk_level === 'High' || obs.risk_level === 'Elevated') {
    severityScore += 2;
    if (nextTask?.urgency === 'Critical') {
      projections.push({
        id: 'risk',
        title: 'Risk Escalation Imminent',
        impact: 'negative',
        reasons: [
          `Current operational risk is ${obs.risk_level}`,
          `Critical task pending: "${nextTask.title}"`,
          `Combined risk of failure exceeds safe thresholds`
        ]
      });
      severityScore += 1;
    } else {
      projections.push({
        id: 'risk',
        title: 'Risk Profile Unstable',
        impact: 'negative',
        reasons: [
          `Current operational risk remains ${obs.risk_level}`,
          `Routine actions may trigger cascading failures`
        ]
      });
    }
  } else {
    projections.push({
      id: 'risk',
      title: 'Risk Profile Stable',
      impact: 'positive',
      reasons: [
        `Current risk is Normal`,
        `Recent decisions have mitigated operational threats`
      ]
    });
  }

  // 2. Task Delay / Backlog Impact
  if (tasks.length > 2) {
    if (obs.workforce < 1000) {
      projections.push({
        id: 'delay',
        title: 'Deadline Risk HIGH',
        impact: 'negative',
        reasons: [
          `${tasks.length} tasks bottlenecked in queue`,
          `Workforce capacity (${obs.workforce} U) is insufficient for parallel execution`,
          `Delay penalties likely on next cycle`
        ]
      });
      severityScore += 2;
    } else {
      projections.push({
        id: 'delay',
        title: 'Moderate Task Backlog',
        impact: 'neutral',
        reasons: [
          `${tasks.length} active tasks queued`,
          `Workforce is adequate, but prioritization is required`
        ]
      });
      severityScore += 1;
    }
  } else if (tasks.length > 0) {
    projections.push({
      id: 'delay',
      title: 'Optimal Task Throughput',
      impact: 'positive',
      reasons: [
        `Queue size is manageable (${tasks.length})`,
        `Sufficient capacity to process active tasks`
      ]
    });
  } else {
    projections.push({
      id: 'delay',
      title: 'Queue Cleared',
      impact: 'positive',
      reasons: [`No active tasks pending`]
    });
  }

  // 3. Resource / Budget Impact
  if (obs.budget < 2000000) {
    projections.push({
      id: 'budget',
      title: 'Budget Deficit Expected',
      impact: 'negative',
      reasons: [
        `Capital reserves dropping below optimal runway`,
        `Resource allocation efficiency at -10%`,
        `Future high-cost tasks may be vetoed automatically`
      ]
    });
    severityScore += 2;
  } else {
    projections.push({
      id: 'budget',
      title: 'Nominal Resource Burn Rate',
      impact: 'positive',
      reasons: [
        `Budget reserves healthy`,
        `Resource allocation efficiency maintained`
      ]
    });
  }

  let severity = 'Stable';
  if (severityScore >= 5) severity = 'Critical Escalation';
  else if (severityScore >= 3) severity = 'High Risk';
  else if (severityScore >= 1) severity = 'Moderate Concern';

  return { severity, projections };
};

const ProjectedConsequences = ({ state }: { state: any }) => {
  const { severity, projections } = generateFutureProjections(state);
  
  const getSeverityColor = (sev: string) => {
    if (sev === 'Critical Escalation') return 'text-error shadow-glow-red border-error';
    if (sev === 'High Risk') return 'text-alert-red border-alert-red';
    if (sev === 'Moderate Concern') return 'text-tertiary-container border-tertiary-container';
    return 'text-signal-green shadow-glow-cyan border-signal-green';
  };

  const getImpactColor = (impact: string) => {
    if (impact === 'positive') return 'text-signal-green border-signal-green/30';
    if (impact === 'negative') return 'text-error border-error/30';
    return 'text-tertiary-container border-tertiary-container/30';
  };

  const getImpactIcon = (impact: string) => {
    if (impact === 'positive') return 'trending_up';
    if (impact === 'negative') return 'trending_down';
    return 'trending_flat';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container/30 backdrop-blur-2xl border border-outline-variant/30 rounded-2xl p-lg shadow-glass relative overflow-hidden"
    >
      <div className="flex justify-between items-center mb-md border-b border-outline-variant/20 pb-4">
        <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">online_prediction</span>
          Projected Consequences
        </h3>
        <div className={`px-3 py-1 rounded-full border text-xs font-label-caps uppercase tracking-widest ${getSeverityColor(severity)} animate-pulse`}>
          {severity}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="wait">
          {projections.map((proj) => (
            <ProjectionItem key={proj.id} proj={proj} getImpactColor={getImpactColor} getImpactIcon={getImpactIcon} />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const ProjectionItem = ({ proj, getImpactColor, getImpactIcon }: any) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`bg-space-900/40 border rounded-xl p-4 transition-colors cursor-pointer hover:bg-space-900/60 ${getImpactColor(proj.impact)}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined">{getImpactIcon(proj.impact)}</span>
          <span className="font-body-md text-sm font-medium text-on-surface">{proj.title}</span>
        </div>
        <span className="material-symbols-outlined text-sm opacity-50">
          {expanded ? 'expand_less' : 'expand_more'}
        </span>
      </div>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3"
          >
            <div className="pt-3 border-t border-inherit">
              <span className="text-[10px] uppercase tracking-widest opacity-70 mb-2 block">Why this prediction?</span>
              <ul className="list-disc pl-4 space-y-1">
                {proj.reasons.map((reason: string, idx: number) => (
                  <li key={idx} className="text-xs text-on-surface-variant">{reason}</li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const TimelineItem = ({ item }: { item: any }) => {
  const [expanded, setExpanded] = useState(false);
  
  const getIndicatorColor = (indicator: string) => {
    if (indicator === 'green') return 'bg-signal-green shadow-[0_0_8px_rgba(52,211,153,0.8)] border-signal-green';
    if (indicator === 'yellow') return 'bg-tertiary-container shadow-[0_0_8px_rgba(255,177,59,0.8)] border-tertiary-container';
    if (indicator === 'red') return 'bg-alert-red shadow-glow-red border-alert-red';
    return 'bg-outline-variant border-outline-variant';
  };

  const getTextColor = (indicator: string) => {
    if (indicator === 'green') return 'text-signal-green';
    if (indicator === 'yellow') return 'text-tertiary-container';
    if (indicator === 'red') return 'text-alert-red';
    return 'text-on-surface';
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="border-l border-outline-variant/30 pl-4 py-2 relative group hover:border-primary/50 transition-colors"
    >
      <div className={`absolute w-2 h-2 rounded-full border -left-[4px] top-3 transition-all ${getIndicatorColor(item.factors?.indicator || 'yellow')}`}></div>
      
      <div 
        className="flex justify-between items-start mb-1 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="font-label-caps text-[10px] text-primary uppercase tracking-widest">{item.action.replace('_', ' ')}</span>
          <span className="material-symbols-outlined text-[14px] text-on-surface-variant group-hover:text-primary transition-colors">
            {expanded ? 'expand_less' : 'expand_more'}
          </span>
        </div>
        <span className={`text-[10px] font-bold ${getTextColor(item.factors?.indicator || 'yellow')}`}>
          {item.reward >= 0 ? '+' : ''}{item.reward} pts
        </span>
      </div>
      
      <p className="text-on-surface-variant text-xs mb-1 italic font-serif">"{item.factors?.explanation || item.explanation}"</p>

      <AnimatePresence>
        {expanded && item.factors && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-3"
          >
            <div className="bg-space-900/50 border border-outline-variant/20 rounded-lg p-3">
              <h4 className="font-label-caps text-[10px] text-primary mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">analytics</span> Decision Factors
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="block text-[9px] text-on-surface-variant uppercase tracking-wider mb-1">Urgency</span>
                  <span className="text-[10px] text-on-surface">{item.factors.urgencyImpact}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-on-surface-variant uppercase tracking-wider mb-1">Risk Impact</span>
                  <span className="text-[10px] text-on-surface">{item.factors.riskImpact}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-on-surface-variant uppercase tracking-wider mb-1">Resources</span>
                  <span className="text-[10px] text-on-surface">{item.factors.resourceImpact}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {item.projections && (
        <div className="mt-3 pl-2 border-l-2 border-outline-variant/50 text-xs flex items-center gap-2">
          <span className="font-label-caps opacity-60">Projection:</span>
          <span className={`font-medium ${
            item.projections.severity === 'Critical Escalation' ? 'text-error' :
            item.projections.severity === 'High Risk' ? 'text-alert-red' :
            item.projections.severity === 'Moderate Concern' ? 'text-tertiary-container' : 'text-signal-green'
          }`}>
            {item.projections.severity}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default function App() {
  const [state, setState] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const [appMode, setAppMode] = useState<'human' | 'ai'>('human');
  const [simulationStatus, setSimulationStatus] = useState<'idle' | 'in-progress' | 'completed'>('idle');
  const [humanFinalMetrics, setHumanFinalMetrics] = useState<any>(null);

  const fetchState = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getState();
      setState(data);
      setFallbackMode(false);
    } catch (err: any) {
      console.error(err);
      setError('Backend unavailable. Using fallback mock data.');
      setFallbackMode(true);
      setState(getMockState());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const handleReset = async () => {
    try {
      setLoading(true);
      const data = await api.resetEnvironment();
      setState(data);
      setFallbackMode(false);
      setError(null);
      setLeaderboard([]);
      setHistory([]);
      setSimulationStatus('idle');
      setHumanFinalMetrics(null);
    } catch (err) {
      console.error(err);
      setError('Failed to reset environment.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionType: string) => {
    if (fallbackMode) {
      alert(`Fallback mode: action ${actionType} triggered locally.`);
      return;
    }
    try {
      setLoading(true);
      const activeTask = state?.observation?.active_tasks?.[0];
      const prevState = state?.observation;
      const payload: ActionPayload = {
        action_type: actionType,
        task_id: activeTask?.id || 'T1',
        amount: 0,
        reason: 'Selected based on urgency, importance, and risk.'
      };
      const result = await api.step(payload);
      setState({ observation: result.observation, metrics: result.metrics, dis: result.dis });
      
      const factors = generateExplainabilityFactors(actionType, activeTask, prevState, result);
      const futureProjections = generateFutureProjections({ observation: result.observation, metrics: result.metrics, dis: result.dis });
      
      const newHistoryItem = {
        id: Date.now(),
        action: actionType,
        reward: result.reward || 0,
        explanation: factors.explanation,
        outcome: result.info?.outcome || 'Action executed successfully.',
        factors,
        projections: futureProjections
      };
      setHistory(prev => [newHistoryItem, ...prev]);
      setError(null);
      
      if (result.done || result.observation?.active_tasks?.length === 0) {
        setSimulationStatus('completed');
        setHumanFinalMetrics({
           agent_name: 'human',
           final_dis: result.dis?.total_score || 0,
           completed_tasks: result.metrics?.completed_tasks || 0,
           risk_failures: result.metrics?.risk_failures || 0,
           total_reward: result.metrics?.total_reward || 0
        });
        await handleCompareAgents();
      }
    } catch (err) {
      console.error(err);
      setError(`Failed to perform action: ${actionType}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    try {
      setLoading(true);
      const result = await api.simulate('mock_llm');
      setState({
        observation: {
          budget: 4200000,
          time_elapsed: 14,
          workforce: 1240,
          risk_level: 'Elevated',
          active_tasks: []
        },
        metrics: {
          total_reward: result.total_reward,
          completed_tasks: result.completed_tasks,
          risk_failures: result.risk_failures,
        },
        dis: {
          total_score: result.final_dis,
          component_scores: result.component_scores || { correctness: 0.96, utilization: 0.82, adherence: 0.88 }
        }
      });
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompareAgents = async () => {
    try {
      setLoading(true);
      const data = await api.compareAgents();
      setLeaderboard(data.comparison || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to compare agents.');
      setLeaderboard(getMockLeaderboard());
    } finally {
      setLoading(false);
    }
  };

  const getMockState = () => ({
    observation: {
      budget: 4200000,
      time_elapsed: 14,
      workforce: 1240,
      risk_level: 'Elevated',
      active_tasks: [
        { id: 'T1', title: 'Optimize Supply Chain Route', domain: 'Logistics', urgency: 'Critical', importance: 'High' },
        { id: 'T2', title: 'Allocate Q3 Operational Budget', domain: 'Finance', urgency: 'Medium', importance: 'Medium' }
      ]
    },
    metrics: {
      total_reward: 12450,
      completed_tasks: 843,
      risk_failures: 2
    },
    dis: {
      total_score: 0.942,
      component_scores: { correctness: 0.96, utilization: 0.82, adherence: 0.88 }
    }
  });

  const getMockLeaderboard = () => [
    { agent_name: 'random', final_dis: 0.124, completed_tasks: 45, risk_failures: 156, total_reward: 1200 },
    { agent_name: 'rule_based', final_dis: 0.548, completed_tasks: 412, risk_failures: 23, total_reward: 5400 },
    { agent_name: 'mock_llm', final_dis: 0.942, completed_tasks: 843, risk_failures: 2, total_reward: 12450 }
  ];

  const formatNumber = (num: number) => num ? num.toLocaleString() : '0';
  const formatDIS = (score: number) => score ? (score * 100).toFixed(1) : '0.0';

  const formatBudget = (budget: number) => {
    if (budget >= 1000000) return `$${(budget / 1000000).toFixed(1)}M`;
    return `$${budget?.toLocaleString()}`;
  };

  const getDomainColor = (domain: string) => {
    const d = domain.toLowerCase();
    if (d.includes('logistic')) return 'bg-blue-500/10 text-blue-glow border-blue-glow/30 shadow-[0_0_10px_rgba(96,165,250,0.2)]';
    if (d.includes('finance')) return 'bg-emerald-500/10 text-signal-green border-signal-green/30 shadow-[0_0_10px_rgba(52,211,153,0.2)]';
    if (d.includes('operation')) return 'bg-purple-500/10 text-electric-violet border-electric-violet/30 shadow-[0_0_10px_rgba(139,92,246,0.2)]';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  };

  const renderLeaderboardTowers = () => {
    let list = leaderboard.length > 0 ? [...leaderboard] : getMockLeaderboard();
    if (appMode === 'human' && humanFinalMetrics) {
      list = [...list.filter(l => l.agent_name !== 'human'), humanFinalMetrics];
    }
    
    // Sort by final_dis descending
    list.sort((a, b) => b.final_dis - a.final_dis);

    const winner = list[0]?.agent_name;

    return (
      <div className="flex flex-col sm:flex-row items-end justify-center gap-8 sm:gap-16 mt-12 h-64 border-b border-outline-variant/30 pb-4">
        {list.map((item, index) => {
          const isWinner = item.agent_name === winner;
          const isHuman = item.agent_name === 'human';
          const heightPercent = Math.max(item.final_dis * 100, 10);
          
          let pillarBg = 'bg-surface-container border border-outline-variant/50 shadow-glass';
          if (isWinner) pillarBg = 'bg-primary/20 border border-primary/50 shadow-glow-cyan-lg';
          if (isHuman) pillarBg = 'bg-secondary/20 border border-secondary/50 shadow-glow-violet-lg';

          let textColor = 'text-on-surface';
          if (isWinner) textColor = 'text-primary';
          if (isHuman) textColor = 'text-secondary';

          return (
            <motion.div 
              key={index} 
              className="flex flex-col items-center relative group"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: '100%', opacity: 1 }}
              transition={{ duration: 1, delay: index * 0.2, type: "spring" as const }}
            >
              {/* Floating Meta Data */}
              <motion.div 
                className={`absolute -top-16 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity ${textColor}`}
                initial={{ y: 10 }}
                whileHover={{ y: 0 }}
              >
                <span className="font-data-mono text-xl font-bold">{formatDIS(item.final_dis)}</span>
                <span className="font-label-caps text-xs">{item.completed_tasks} tasks</span>
              </motion.div>

              {/* Energy Pillar */}
              <motion.div 
                className={`w-16 rounded-t-lg relative overflow-hidden ${pillarBg}`}
                style={{ height: `${heightPercent}%` }}
                whileHover={{ scale: 1.05 }}
              >
                {(isWinner || isHuman) && (
                  <motion.div 
                    className={`absolute inset-0 bg-gradient-to-t from-transparent ${isHuman ? 'to-secondary/40' : 'to-primary/40'}`}
                    animate={{ y: ['100%', '-100%'] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" as const }}
                  />
                )}
              </motion.div>

              {/* Base Label */}
              <div className={`mt-4 font-label-caps text-xs text-center uppercase tracking-widest ${isHuman ? 'text-secondary font-bold' : 'text-on-surface-variant'}`}>
                {item.agent_name.replace('_', ' ')}
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const isRiskElevated = state?.observation?.risk_level === 'Elevated' || state?.observation?.risk_level === 'High';

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100 } }
  };

  const hoverFloat = {
    scale: 1.02,
    y: -5,
    transition: { type: "spring" as const, stiffness: 300, damping: 20 }
  };

  return (
    <>
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-space-900/80 backdrop-blur-md flex items-center justify-center"
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
              className="relative w-32 h-32 flex items-center justify-center"
            >
              <div className="absolute inset-0 rounded-full border-t-2 border-primary shadow-glow-cyan opacity-70"></div>
              <div className="absolute inset-2 rounded-full border-b-2 border-secondary shadow-glow-violet opacity-50" style={{ animationDirection: 'reverse' }}></div>
              <span className="font-label-caps tracking-widest text-primary animate-pulse absolute">DECISION.OS</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20 }}
        className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-space-900/50 backdrop-blur-xl border-b border-outline-variant/20 font-['Space_Grotesk']"
      >
        <div className="flex items-center gap-4">
          <motion.span 
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="text-2xl font-bold tracking-tight text-primary drop-shadow-[0_0_8px_rgba(56,245,255,0.8)]"
          >
            DecisionOS
          </motion.span>
        </div>

        {/* Mode Selector */}
        <div className="hidden md:flex items-center bg-surface-container rounded-full p-1 border border-outline-variant/30">
          <button 
            onClick={() => setAppMode('human')}
            className={`px-4 py-1 rounded-full font-label-caps text-xs transition-colors ${appMode === 'human' ? 'bg-primary/20 text-primary border border-primary/50 shadow-glow-cyan' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Human Mode
          </button>
          <button 
            onClick={() => setAppMode('ai')}
            className={`px-4 py-1 rounded-full font-label-caps text-xs transition-colors ${appMode === 'ai' ? 'bg-secondary/20 text-secondary border border-secondary/50 shadow-glow-violet' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            AI Agent Mode
          </button>
        </div>

        <div className="flex items-center gap-6">
          <motion.button 
            whileHover={appMode === 'ai' ? { scale: 1.05, boxShadow: "0 0 15px rgba(56,245,255,0.4)" } : {}}
            whileTap={appMode === 'ai' ? { scale: 0.95 } : {}}
            onClick={handleSimulate} disabled={loading || appMode === 'human'} 
            className={`px-4 py-2 rounded-full border transition-colors duration-200 flex items-center gap-2 ${appMode === 'human' ? 'bg-surface-container/50 text-on-surface-variant border-outline-variant/30 opacity-50 cursor-not-allowed' : 'bg-primary/10 text-primary border-primary/30'}`}
          >
            <span className="material-symbols-outlined text-sm">play_arrow</span>
            <span className="font-label-caps text-label-caps">Execute Simulation</span>
          </motion.button>
        </div>
      </motion.header>

      <nav className="hidden lg:flex flex-col h-screen fixed left-0 top-0 z-40 w-64 bg-space-800/60 backdrop-blur-2xl border-r border-outline-variant/20 pt-20 pb-6 px-4">
        <div className="mb-8 px-4">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs mb-1">Research Terminal</h2>
          <p className="text-on-surface-variant text-[10px] uppercase">Clinical Precision AI</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(56,245,255,0.3)" }}
          whileTap={{ scale: 0.98 }}
          onClick={handleReset} disabled={loading} 
          className="w-full bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 font-label-caps tracking-widest py-3 px-4 rounded-lg mb-8 flex items-center justify-center gap-2 shadow-glow-cyan transition-colors"
        >
          <span className="material-symbols-outlined text-sm">restart_alt</span>
          RESET ENV
        </motion.button>
      </nav>

      <main className="lg:ml-64 pt-20 min-h-screen flex flex-col relative z-10 overflow-hidden">
        {/* Animated Background Orbs */}
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ repeat: Infinity, duration: 15, ease: "easeInOut" }}
          className="absolute top-10 left-1/4 w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none"
        />
        <motion.div 
          animate={{ x: [0, -40, 0], y: [0, -50, 0] }}
          transition={{ repeat: Infinity, duration: 20, ease: "easeInOut" }}
          className="absolute bottom-20 right-1/4 w-[500px] h-[500px] bg-secondary/10 blur-[100px] rounded-full pointer-events-none"
        />

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="p-gutter max-w-container-max mx-auto w-full flex flex-col gap-xl relative z-10"
        >
          {error && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-error/10 border border-error/30 p-4 rounded-lg flex items-center justify-between shadow-glow-red">
              <span className="text-error font-body-sm">{error}</span>
              <button onClick={fetchState} className="text-error underline text-sm">Retry</button>
            </motion.div>
          )}

          <motion.section variants={itemVariants} className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-lg border-b border-outline-variant/30 pb-xl pt-4">
            <div className="max-w-2xl relative">
              <motion.div 
                className="absolute -left-8 top-2 w-1 h-12 bg-primary rounded-full shadow-glow-cyan"
                initial={{ height: 0 }}
                animate={{ height: 48 }}
                transition={{ duration: 1, delay: 0.5 }}
              />
              <h1 className="font-display-lg text-display-lg text-on-surface mb-xs tracking-tight">
                Decision<span className="text-primary drop-shadow-[0_0_15px_rgba(56,245,255,0.6)]">OS</span>
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
                Multi-Domain Benchmark for AI Decision-Making Under Real-World Constraints.
              </p>
              {appMode === 'human' && (
                <div className="mt-4 inline-flex items-center gap-2 bg-secondary/10 border border-secondary/30 text-secondary px-3 py-1 rounded-full shadow-glow-violet animate-pulse">
                  <span className="material-symbols-outlined text-sm">sports_esports</span>
                  <span className="font-label-caps text-xs">Challenge: Can you outperform the AI?</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-md">
              <motion.button 
                whileHover={hoverFloat}
                whileTap={{ scale: 0.95 }}
                onClick={handleCompareAgents} disabled={loading} 
                className="bg-surface-container border border-outline-variant hover:border-secondary hover:shadow-glow-violet text-on-surface font-label-caps text-label-caps px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">compare_arrows</span>
                COMPARE AGENTS
              </motion.button>
              <motion.button 
                whileHover={hoverFloat}
                whileTap={{ scale: 0.95 }}
                onClick={handleSimulate} disabled={loading} 
                className="bg-primary/20 border border-primary/50 text-primary font-label-caps text-label-caps px-6 py-3 rounded-lg shadow-glow-cyan hover:bg-primary/30 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">science</span>
                {loading ? 'SIMULATING...' : 'RUN SIMULATION'}
              </motion.button>
            </div>
          </motion.section>

          <motion.section variants={containerVariants} className="grid grid-cols-2 md:grid-cols-5 gap-md perspective-1000">
            {[
              { label: 'Decision Intel', value: formatDIS(state?.dis?.total_score || 0), sub: '+2.1%', icon: 'psychology', color: 'primary', shadow: 'shadow-glow-cyan' },
              { label: 'Total Reward', value: formatNumber(state?.metrics?.total_reward || 0), sub: 'pts', icon: 'workspace_premium', color: 'secondary', shadow: 'shadow-glow-violet' },
              { label: 'Tasks Done', value: formatNumber(state?.metrics?.completed_tasks || 0), sub: '/ 1000', icon: 'task_alt', color: 'outline', shadow: 'shadow-glass' },
              { label: 'Risk Accuracy', value: '98.1%', sub: '', icon: 'crisis_alert', color: 'alert-red', shadow: 'shadow-glow-red' },
              { label: 'Resource Eff.', value: 'A+', sub: 'Optimal', icon: 'energy_savings_leaf', color: 'signal-green', shadow: 'shadow-glass' }
            ].map((kpi, i) => (
              <motion.div 
                key={i}
                variants={itemVariants}
                whileHover={{ y: -10, scale: 1.05, rotateX: 5, rotateY: -5 }}
                className={`bg-surface-container/40 backdrop-blur-lg border border-outline-variant/30 rounded-2xl p-md relative overflow-hidden group hover:${kpi.shadow} transition-all duration-300 transform-gpu`}
              >
                <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-${kpi.color}/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                <div className="flex items-center justify-between mb-sm">
                  <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest">{kpi.label}</span>
                  <span className={`material-symbols-outlined text-${kpi.color} text-[16px] drop-shadow-md`}>{kpi.icon}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-h2 text-h2 text-on-surface">{kpi.value}</span>
                  <span className={`font-body-sm text-xs text-${kpi.color}`}>{kpi.sub}</span>
                </div>
              </motion.div>
            ))}
          </motion.section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
            <div className="lg:col-span-7 flex flex-col gap-lg">
              
              <motion.div variants={itemVariants} className="bg-surface-container/30 backdrop-blur-2xl border border-primary/20 rounded-2xl p-lg shadow-glass relative overflow-hidden group hover:border-primary/40 transition-colors">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/10 rounded-full blur-[40px] group-hover:bg-primary/20 transition-colors"></div>
                <h3 className="font-h3 text-h3 text-on-surface mb-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">public</span>
                  Current Environment State
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-sm relative z-10">
                  {[
                    { label: 'Budget', value: formatBudget(state?.observation?.budget || 0), color: 'text-primary' },
                    { label: 'Time Elapsed', value: `T+${state?.observation?.time_elapsed || 0}:00`, color: 'text-secondary' },
                    { label: 'Workforce', value: `${formatNumber(state?.observation?.workforce || 0)} U`, color: 'text-on-surface' },
                    { label: 'Risk Level', value: state?.observation?.risk_level || 'Normal', color: isRiskElevated ? 'text-error drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]' : 'text-on-surface' }
                  ].map((stat, i) => (
                    <div key={i} className={`bg-space-900/50 rounded-xl p-sm border ${i === 3 && isRiskElevated ? 'border-error/40 shadow-glow-red' : 'border-outline-variant/20'}`}>
                      <span className="font-label-caps text-[10px] text-on-surface-variant block mb-1">{stat.label}</span>
                      <span className={`font-data-mono text-sm sm:text-base ${stat.color}`}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-surface-container/30 backdrop-blur-2xl border border-outline-variant/30 rounded-2xl p-lg shadow-glass">
                <div className="flex justify-between items-center mb-md">
                  <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]">layers</span>
                    Active Task Stack
                  </h3>
                </div>
                <div className="relative pt-2 pb-8 perspective-1000">
                  <AnimatePresence>
                    {(state?.observation?.active_tasks?.slice(0, 4) || []).map((task: any, i: number) => (
                      <motion.div 
                        key={task.id || i} 
                        initial={{ opacity: 0, y: -20, scale: 0.9 }}
                        animate={{ 
                          opacity: 1 - (i * 0.2), 
                          y: i * 15, 
                          scale: 1 - (i * 0.05),
                          zIndex: 10 - i
                        }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ y: (i * 15) - 10, scale: (1 - (i * 0.05)) + 0.02, zIndex: 20 }}
                        className={`absolute w-full bg-space-800 border border-outline-variant/30 rounded-xl p-md flex items-center justify-between shadow-glass cursor-pointer`}
                      >
                        <div className="flex items-center gap-md">
                          <div className={`w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant/20 shrink-0`}>
                            <span className="material-symbols-outlined text-sm text-on-surface">{i === 0 ? 'priority_high' : 'schedule'}</span>
                          </div>
                          <div>
                            <h4 className="font-body-md text-sm text-on-surface font-medium mb-1">{task.title || `Task ${task.id}`}</h4>
                            <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border ${getDomainColor(task.domain || 'General')}`}>
                              {task.domain || 'General'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`font-label-caps text-[10px] ${task.urgency === 'Critical' ? 'text-error' : 'text-on-surface-variant'} block`}>Urgency</span>
                          <span className="font-data-mono text-sm text-on-surface">{task.urgency || 'Normal'}</span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {(!state?.observation?.active_tasks || state.observation.active_tasks.length === 0) && (
                    <div className="text-on-surface-variant text-center p-8 font-body-sm italic">Queue Empty. Awaiting input.</div>
                  )}
                  {/* Invisible spacer to maintain layout height for absolute positioned elements */}
                  <div className="h-48"></div> 
                </div>
              </motion.div>

              {state && <ProjectedConsequences state={state} />}
            </div>

            <div className="lg:col-span-5 flex flex-col gap-lg">
              <motion.div variants={itemVariants} className="bg-surface-container/30 backdrop-blur-2xl border border-primary/30 rounded-2xl p-lg shadow-glow-cyan relative">
                <h3 className="font-h3 text-h3 text-on-surface mb-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">tune</span>
                  Action Control Matrix
                </h3>
                <div className="grid grid-cols-2 gap-sm">
                  {[
                    { action: 'prioritize_task', label: 'PRIORITIZE', icon: 'priority_high', color: 'primary' },
                    { action: 'allocate_resources', label: 'ALLOCATE', icon: 'call_split', color: 'secondary' },
                    { action: 'veto_task', label: 'VETO', icon: 'block', color: 'outline-variant' },
                    { action: 'step', label: 'STEP', icon: 'step_into', color: 'signal-green' }
                  ].map((btn, i) => (
                    <motion.button 
                      key={i}
                      whileHover={appMode === 'human' && simulationStatus !== 'completed' ? { scale: 1.05, y: -2 } : {}}
                      whileTap={appMode === 'human' && simulationStatus !== 'completed' ? { scale: 0.95 } : {}}
                      onClick={() => handleAction(btn.action)} 
                      disabled={loading || appMode !== 'human' || simulationStatus === 'completed'} 
                      className={`bg-space-900/60 hover:bg-space-800 border border-${btn.color}/30 text-${btn.color} font-label-caps text-xs py-4 px-4 rounded-xl flex flex-col items-center gap-2 transition-colors shadow-[inset_0_0_15px_rgba(255,255,255,0.02)] ${appMode !== 'human' || simulationStatus === 'completed' ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                      <span className="material-symbols-outlined text-xl">{btn.icon}</span>
                      {btn.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-surface-container/30 backdrop-blur-2xl border border-outline-variant/30 rounded-2xl p-lg shadow-glass flex-grow relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary via-secondary to-transparent opacity-50"></div>
                <h3 className="font-h3 text-h3 text-on-surface mb-md flex items-center gap-2 pl-4">
                  <span className="material-symbols-outlined text-tertiary">history</span>
                  Simulation Timeline
                </h3>
                <div className="flex flex-col gap-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar pl-4">
                  <AnimatePresence>
                    {history.length > 0 ? history.map((item) => (
                      <TimelineItem key={item.id} item={item} />
                    )) : (
                      <div className="text-on-surface-variant text-xs italic opacity-50">Timeline initialized. Awaiting sequence...</div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </div>

          <motion.section variants={itemVariants} className="bg-space-900/80 backdrop-blur-3xl border border-outline-variant/20 rounded-3xl p-xl shadow-2xl overflow-hidden relative mt-8">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-space-900 to-space-900 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col items-center mb-8">
              <h3 className="font-display-lg text-3xl sm:text-4xl text-on-surface mb-2 flex items-center gap-3 drop-shadow-md">
                <span className="material-symbols-outlined text-secondary text-3xl">account_tree</span>
                Agent Performance Matrix
              </h3>
              <p className="text-on-surface-variant font-label-caps tracking-widest text-xs uppercase">Evaluating Decision Intelligence (DIS) Baseline</p>
            </div>
            
            <div className="relative z-10">
              {renderLeaderboardTowers()}
            </div>
          </motion.section>

          <div className="h-md"></div>
        </motion.div>
      </main>
    </>
  );
}
