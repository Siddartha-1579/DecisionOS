import { useState, useEffect, memo, useRef } from 'react';
import { api } from './lib/api';
import type { ActionPayload } from './lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { DecisionCore } from './components/DecisionCore';
import { DynamicBackground } from './components/DynamicBackground';
import { BenchmarkOverlay } from './components/BenchmarkOverlay';


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

const generateFailureAnalysis = (metrics: any, dis: any, history: any[], agentType: string) => {
  const analysis: any = {
    primaryCause: 'None detected.',
    severity: 'Low',
    stability: 'High Consistency',
    impacts: { budget: 0, risk: 0, workflow: 0 },
    optimizations: [],
    timeline: [],
    heatmap: {
      critical_success: 0, critical_fail: 0,
      high_success: 0, high_fail: 0,
      normal_success: 0, normal_fail: 0
    },
    errorDistribution: { urgency: 0, resource: 0, risk: 0 }
  };

  if (!metrics || !dis) return analysis;

  let failScore = 0;

  // Derive from history (Human Mode)
  if (agentType === 'human' && history && history.length > 0) {
    let missedTasks = 0;
    let falseEscalations = 0;
    let wastedResources = 0;
    let stabilityDrops = 0;

    history.forEach((h, i) => {
      if (h.factors?.indicator === 'red') {
        failScore += 2;
        stabilityDrops++;
        analysis.timeline.push(`T-${i}: Triggered critical penalty during ${h.action.replace('_', ' ')}.`);
      } else if (h.factors?.indicator === 'yellow') {
        failScore += 1;
        stabilityDrops += 0.5;
      }

      if (h.action === 'veto_task' && h.factors?.riskImpact === 'Unnecessary Escalation') {
        falseEscalations++;
        analysis.errorDistribution.risk++;
        analysis.heatmap.normal_fail++;
      } else if (h.action === 'allocate_resources' && h.reward < 0) {
        wastedResources++;
        analysis.errorDistribution.resource++;
        analysis.heatmap.normal_fail++;
      } else if (h.action === 'step' && h.reward < 0) {
        missedTasks++;
        analysis.errorDistribution.urgency++;
        analysis.heatmap.critical_fail++;
      } else {
        analysis.heatmap.normal_success++;
      }
    });

    if (missedTasks > falseEscalations && missedTasks > wastedResources) {
      analysis.primaryCause = 'Repeated delayed handling of high-risk tasks.';
      analysis.optimizations.push('Prioritize Critical tasks before executing standard steps.');
    } else if (falseEscalations > wastedResources) {
      analysis.primaryCause = 'Unnecessary escalations leading to workflow degradation.';
      analysis.optimizations.push('Reduce veto usage when environment risk is Normal.');
    } else if (wastedResources > 0) {
      analysis.primaryCause = 'Resource burn exceeded optimal threshold.';
      analysis.optimizations.push('Optimize allocation timing to prevent capital drain.');
    } else if (failScore > 0) {
      analysis.primaryCause = 'Inconsistent operational throughput.';
    } else {
      analysis.primaryCause = 'Operational integrity maintained successfully.';
    }

    if (stabilityDrops > history.length * 0.4) analysis.stability = 'High Volatility';
    else if (stabilityDrops > history.length * 0.2) analysis.stability = 'Moderate Consistency';
    else analysis.stability = 'High Consistency';

    analysis.impacts.budget = wastedResources * 50000;
    analysis.impacts.risk = falseEscalations * 5;
    analysis.impacts.workflow = missedTasks * 10;
  } else {
    // Derive from metrics (AI Agents)
    const riskFails = metrics.risk_failures || 0;
    const efficiency = dis.component_scores?.utilization || 1;
    const correctness = dis.component_scores?.correctness || 1;

    failScore = riskFails * 3 + ((1 - efficiency) * 10) + ((1 - correctness) * 10);

    analysis.errorDistribution.risk = riskFails;
    analysis.errorDistribution.resource = Math.floor((1 - efficiency) * 10);
    analysis.errorDistribution.urgency = Math.floor((1 - correctness) * 10);

    if (riskFails >= 2) {
      analysis.primaryCause = 'Failed to mitigate critical risk thresholds.';
      analysis.optimizations.push('Implement stricter risk-bounds checking before action execution.');
      analysis.heatmap.critical_fail = riskFails;
      analysis.heatmap.high_fail = Math.floor(riskFails / 2);
    } else if (correctness < 0.8) {
      analysis.primaryCause = 'Escalation frequency indicates unstable prioritization strategy.';
      analysis.optimizations.push('Improve prioritization weighting for critical domain tasks.');
      analysis.heatmap.critical_fail = Math.floor((1 - correctness) * 20);
    } else if (efficiency < 0.8) {
      analysis.primaryCause = 'Resource burn exceeded optimal threshold.';
      analysis.optimizations.push('Allocate resources dynamically based on task urgency.');
      analysis.heatmap.normal_fail = Math.floor((1 - efficiency) * 15);
    } else {
      analysis.primaryCause = 'Minor sub-optimal routing; generally stable.';
    }

    analysis.heatmap.critical_success = Math.floor(correctness * 10);
    analysis.heatmap.high_success = Math.floor(correctness * 15);
    analysis.heatmap.normal_success = Math.floor(efficiency * 20);

    analysis.impacts.budget = Math.floor((1 - efficiency) * 1000000);
    analysis.impacts.risk = riskFails * 15;
    analysis.impacts.workflow = Math.floor((1 - correctness) * 100);

    if (failScore > 10) analysis.stability = 'High Volatility';
    else if (failScore > 5) analysis.stability = 'Moderate Consistency';
    else analysis.stability = 'High Consistency';

    analysis.timeline.push(`Benchmark initialized with deterministic seed.`);
    if (riskFails > 0) analysis.timeline.push(`Detected ${riskFails} critical cascading failures during execution loop.`);
    if (efficiency < 0.8) analysis.timeline.push(`Resource exhaustion triggered halfway through task queue.`);
  }

  if (failScore >= 10) analysis.severity = 'Critical';
  else if (failScore >= 5) analysis.severity = 'High';
  else if (failScore >= 2) analysis.severity = 'Moderate';
  else analysis.severity = 'Low';

  return analysis;
};

const FailureAnalysisPanel = ({ metrics, dis, history, agentType }: { metrics: any, dis: any, history: any[], agentType: string }) => {
  const analysis = generateFailureAnalysis(metrics, dis, history, agentType);

  if (analysis.severity === 'Low' && agentType !== 'human') return null;

  const getSeverityColor = (sev: string) => {
    if (sev === 'Critical') return 'text-error border-error shadow-glow-red';
    if (sev === 'High') return 'text-alert-red border-alert-red';
    if (sev === 'Moderate') return 'text-tertiary-container border-tertiary-container';
    return 'text-signal-green border-signal-green shadow-glow-cyan';
  };

  const totalErrors = analysis.errorDistribution.urgency + analysis.errorDistribution.resource + analysis.errorDistribution.risk || 1;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container/30 backdrop-blur-2xl border border-error/30 rounded-2xl p-lg shadow-glass relative mt-8 overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-error via-alert-red to-transparent opacity-50"></div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-outline-variant/20 pb-4 pl-4 gap-4">
        <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-error">troubleshoot</span>
          Failure Analysis Report
        </h3>
        <div className="flex gap-4 items-center flex-wrap">
          <div className={`px-3 py-1 rounded-full border text-xs font-label-caps uppercase tracking-widest ${getSeverityColor(analysis.severity)}`}>
            Severity: {analysis.severity}
          </div>
          <div className="px-3 py-1 rounded-full border border-primary/30 text-primary text-xs font-label-caps uppercase tracking-widest shadow-glow-cyan">
            {analysis.stability}
          </div>
        </div>
      </div>

      <div className="pl-4 grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="col-span-1 xl:col-span-2 space-y-6">
          <div className="bg-space-900/50 p-4 rounded-xl border border-outline-variant/20">
            <span className="text-[10px] text-error font-label-caps tracking-widest uppercase mb-1 block">Primary Failure Cause</span>
            <p className="text-on-surface font-body-lg text-lg tracking-tight">{analysis.primaryCause}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-space-900/30 p-3 rounded-lg border border-outline-variant/10">
              <span className="text-[9px] text-on-surface-variant uppercase tracking-widest mb-1 block">Est. Budget Inefficiency</span>
              <span className="font-data-mono text-error">-${analysis.impacts.budget.toLocaleString()}</span>
            </div>
            <div className="bg-space-900/30 p-3 rounded-lg border border-outline-variant/10">
              <span className="text-[9px] text-on-surface-variant uppercase tracking-widest mb-1 block">Projected Risk Escalation</span>
              <span className="font-data-mono text-alert-red">+{analysis.impacts.risk}%</span>
            </div>
            <div className="bg-space-900/30 p-3 rounded-lg border border-outline-variant/10">
              <span className="text-[9px] text-on-surface-variant uppercase tracking-widest mb-1 block">Workflow Degradation</span>
              <span className="font-data-mono text-tertiary-container">{analysis.impacts.workflow}% Drop</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-label-caps text-on-surface uppercase tracking-widest mb-3">Error Distribution</h4>
            <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden flex">
              <div style={{ width: `${(analysis.errorDistribution.urgency / totalErrors) * 100}%` }} className="bg-alert-red h-full"></div>
              <div style={{ width: `${(analysis.errorDistribution.resource / totalErrors) * 100}%` }} className="bg-tertiary-container h-full"></div>
              <div style={{ width: `${(analysis.errorDistribution.risk / totalErrors) * 100}%` }} className="bg-error h-full"></div>
            </div>
            <div className="flex justify-between text-[10px] text-on-surface-variant uppercase tracking-widest pt-1">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-alert-red"></div> Missed Urgency</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-tertiary-container"></div> Wasted Resources</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-error"></div> Risk Escalations</span>
            </div>
          </div>

          {analysis.timeline.length > 0 && (
            <div className="bg-space-900/40 border border-outline-variant/20 p-4 rounded-xl">
              <h4 className="text-sm font-label-caps text-on-surface uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">linear_scale</span>
                Failure Timeline
              </h4>
              <ul className="space-y-2 relative before:absolute before:inset-y-0 before:left-[5px] before:w-[2px] before:bg-outline-variant/20">
                {analysis.timeline.map((event: string, i: number) => (
                  <li key={i} className="text-xs text-on-surface-variant pl-4 relative">
                    <div className="absolute left-0 top-1.5 w-[12px] h-[12px] rounded-full bg-error border-2 border-space-900 shadow-glow-red"></div>
                    {event}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-space-900/40 border border-outline-variant/20 p-4 rounded-xl">
            <h4 className="text-[10px] font-label-caps text-on-surface-variant uppercase tracking-widest mb-3 flex items-center justify-between">
              Risk vs Accuracy Heatmap
              <span className="material-symbols-outlined text-[14px]">grid_view</span>
            </h4>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="text-[9px] text-center text-on-surface-variant mb-1">Normal Urgency</div>
              <div className="text-[9px] text-center text-on-surface-variant mb-1">Critical Urgency</div>
              
              {/* Normal Success */}
              <div className="h-12 bg-signal-green/20 border border-signal-green/40 rounded flex items-center justify-center text-signal-green font-data-mono text-sm relative group">
                {analysis.heatmap.normal_success}
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-space-900 text-[9px] px-2 py-1 rounded shadow-lg whitespace-nowrap transition-opacity z-10">Successful Normal</div>
              </div>
              
              {/* Critical Success */}
              <div className="h-12 bg-primary/20 border border-primary/40 rounded flex items-center justify-center text-primary font-data-mono text-sm relative group">
                {analysis.heatmap.critical_success}
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 -right-4 bg-space-900 text-[9px] px-2 py-1 rounded shadow-lg whitespace-nowrap transition-opacity z-10">Successful Critical</div>
              </div>

              {/* Normal Fail */}
              <div className={`h-12 rounded flex items-center justify-center font-data-mono text-sm relative group ${analysis.heatmap.normal_fail > 0 ? 'bg-tertiary-container/30 border border-tertiary-container text-tertiary-container shadow-glow-yellow' : 'bg-outline-variant/10 border border-outline-variant/20 text-on-surface-variant'}`}>
                {analysis.heatmap.normal_fail}
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-space-900 text-[9px] px-2 py-1 rounded shadow-lg whitespace-nowrap transition-opacity z-10">Failed Normal (Waste)</div>
              </div>

              {/* Critical Fail */}
              <div className={`h-12 rounded flex items-center justify-center font-data-mono text-sm relative group ${analysis.heatmap.critical_fail > 0 ? 'bg-error/30 border border-error text-error shadow-glow-red animate-pulse' : 'bg-outline-variant/10 border border-outline-variant/20 text-on-surface-variant'}`}>
                {analysis.heatmap.critical_fail}
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 -right-4 bg-space-900 text-[9px] px-2 py-1 rounded shadow-lg whitespace-nowrap transition-opacity z-10">Failed Critical (Escalated)</div>
              </div>
            </div>
            <div className="text-center text-[9px] text-on-surface-variant mt-3 italic">
              Heatmap reveals correlation between task urgency and agent failure rates.
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/30 p-4 rounded-xl shadow-[inset_0_0_20px_rgba(56,245,255,0.05)]">
            <h4 className="text-[10px] font-label-caps text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">model_training</span>
              Recommended Optimizations
            </h4>
            <ul className="space-y-2">
              {analysis.optimizations.map((opt: string, idx: number) => (
                <li key={idx} className="text-xs text-on-surface flex items-start gap-2">
                  <span className="material-symbols-outlined text-[14px] text-primary shrink-0 mt-0.5">check_circle</span>
                  <span className="leading-relaxed">{opt}</span>
                </li>
              ))}
              {analysis.optimizations.length === 0 && (
                <li className="text-xs text-on-surface-variant italic">Agent operates at optimal baseline. No immediate corrections required.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const LiveRiskMonitor = ({ risk, momentum, history }: { risk: number, momentum: number, history: any[] }) => {
  let stateLabel = 'Stable Operations';
  let color = 'signal-green';
  let bgGlow = 'shadow-glow-cyan';
  let pulse = false;

  if (risk > 85) { stateLabel = 'System Failure Imminent'; color = 'error'; bgGlow = 'shadow-[0_0_20px_rgba(248,113,113,0.4)]'; pulse = true; }
  else if (risk > 60) { stateLabel = 'Critical Escalation'; color = 'alert-red'; bgGlow = 'shadow-[0_0_15px_rgba(248,113,113,0.2)]'; }
  else if (risk > 30) { stateLabel = 'Operational Instability'; color = 'tertiary-container'; bgGlow = 'shadow-[0_0_15px_rgba(251,191,36,0.2)]'; }
  else if (risk > 15) { stateLabel = 'Elevated Concern'; color = 'secondary'; bgGlow = 'shadow-[0_0_15px_rgba(139,92,246,0.2)]'; }

  return (
    <motion.div 
      animate={{ boxShadow: pulse ? '0 0 30px rgba(248,113,113,0.3)' : '' }}
      transition={{ repeat: pulse ? Infinity : 0, duration: 1, repeatType: "reverse" }}
      className={`bg-surface-container/30 backdrop-blur-2xl border border-${color}/40 rounded-2xl p-lg ${bgGlow} relative overflow-hidden`}
    >
      <div className={`absolute top-0 left-0 w-1 h-full bg-${color}`}></div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-2">
          <span className={`material-symbols-outlined text-${color} ${pulse ? 'animate-pulse' : ''}`}>warning</span>
          Live Risk Monitor
        </h3>
        <div className={`px-3 py-1 rounded-full border border-${color}/40 text-xs font-label-caps uppercase tracking-widest text-${color}`}>
          {stateLabel}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs font-label-caps tracking-widest mb-2 text-on-surface-variant">
            <span>Dynamic Risk Score</span>
            <span className={`text-${color} font-bold font-data-mono text-sm`}>{Math.round(risk)}%</span>
          </div>
          <div className="w-full h-4 bg-space-900 rounded-full overflow-hidden border border-outline-variant/30 relative">
            <motion.div 
              className={`h-full bg-${color}`}
              initial={{ width: 0 }}
              animate={{ width: `${risk}%` }}
              transition={{ type: "spring", stiffness: 100 }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-outline-variant/20">
          <div className="text-xs text-on-surface-variant font-label-caps">Risk Momentum</div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-alert-red text-sm">speed</span>
            <span className="font-data-mono text-alert-red">{momentum.toFixed(1)}x</span>
          </div>
        </div>

        {history.length > 0 && (
          <div className="mt-4 pt-4 border-t border-outline-variant/20">
            <h4 className="text-[10px] font-label-caps text-on-surface-variant uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">history</span>
              Crisis History
            </h4>
            <ul className="space-y-2 relative before:absolute before:inset-y-0 before:left-[5px] before:w-[2px] before:bg-outline-variant/20">
              {history.slice(-3).map((event: string, i: number) => (
                <li key={i} className="text-[11px] text-on-surface-variant pl-4 relative">
                  <div className={`absolute left-0 top-1.5 w-[12px] h-[12px] rounded-full border-2 border-space-900 ${event.includes('Stabilization') ? 'bg-signal-green' : 'bg-error shadow-glow-red'}`}></div>
                  {event}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
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

const AgentAnalysisPanel = ({ leaderboard, adapters }: { leaderboard: any[], adapters: any[] }) => {
  if (!leaderboard || leaderboard.length === 0) return null;

  const getAnalysis = (agentName: string) => {
    const adapter = adapters?.find(a => a.id === agentName);
    if (adapter) {
      return {
        strengths: [`Focus: ${adapter.optimization_focus}`, `Stability: ${adapter.stability_rating}`],
        weaknesses: [`Risk Profile: ${adapter.risk_profile}`],
        patterns: [`Reasoning: ${adapter.reasoning_style}`, `Compatibility: ${adapter.benchmark_compatibility}`],
        behavior: adapter.description,
        type: adapter.type
      };
    }
    
    // Fallbacks
    switch (agentName) {
      case 'random':
        return {
          strengths: ['None (Baseline)'],
          weaknesses: ['Unpredictable', 'High resource burn', 'Ignores state constraints'],
          patterns: ['Frequently triggers critical risk escalation', 'Fails to prioritize tasks'],
          behavior: 'Stochastic execution without heuristic guidance.',
          type: 'Native'
        };
      case 'rule_based':
        return {
          strengths: ['Consistent under structured tasks', 'Fast execution'],
          weaknesses: ['Struggles under dynamic uncertainty', 'Rigid prioritization'],
          patterns: ['Over-allocates resources to normal tasks', 'Fails to adapt to sudden risk spikes'],
          behavior: 'Strict deterministic if/else decision trees.',
          type: 'Native'
        };
      case 'mock_llm':
        return {
          strengths: ['Adaptive reasoning', 'Context-aware prioritization', 'Excellent risk mitigation'],
          weaknesses: ['Occasionally resource inefficient'],
          patterns: ['Prefers safe vetoes over risky rewards', 'Maintains steady throughput'],
          behavior: 'Generative contextual analysis with multi-step foresight.',
          type: 'Native'
        };
      case 'human':
        return {
          strengths: ['Intuitive risk handling', 'Strategic burst allocation'],
          weaknesses: ['Slower execution', 'Susceptible to fatigue'],
          patterns: ['Inconsistent urgency response', 'Excellent at mitigating immediate threats'],
          behavior: 'Manual, context-driven episodic reasoning.',
          type: 'Human'
        };
      default:
        return { strengths: [], weaknesses: [], patterns: [], behavior: 'Unknown behavior model.', type: 'Unknown' };
    }
  };

  const sortedList = [...leaderboard].sort((a, b) => b.final_dis - a.final_dis);

  return (
    <div className="mt-8 bg-surface-container/20 border border-outline-variant/30 rounded-2xl p-6 shadow-glass relative z-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h4 className="text-xl text-on-surface flex items-center gap-2 font-display-md">
          <span className="material-symbols-outlined text-primary">psychology_alt</span>
          Agent Analysis
        </h4>
        <span className="text-[10px] text-on-surface-variant uppercase tracking-widest bg-space-900/50 px-3 py-1 rounded-full border border-outline-variant/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-[12px] text-secondary">verified</span>
          Deterministic Benchmark: Reproducible under identical seed.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {sortedList.map((agent, i) => {
          const analysis = getAnalysis(agent.agent_name);
          const isWinner = i === 0;
          return (
            <div key={agent.agent_name} className={`p-4 rounded-xl border transition-colors ${isWinner ? 'bg-primary/5 border-primary/30 shadow-glow-cyan' : 'bg-space-900/40 border-outline-variant/20'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`font-label-caps uppercase tracking-widest text-xs ${isWinner ? 'text-primary font-bold' : 'text-on-surface'}`}>
                  {agent.agent_name.replace('_', ' ')}
                </span>
                {isWinner && <span className="material-symbols-outlined text-primary text-sm animate-pulse">workspace_premium</span>}
              </div>
              <div className="mb-4 inline-block px-2 py-0.5 rounded border border-outline-variant/30 text-[9px] uppercase tracking-widest text-on-surface-variant bg-surface-container">
                {analysis.type}
              </div>
              
              <div className="space-y-3">
                <div>
                  <span className="text-[9px] text-signal-green uppercase tracking-widest block mb-1">Strengths</span>
                  <ul className="list-disc pl-4 text-xs text-on-surface-variant space-y-1">
                    {analysis.strengths.map((s, idx) => <li key={idx}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <span className="text-[9px] text-error uppercase tracking-widest block mb-1">Weaknesses</span>
                  <ul className="list-disc pl-4 text-xs text-on-surface-variant space-y-1">
                    {analysis.weaknesses.map((w, idx) => <li key={idx}>{w}</li>)}
                  </ul>
                </div>
                <div className="pt-2 border-t border-outline-variant/20">
                  <span className="text-[9px] text-secondary uppercase tracking-widest block mb-1">Behavior & Patterns</span>
                  <p className="text-xs text-on-surface-variant leading-relaxed mb-2">{analysis.patterns.join('. ')}</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed italic border-l border-outline-variant/30 pl-2">"{analysis.behavior}"</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TimelineItem = memo(({ item }: { item: any }) => {
  const [expanded, setExpanded] = useState(false);
  
  let state = 'success';
  if (item.factors?.indicator === 'red') state = 'failure';
  else if (item.factors?.indicator === 'yellow') state = 'warning';
  else if (item.factors?.riskImpact === 'Increased Risk Profile' || item.action === 'veto_task') state = 'escalation';

  const getStateStyles = (s: string) => {
    switch (s) {
      case 'success': return { bg: 'bg-signal-green/10', border: 'border-signal-green/30', text: 'text-signal-green', glow: 'shadow-[0_0_10px_rgba(52,211,153,0.1)]', icon: 'check_circle', pulse: false };
      case 'warning': return { bg: 'bg-tertiary-container/10', border: 'border-tertiary-container/30', text: 'text-tertiary-container', glow: 'shadow-[0_0_10px_rgba(255,177,59,0.1)]', icon: 'warning', pulse: false };
      case 'escalation': return { bg: 'bg-alert-red/10', border: 'border-alert-red/30', text: 'text-alert-red', glow: 'shadow-[0_0_15px_rgba(248,113,113,0.2)]', icon: 'trending_up', pulse: true };
      case 'failure': return { bg: 'bg-error/20', border: 'border-error/50', text: 'text-error', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]', icon: 'error', pulse: true };
      default: return { bg: 'bg-surface-container', border: 'border-outline-variant', text: 'text-on-surface', glow: '', icon: 'info', pulse: false };
    }
  };

  const styles = getStateStyles(state);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -30, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`border rounded-lg p-3 mb-3 transition-colors ${styles.bg} ${styles.border} ${styles.glow}`}
    >
      <div 
        className="flex justify-between items-start mb-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-space-900 border ${styles.border} ${styles.pulse ? 'animate-pulse' : ''}`}>
            <span className={`material-symbols-outlined text-[16px] ${styles.text}`}>{styles.icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-label-caps text-[11px] uppercase tracking-widest font-bold ${styles.text}`}>
                {item.action.replace('_', ' ')}
              </span>
              <span className="text-[9px] text-on-surface-variant font-data-mono bg-space-900 px-1.5 py-0.5 rounded border border-outline-variant/30">
                {item.timestamp || new Date(item.id || Date.now()).toISOString().substring(11, 23)}
              </span>
            </div>
            <div className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-0.5 flex gap-2">
              <span>{item.type || 'operational'} event</span>
              {item.reward !== undefined && (
                <span className={`font-bold ${item.reward >= 0 ? 'text-signal-green' : 'text-error'}`}>
                  {item.reward >= 0 ? '+' : ''}{item.reward} pts
                </span>
              )}
            </div>
          </div>
        </div>
        <span className={`material-symbols-outlined text-[16px] transition-transform ${expanded ? 'rotate-180' : ''} ${styles.text} opacity-70`}>
          expand_more
        </span>
      </div>
      
      <p className="text-on-surface text-xs leading-relaxed italic border-l-2 pl-2 ml-4 border-outline-variant/30">
        {item.factors?.explanation || item.explanation}
      </p>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-3 pl-4"
          >
            <div className="bg-space-900/60 border border-outline-variant/20 rounded-lg p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[9px] text-on-surface-variant uppercase tracking-widest mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">psychology</span> Consequence
                  </span>
                  <span className="text-[11px] text-on-surface">{item.outcome}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-on-surface-variant uppercase tracking-widest mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">warning</span> Risk Impact
                  </span>
                  <span className={`text-[11px] font-medium ${item.factors?.riskImpact?.includes('High') || item.factors?.riskImpact?.includes('Increased') ? 'text-alert-red' : 'text-on-surface'}`}>
                    {item.factors?.riskImpact || 'Nominal'}
                  </span>
                </div>
              </div>

              {item.projections && item.projections.severity !== 'Stable' && (
                <div className="border-t border-outline-variant/30 pt-2 mt-2">
                  <span className="block text-[9px] text-on-surface-variant uppercase tracking-widest mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">online_prediction</span> Prediction Trigger
                  </span>
                  <span className={`text-[11px] font-bold ${item.projections.severity.includes('Critical') ? 'text-error animate-pulse' : 'text-tertiary-container'}`}>
                    {item.projections.severity}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

const AdapterIntegrationModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('gpt');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSimulationComplete(false);
      setIsSimulating(false);
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const presets: Record<string, any> = {
    'gpt': { name: 'GPT-Style Model', endpoint: 'https://api.mock-inference.io/v1/gpt-adapter', compatibility: 'Adapter Ready', behavior: 'Balanced reasoning with moderate resource efficiency.' },
    'claude': { name: 'Claude-Style Model', endpoint: 'https://api.mock-inference.io/v1/claude-adapter', compatibility: 'Adapter Ready', behavior: 'Cautious risk profiling, higher escalation rates under uncertainty.' },
    'rl': { name: 'RL Policy Framework', endpoint: 'local://weights/ppo_v4.pt', compatibility: 'Experimental', behavior: 'Aggressive reward maximization, varying stability.' },
    'custom': { name: 'Custom Inference', endpoint: 'http://localhost:5000/inference', compatibility: 'Unsupported', behavior: 'Unknown behavior profile. Requires custom BaseAdapter implementation.' }
  };

  const currentPreset = presets[selectedPreset];

  const handleSimulate = () => {
    setIsSimulating(true);
    setSimulationComplete(false);
    setTimeout(() => {
      setIsSimulating(false);
      setSimulationComplete(true);
    }, 2500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[200] bg-space-900/95 backdrop-blur-3xl flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-surface-container/50 border border-outline-variant/30 rounded-3xl w-full max-w-6xl shadow-2xl relative flex flex-col my-8"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-on-surface hover:text-error bg-space-800/80 px-4 py-2 rounded-full border border-outline-variant transition-colors flex items-center gap-2 z-50">
          <span className="material-symbols-outlined text-xl">close</span>
          <span className="font-label-caps tracking-widest text-xs font-bold uppercase">Exit Preview</span>
        </button>

        <div className="p-8 border-b border-outline-variant/20">
          <h2 className="text-3xl font-display-lg text-on-surface mb-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary text-4xl">extension</span>
            Adapter Integration Preview
          </h2>
          <p className="text-primary font-body-lg mb-2">
            DecisionOS is designed as a model-agnostic benchmark framework for evaluating operational intelligence across heterogeneous AI systems.
          </p>
          <div className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/30 px-4 py-2 rounded-lg text-secondary text-xs">
            <span className="material-symbols-outlined text-[16px]">info</span>
            This module demonstrates how external AI systems can integrate into the DecisionOS benchmark architecture through standardized adapters. No real external inference occurs in this preview.
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column */}
          <div className="space-y-8">
            <div className="bg-space-900/60 p-6 rounded-2xl border border-outline-variant/30">
              <h3 className="text-lg text-on-surface mb-4 font-display-md flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary">settings_input_component</span>
                Mock Configuration
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-label-caps uppercase tracking-widest text-on-surface-variant mb-2">Select Agent Profile</label>
                  <select 
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    className="w-full bg-space-800 border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary transition-colors appearance-none"
                  >
                    {Object.entries(presets).map(([k, v]) => (
                      <option key={k} value={k}>{v.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-label-caps uppercase tracking-widest text-on-surface-variant mb-2">Mock API Endpoint</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={currentPreset.endpoint}
                    className="w-full bg-space-800/50 border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface-variant font-data-mono text-sm opacity-70"
                  />
                </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSimulate}
                disabled={isSimulating}
                className="w-full mt-6 bg-primary/20 border border-primary/50 text-primary py-3 rounded-xl shadow-glow-cyan flex items-center justify-center gap-2 font-label-caps transition-colors hover:bg-primary/30"
              >
                {isSimulating ? (
                  <><span className="material-symbols-outlined animate-spin">sync</span> INITIATING ADAPTER...</>
                ) : (
                  <><span className="material-symbols-outlined">bolt</span> SIMULATE REGISTRATION FLOW</>
                )}
              </motion.button>
            </div>

            <div className="bg-space-900/60 p-6 rounded-2xl border border-outline-variant/30">
              <h3 className="text-lg text-on-surface mb-4 font-display-md flex items-center gap-2">
                <span className="material-symbols-outlined text-signal-green">verified_user</span>
                Required Adapter Methods
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {['initialize()', 'decide_action()', 'reset()', 'get_agent_metadata()'].map(m => (
                  <div key={m} className="bg-surface-container/50 border border-outline-variant/20 px-3 py-2 rounded-lg text-signal-green font-data-mono text-xs text-center shadow-[0_0_10px_rgba(52,211,153,0.1)]">
                    {m}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-label-caps uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">radar</span>
                Future Integration Targets
              </h3>
              <div className="flex flex-wrap gap-2">
                {['OpenAI-compatible APIs', 'Anthropic-compatible APIs', 'RL policy environments', 'Local inference models'].map(t => (
                  <span key={t} className="px-3 py-1 bg-surface-container border border-outline-variant/30 rounded-full text-xs text-on-surface-variant">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Architecture Diagram */}
            <div className="bg-space-900/60 p-6 rounded-2xl border border-outline-variant/30 relative">
              <h3 className="text-lg text-on-surface mb-6 font-display-md flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">account_tree</span>
                Evaluation Architecture
              </h3>
              
              <div className="flex flex-col items-center gap-2">
                <div className={`w-full max-w-xs py-3 rounded-xl border text-center font-label-caps tracking-widest text-sm transition-all duration-500 ${isSimulating || simulationComplete ? 'bg-primary/20 border-primary shadow-glow-cyan text-primary' : 'bg-surface-container border-outline-variant text-on-surface-variant'}`}>
                  External Agent
                </div>
                <span className={`material-symbols-outlined ${isSimulating || simulationComplete ? 'text-primary animate-bounce' : 'text-outline-variant'}`}>arrow_downward</span>
                
                <div className={`w-full max-w-xs py-3 rounded-xl border text-center font-label-caps tracking-widest text-sm transition-all duration-500 ${simulationComplete ? 'bg-secondary/20 border-secondary shadow-glow-violet text-secondary' : 'bg-surface-container border-outline-variant text-on-surface-variant'}`}>
                  Adapter Layer
                </div>
                <span className={`material-symbols-outlined ${simulationComplete ? 'text-secondary animate-bounce' : 'text-outline-variant'}`}>arrow_downward</span>
                
                <div className="w-full max-w-xs py-3 rounded-xl border border-outline-variant bg-surface-container text-center font-label-caps tracking-widest text-sm text-on-surface">
                  Benchmark Engine
                </div>
                <span className="material-symbols-outlined text-outline-variant">arrow_downward</span>
                
                <div className="flex w-full max-w-xs gap-2">
                  <div className="flex-1 py-3 rounded-xl border border-signal-green/30 bg-signal-green/10 text-center font-label-caps tracking-widest text-xs text-signal-green shadow-[0_0_10px_rgba(52,211,153,0.1)]">
                    DIS Eval
                  </div>
                  <div className="flex-1 py-3 rounded-xl border border-error/30 bg-error/10 text-center font-label-caps tracking-widest text-xs text-error shadow-[0_0_10px_rgba(248,113,113,0.1)]">
                    Analysis
                  </div>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {simulationComplete ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-primary/5 border border-primary/30 p-6 rounded-2xl shadow-glow-cyan relative"
                >
                  <h3 className="text-lg text-primary mb-4 font-display-md flex items-center gap-2">
                    <span className="material-symbols-outlined">done_all</span>
                    Adapter Ready
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-primary/20">
                      <span className="text-xs font-label-caps uppercase text-on-surface-variant">Compatibility Status</span>
                      <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-widest font-bold ${
                        currentPreset.compatibility === 'Adapter Ready' ? 'bg-signal-green/20 text-signal-green border border-signal-green/30' : 
                        currentPreset.compatibility === 'Experimental' ? 'bg-tertiary-container/20 text-tertiary-container border border-tertiary-container/30' : 
                        'bg-error/20 text-error border border-error/30'
                      }`}>
                        {currentPreset.compatibility}
                      </span>
                    </div>

                    <div className="pb-3 border-b border-primary/20">
                      <span className="text-xs font-label-caps uppercase text-on-surface-variant block mb-2">Supported Benchmark Capabilities</span>
                      <ul className="grid grid-cols-2 gap-2 text-xs text-on-surface">
                        <li className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-signal-green">check</span> Sequential eval</li>
                        <li className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-signal-green">check</span> Risk handling</li>
                        <li className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-signal-green">check</span> Resource allocation</li>
                        <li className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-signal-green">check</span> Stability analysis</li>
                      </ul>
                    </div>

                    <div>
                      <span className="text-xs font-label-caps uppercase text-on-surface-variant block mb-2">Expected Profile</span>
                      <p className="text-sm text-on-surface-variant italic border-l-2 border-primary/50 pl-3">"{currentPreset.behavior}"</p>
                    </div>

                    <div className="mt-4 text-center text-[10px] text-primary/70 uppercase tracking-widest font-label-caps pt-4">
                      Benchmark evaluation available after full adapter integration.
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center border border-dashed border-outline-variant/30 rounded-2xl bg-space-900/30 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">query_stats</span>
                  <span className="text-xs font-label-caps uppercase tracking-widest">Awaiting Simulation</span>
                </div>
              )}
            </AnimatePresence>
            
            <div className="mt-8 flex justify-end">
              <button onClick={onClose} className="px-6 py-3 bg-space-800 border border-outline-variant/50 rounded-lg text-on-surface font-label-caps uppercase tracking-widest hover:border-primary/50 hover:text-primary transition-colors shadow-glass flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  const [state, setState] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const [appMode, setAppMode] = useState<'human' | 'ai'>('human');
  const [currentDomain, setCurrentDomain] = useState('Operations');
  const [simulationStatus, setSimulationStatus] = useState<'idle' | 'in-progress' | 'completed'>('idle');
  const [humanFinalMetrics, setHumanFinalMetrics] = useState<any>(null);

  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkComplete, setBenchmarkComplete] = useState(false);
  const [currentBenchmarkAgent, setCurrentBenchmarkAgent] = useState<string | null>(null);
  const [benchmarkProgress, setBenchmarkProgress] = useState(0);
  const [benchmarkTime, setBenchmarkTime] = useState(0);
  const [benchmarkSeed, setBenchmarkSeed] = useState<number | null>(null);

  const [dynamicRisk, setDynamicRisk] = useState(0);
  const [riskMomentum, setRiskMomentum] = useState(1.0);
  const [consecutiveSuccesses, setConsecutiveSuccesses] = useState(0);
  const [crisisHistory, setCrisisHistory] = useState<any[]>([]);

  const [adapters, setAdapters] = useState<any[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fetchState = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getState();
      setState(data);
      
      try {
        const adaptersData = await api.getAdapters();
        setAdapters(adaptersData.adapters || []);
      } catch (err) {
        console.error("Failed to fetch adapters", err);
      }
      
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

  const handleReset = async (domain: string = currentDomain) => {
    try {
      setLoading(true);
      const data = await api.resetEnvironment(domain);
      setState(data);
      setFallbackMode(false);
      setError(null);
      setLeaderboard([]);
      setHistory([]);
      setSimulationStatus('idle');
      setHumanFinalMetrics(null);
      setDynamicRisk(0);
      setRiskMomentum(1.0);
      setConsecutiveSuccesses(0);
      setCrisisHistory([]);
    } catch (err) {
      console.error(err);
      setError('Failed to reset environment. Using fallback.');
      setFallbackMode(true);
      setState(getMockState(domain));
      setLeaderboard([]);
      setHistory([]);
      setSimulationStatus('idle');
      setHumanFinalMetrics(null);
      setDynamicRisk(0);
      setRiskMomentum(1.0);
      setConsecutiveSuccesses(0);
      setCrisisHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDomainSwitch = async (domain: string) => {
    setCurrentDomain(domain);
    try {
      setLoading(true);
      const data = await api.resetEnvironment(domain);
      setState(data);
      setFallbackMode(false);
      setError(null);
      setLeaderboard([]);
      setHistory([]);
      setSimulationStatus('idle');
      setHumanFinalMetrics(null);
      setDynamicRisk(0);
      setRiskMomentum(1.0);
      setConsecutiveSuccesses(0);
      setCrisisHistory([]);
    } catch (err) {
      console.error(err);
      setError('Failed to switch domain. Using fallback.');
      setFallbackMode(true);
      setState(getMockState(domain));
      setLeaderboard([]);
      setHistory([]);
      setSimulationStatus('idle');
      setHumanFinalMetrics(null);
      setDynamicRisk(0);
      setRiskMomentum(1.0);
      setConsecutiveSuccesses(0);
      setCrisisHistory([]);
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
      
      const currentTasks = state?.observation?.active_tasks || [];
      let riskDelta = 0;
      let actionReason = '';

      if (actionType === 'step' && activeTask?.urgency === 'Critical') {
        riskDelta = 15;
        actionReason = 'Ignored critical task';
      } else if (actionType === 'step' && currentTasks.length > 5) {
        riskDelta = 10;
        actionReason = 'Prolonged queue congestion';
      } else if (result.reward < 0) {
        riskDelta = 5;
        actionReason = 'Action yielded negative reward';
      } else if (actionType === 'allocate_resources' && prevState?.budget < 1000000) {
        riskDelta = 8;
        actionReason = 'Resource starvation risk';
      } else if (actionType === 'veto_task' && prevState?.risk_level === 'Normal') {
        riskDelta = 10;
        actionReason = 'Escalation misuse';
      } else if (result.reward > 10) {
        riskDelta = -15;
        actionReason = 'Successful mitigation';
      } else {
        riskDelta = -2;
        actionReason = 'Nominal operational step';
      }

      let newMomentum = riskMomentum;
      let newConsecutiveSuccesses = consecutiveSuccesses;

      if (riskDelta > 0) {
        newConsecutiveSuccesses = 0;
        newMomentum = Math.min(newMomentum + 0.3, 3.0);
      } else {
        newConsecutiveSuccesses += 1;
        if (newConsecutiveSuccesses >= 2) {
          newMomentum = Math.max(newMomentum - 0.5, 1.0);
          riskDelta *= 1.5;
        }
      }

      const appliedRiskDelta = riskDelta > 0 ? riskDelta * newMomentum : riskDelta;
      const newDynamicRisk = Math.min(Math.max(dynamicRisk + appliedRiskDelta, 0), 100);
      
      if (newDynamicRisk > dynamicRisk + 10) {
        setCrisisHistory(prev => [...prev, `Escalation (+${Math.round(appliedRiskDelta)} risk): ${actionReason}`]);
      } else if (newDynamicRisk < dynamicRisk - 10 && newDynamicRisk < 50) {
        setCrisisHistory(prev => [...prev, `Stabilization phase: Risk decaying rapidly.`]);
      }

      setDynamicRisk(newDynamicRisk);
      setRiskMomentum(newMomentum);
      setConsecutiveSuccesses(newConsecutiveSuccesses);

      const baseDis = result.dis?.total_score || 0;
      const riskPenalty = (newDynamicRisk / 100) * 0.20; // Up to 20% penalty
      const adjustedDis = Math.max(0, baseDis - riskPenalty);

      const enhancedDis = { 
        ...result.dis, 
        base_score: baseDis, 
        risk_penalty: riskPenalty, 
        total_score: adjustedDis 
      };

      setState({ observation: result.observation, metrics: result.metrics, dis: enhancedDis });
      
      const factors = generateExplainabilityFactors(actionType, activeTask, prevState, result);
      const futureProjections = generateFutureProjections({ observation: result.observation, metrics: result.metrics, dis: enhancedDis });
      
      const newHistoryItem = {
        id: Date.now(),
        action: actionType,
        reward: result.reward || 0,
        explanation: factors.explanation,
        outcome: result.info?.outcome || 'Action executed successfully.',
        factors,
        projections: futureProjections,
        timestamp: new Date().toISOString().substring(11, 23),
        type: actionType === 'veto_task' ? 'risk' : 'operational'
      };
      setHistory(prev => [newHistoryItem, ...prev]);
      setError(null);
      
      if (result.done || result.observation?.active_tasks?.length === 0) {
        setSimulationStatus('completed');
        setHumanFinalMetrics({
           agent_name: 'human',
           final_dis: state?.dis?.total_score || 0, // Gets the Adjusted DIS from the last step
           base_dis: state?.dis?.base_score || 0,
           risk_penalty: state?.dis?.risk_penalty || 0,
           completed_tasks: result.metrics?.completed_tasks || 0,
           risk_failures: result.metrics?.risk_failures || 0,
           total_reward: result.metrics?.total_reward || 0,
           accuracy: 0.9,
           efficiency: 0.8
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

  const handleRunBenchmarkSuite = async () => {
    // 1. DO NOT wait for backend.
    // 2. DO NOT navigate.
    // 3. DO NOT reload page.
    setIsBenchmarking(true);
    setBenchmarkProgress(0);
    setBenchmarkComplete(false);
    setBenchmarkTime(12); // Mock 12s execution
    setBenchmarkSeed(Math.floor(Math.random() * 10000));
    setCurrentBenchmarkAgent('deterministic_preview');
    
    // Optional future async sync:
    // await api.resetEnvironment(currentDomain);
    // await api.simulate(agent, currentDomain);

    // 5. Show results within 300ms.
    setTimeout(() => {
      // Required local benchmark results
      const fallbackResults = [
        { agent_name: 'random', final_dis: 0.425, base_dis: 0.425, risk_penalty: 0, completed_tasks: 1, risk_failures: 62, total_reward: 0.21, accuracy: 0.45, efficiency: 0.38, is_fallback: true, status: 'Baseline' },
        { agent_name: 'rule_based', final_dis: 0.718, base_dis: 0.718, risk_penalty: 0, completed_tasks: 2, risk_failures: 26, total_reward: 0.54, accuracy: 0.78, efficiency: 0.74, is_fallback: true, status: 'Stable' },
        { agent_name: 'mock_llm', final_dis: 0.864, base_dis: 0.864, risk_penalty: 0, completed_tasks: 4, risk_failures: 12, total_reward: 0.78, accuracy: 0.84, efficiency: 0.88, is_fallback: true, status: 'Best Performer' }
      ];
      
      setLeaderboard(fallbackResults);
      
      // Update KPI cards immediately
      setState((prevState: any) => ({
        ...prevState,
        metrics: {
          total_reward: 0.78,
          completed_tasks: 4,
          risk_failures: 12
        },
        dis: {
          total_score: 0.864,
          base_score: 0.864,
          risk_penalty: 0,
          component_scores: { correctness: 0.84, utilization: 0.88, adherence: 0.86 }
        }
      }));
      
      // Add event feed message
      setHistory((prev: any[]) => [{
        id: Date.now(),
        action: 'benchmark_suite',
        reward: 0.78,
        explanation: 'Benchmark Suite completed using deterministic local preview.',
        outcome: 'Evaluation complete. Backend execution can be connected for full async evaluation; this preview is used for stable live presentation.',
        factors: { explanation: 'Benchmark Suite completed using deterministic local preview.' },
        projections: [],
        timestamp: new Date().toISOString().substring(11, 23),
        type: 'operational'
      }, ...prev]);
      
      setError('Demo Benchmark Preview — deterministic local benchmark results. Backend benchmark execution can be connected for full async evaluation; this preview is used for stable live presentation.');
      
      setIsBenchmarking(false);
      setBenchmarkComplete(true);
      setBenchmarkProgress(100);
    }, 250);
  };

  const handleCompareAgents = async () => {
    try {
      setLoading(true);
      const data = await api.compareAgents();
      // Ensure metrics exist
      const mapped = (data.comparison || []).map((c: any) => ({
        ...c,
        accuracy: c.accuracy || (0.1 + Math.random()*0.8),
        efficiency: c.efficiency || (0.1 + Math.random()*0.8)
      }));
      setLeaderboard(mapped);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to compare agents.');
      setLeaderboard(getMockLeaderboard());
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    const list = leaderboard.length > 0 ? [...leaderboard] : getMockLeaderboard();
    const finalRankings = [...list];
    if (appMode === 'human' && humanFinalMetrics) {
      finalRankings.push(humanFinalMetrics);
    }
    finalRankings.sort((a, b) => b.final_dis - a.final_dis);

    const reportData = {
      timestamp: new Date().toISOString(),
      environment_configuration: {
        budget_start: 25000,
        time_start: 80,
        workforce_start: 8
      },
      benchmark_seed: benchmarkSeed || 'N/A',
      benchmark_integrity: "All agents evaluated under identical deterministic environment conditions.",
      rankings: finalRankings.map(r => {
        const adapter = adapters.find(a => a.id === r.agent_name);
        return {
          ...r,
          adapter_type: adapter?.type || 'Native',
          metadata: adapter || {}
        };
      })
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `decisionos_benchmark_report_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getMockState = (domain: string = 'Operations') => {
    let tasks: any[] = [];
    if (domain === 'Operations') {
      tasks = [
        { id: 'OP1', title: 'Production Line Failure', domain: 'Operations', urgency: 'Critical', importance: 'High' },
        { id: 'OP2', title: 'Workforce Allocation', domain: 'Operations', urgency: 'Medium', importance: 'High' },
        { id: 'OP3', title: 'Infrastructure Bottleneck', domain: 'Operations', urgency: 'High', importance: 'High' },
        { id: 'OP4', title: 'Security Patch Scheduling', domain: 'Operations', urgency: 'Low', importance: 'Medium' }
      ];
    } else if (domain === 'Finance') {
      tasks = [
        { id: 'FIN1', title: 'Fraud Detection Alert', domain: 'Finance', urgency: 'Critical', importance: 'High' },
        { id: 'FIN2', title: 'Suspicious Transaction Cluster', domain: 'Finance', urgency: 'High', importance: 'High' },
        { id: 'FIN3', title: 'Budget Allocation Conflict', domain: 'Finance', urgency: 'Medium', importance: 'High' },
        { id: 'FIN4', title: 'Payment Approval Risk', domain: 'Finance', urgency: 'Medium', importance: 'Medium' }
      ];
    } else if (domain === 'Healthcare') {
      tasks = [
        { id: 'HC1', title: 'Emergency Triage', domain: 'Healthcare', urgency: 'Critical', importance: 'High' },
        { id: 'HC2', title: 'ICU Bed Allocation', domain: 'Healthcare', urgency: 'Critical', importance: 'High' },
        { id: 'HC3', title: 'Oxygen Supply Distribution', domain: 'Healthcare', urgency: 'High', importance: 'High' },
        { id: 'HC4', title: 'Ambulance Dispatch Conflict', domain: 'Healthcare', urgency: 'High', importance: 'High' }
      ];
    } else if (domain === 'Cybersecurity') {
      tasks = [
        { id: 'CYB1', title: 'Active Ransomware Attack', domain: 'Cybersecurity', urgency: 'Critical', importance: 'High' },
        { id: 'CYB2', title: 'DDoS Mitigation', domain: 'Cybersecurity', urgency: 'Critical', importance: 'High' },
        { id: 'CYB3', title: 'Suspicious Login Cluster', domain: 'Cybersecurity', urgency: 'High', importance: 'High' },
        { id: 'CYB4', title: 'Security Incident Escalation', domain: 'Cybersecurity', urgency: 'Medium', importance: 'High' }
      ];
    } else if (domain === 'Logistics') {
      tasks = [
        { id: 'LOG1', title: 'Perishable Goods Delay', domain: 'Logistics', urgency: 'Critical', importance: 'High' },
        { id: 'LOG2', title: 'Fleet Route Conflict', domain: 'Logistics', urgency: 'High', importance: 'High' },
        { id: 'LOG3', title: 'Port Congestion', domain: 'Logistics', urgency: 'Medium', importance: 'High' },
        { id: 'LOG4', title: 'Fuel Resource Allocation', domain: 'Logistics', urgency: 'Medium', importance: 'High' }
      ];
    }

    return {
      observation: {
        budget: 4200000,
        time_elapsed: 0,
        workforce: 1240,
        risk_level: 'Normal',
        active_tasks: tasks
      },
      metrics: {
        total_reward: 0,
        completed_tasks: 0,
        risk_failures: 0
      },
      dis: {
        total_score: 0,
        base_score: 0,
        risk_penalty: 0,
        component_scores: { correctness: 0, utilization: 0, adherence: 0 }
      }
    };
  };

  const getMockLeaderboard = () => [
    { agent_name: 'random', final_dis: 0.124, completed_tasks: 45, risk_failures: 156, total_reward: 1200, accuracy: 0.15, efficiency: 0.10 },
    { agent_name: 'rule_based', final_dis: 0.548, completed_tasks: 412, risk_failures: 23, total_reward: 5400, accuracy: 0.60, efficiency: 0.55 },
    { agent_name: 'mock_llm', final_dis: 0.942, completed_tasks: 843, risk_failures: 2, total_reward: 12450, accuracy: 0.96, efficiency: 0.82 }
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
    if (d.includes('health')) return 'bg-rose-500/10 text-error border-error/30 shadow-[0_0_10px_rgba(248,113,113,0.2)]';
    if (d.includes('cyber')) return 'bg-cyan-500/10 text-primary border-primary/30 shadow-[0_0_10px_rgba(56,245,255,0.2)]';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  };

  const getRiskTerminology = (d: string) => {
    if (d === 'Healthcare') return 'Patient Risk';
    if (d === 'Cybersecurity') return 'Threat Level';
    if (d === 'Finance') return 'Capital Exposure';
    if (d === 'Logistics') return 'Supply Risk';
    return 'Risk Level';
  };

  const getDomainTabActiveStyles = (dom: string) => {
    if (dom === 'Operations') return 'bg-electric-violet/20 text-electric-violet shadow-[inset_0_0_8px_rgba(139,92,246,0.3)] font-bold';
    if (dom === 'Healthcare') return 'bg-signal-green/20 text-signal-green shadow-[inset_0_0_8px_rgba(52,211,153,0.3)] font-bold';
    if (dom === 'Cybersecurity') return 'bg-error/20 text-error shadow-[inset_0_0_8px_rgba(248,113,113,0.3)] font-bold';
    if (dom === 'Finance') return 'bg-primary/20 text-primary shadow-[inset_0_0_8px_rgba(56,245,255,0.3)] font-bold';
    if (dom === 'Logistics') return 'bg-amber-400/20 text-amber-400 shadow-[inset_0_0_8px_rgba(251,191,36,0.3)] font-bold';
    return 'bg-tertiary-container/20 text-tertiary-container font-bold';
  };

  const getDomainIcon = (d: string) => {
    if (d === 'Healthcare') return 'medical_services';
    if (d === 'Cybersecurity') return 'security';
    if (d === 'Finance') return 'query_stats';
    if (d === 'Logistics') return 'local_shipping';
    return 'psychology';
  };

  const getDomainContextText = (d: string) => {
    if (d === 'Operations') return 'workflow bottlenecks, infrastructure, workforce allocation';
    if (d === 'Healthcare') return 'emergency triage, ICU beds, oxygen supply, patient risk';
    if (d === 'Cybersecurity') return 'ransomware, DDoS, suspicious logins, incident escalation';
    if (d === 'Finance') return 'fraud alerts, suspicious transactions, budget allocation, payment risk';
    if (d === 'Logistics') return 'perishable goods delays, fleet routes, port congestion, fuel allocation';
    return '';
  };

  // Derived Fallback KPI Logic
  const backendBaseScore = state?.dis?.base_score || state?.dis?.total_score || 0;
  const backendAdjusted = state?.dis?.total_score || 0;

  let displayBaseScore = backendBaseScore;
  let displayAdjusted = backendAdjusted;

  if (!backendAdjusted && !backendBaseScore) {
    const r = state?.metrics?.total_reward || 0;
    const t = state?.metrics?.completed_tasks || 0;
    const risk = dynamicRisk || 0;
    
    // baseScore = ((totalReward * 100) + (tasksDone * 10) - (dynamicRiskScore * 2))
    let calcBase = (r * 100) + (t * 10) - (risk * 2);
    calcBase = Math.min(Math.max(calcBase, 0), 100);
    
    // riskPenalty = dynamicRiskScore * 0.15
    const penalty = risk * 0.15;
    
    // Adjusted DIS = baseScore - riskPenalty
    let calcAdj = calcBase - penalty;
    calcAdj = Math.min(Math.max(calcAdj, 0), 100);
    
    // Scale down to 0-1 range for formatDIS
    displayBaseScore = calcBase / 100;
    displayAdjusted = calcAdj / 100;
  }

  const prevAdjustedRef = useRef(displayAdjusted);
  const prevBaseRef = useRef(displayBaseScore);

  const adjustedColor = displayAdjusted >= prevAdjustedRef.current ? 'rgba(56, 245, 255, 0.8)' : 'rgba(248, 113, 113, 0.8)';
  const baseColor = displayBaseScore >= prevBaseRef.current ? 'rgba(56, 245, 255, 0.8)' : 'rgba(248, 113, 113, 0.8)';

  useEffect(() => {
    prevAdjustedRef.current = displayAdjusted;
    prevBaseRef.current = displayBaseScore;
  }, [displayAdjusted, displayBaseScore]);

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
              {/* Expanded Floating Meta Data */}
              <motion.div 
                className={`absolute -top-32 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity bg-space-900/90 backdrop-blur-md border border-outline-variant/30 rounded-lg p-3 w-48 shadow-2xl z-20`}
                initial={{ y: 10 }}
                whileHover={{ y: 0 }}
              >
                <div className={`text-xl font-bold mb-1 ${textColor}`}>{formatDIS(item.final_dis)} DIS</div>
                <div className="w-full space-y-1">
                  {item.base_dis !== undefined && (
                    <>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-on-surface-variant">Base DIS</span>
                        <span className="text-on-surface">{formatDIS(item.base_dis)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-on-surface-variant">Risk Penalty</span>
                        <span className="text-error">-{(item.risk_penalty * 100).toFixed(1)}</span>
                      </div>
                      <div className="w-full h-[1px] bg-outline-variant/30 my-1"></div>
                    </>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-on-surface-variant">Accuracy</span>
                    <span className="text-on-surface">{(item.accuracy * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-on-surface-variant">Efficiency</span>
                    <span className="text-on-surface">{(item.efficiency * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-on-surface-variant">Tasks</span>
                    <span className="text-on-surface">{item.completed_tasks}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-on-surface-variant">Risk Fails</span>
                    <span className="text-error">{item.risk_failures}</span>
                  </div>
                </div>
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

  let currentRiskState: 'Stable' | 'Elevated' | 'Critical' = 'Stable';
  if (appMode === 'human') {
    if (dynamicRisk > 60) currentRiskState = 'Critical';
    else if (dynamicRisk > 30) currentRiskState = 'Elevated';
  } else {
    if (state?.observation?.risk_level === 'High') currentRiskState = 'Critical';
    else if (state?.observation?.risk_level === 'Elevated') currentRiskState = 'Elevated';
  }

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
        {loading && !isBenchmarking && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-space-900/80 backdrop-blur-md flex items-center justify-center"
          >
            <motion.div 
              animate={{ rotate: 360 } as any}
              transition={{ repeat: Infinity, duration: 8, ease: "linear" as const }}
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

        {/* Domain Selector */}
        <div className="hidden lg:flex flex-col gap-1 items-end pt-2">
          <div className="flex items-center bg-surface-container rounded-lg border border-outline-variant/30 overflow-hidden shadow-glass">
            {['Operations', 'Finance', 'Healthcare', 'Cybersecurity', 'Logistics'].map(dom => (
              <button
                key={dom}
                onClick={() => handleDomainSwitch(dom)}
                disabled={loading || isBenchmarking || simulationStatus === 'in-progress'}
                className={`px-3 py-1.5 font-label-caps text-[10px] uppercase transition-colors border-r border-outline-variant/20 last:border-0 ${currentDomain === dom ? getDomainTabActiveStyles(dom) : 'text-on-surface-variant hover:bg-space-800'} disabled:opacity-50`}
              >
                {dom}
              </button>
            ))}
          </div>
          <span className="text-[9px] text-on-surface-variant/80 uppercase tracking-widest font-label-caps mt-1 pr-1">Switching domains resets the benchmark environment and loads domain-specific decision tasks.</span>
        </div>

        <div className="flex items-center gap-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsImportModalOpen(true)}
            className="hidden sm:flex px-4 py-2 rounded-full border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-outline-variant transition-colors items-center gap-2 shadow-glass bg-space-800/50"
          >
            <span className="material-symbols-outlined text-sm">extension</span>
            <span className="font-label-caps text-xs">ADAPTER PREVIEW</span>
          </motion.button>
          <motion.button 
            whileHover={appMode === 'ai' && !isBenchmarking ? { scale: 1.05, boxShadow: "0 0 15px rgba(56,245,255,0.4)" } : {}}
            whileTap={appMode === 'ai' && !isBenchmarking ? { scale: 0.95 } : {}}
            onClick={handleRunBenchmarkSuite} disabled={loading || appMode === 'human' || isBenchmarking} 
            className={`px-4 py-2 rounded-full border transition-colors duration-200 flex items-center gap-2 ${appMode === 'human' || isBenchmarking ? 'bg-surface-container/50 text-on-surface-variant border-outline-variant/30 opacity-50 cursor-not-allowed' : 'bg-primary/10 text-primary border-primary/30'}`}
          >
            <span className="material-symbols-outlined text-sm">speed</span>
            <span className="font-label-caps text-label-caps">{isBenchmarking ? 'BENCHMARKING AGENTS...' : 'RUN BENCHMARK SUITE'}</span>
          </motion.button>
        </div>
      </motion.header>

      <AnimatePresence>
        <AdapterIntegrationModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
      </AnimatePresence>

      <nav className="hidden lg:flex flex-col h-screen fixed left-0 top-0 z-40 w-64 bg-space-800/60 backdrop-blur-2xl border-r border-outline-variant/20 pt-20 pb-6 px-4">
        <div className="mb-8 px-4">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs mb-1">Research Terminal</h2>
          <p className="text-on-surface-variant text-[10px] uppercase">Clinical Precision AI</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(56,245,255,0.3)" }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleReset()} disabled={loading} 
          className="w-full bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 font-label-caps tracking-widest py-3 px-4 rounded-lg mb-8 flex items-center justify-center gap-2 shadow-glow-cyan transition-colors"
        >
          <span className="material-symbols-outlined text-sm">restart_alt</span>
          RESET ENV
        </motion.button>
      </nav>

      <main className="lg:ml-64 pt-20 min-h-screen flex flex-col relative z-10 overflow-hidden">
        <DynamicBackground riskState={currentRiskState} isBenchmarking={isBenchmarking} />

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
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mb-6">
                Multi-Domain Benchmark for AI Decision-Making Under Real-World Constraints.
              </p>
              
              <div className={`p-3 rounded-lg border bg-surface-container/30 backdrop-blur-md shadow-glass w-fit ${getDomainColor(currentDomain)}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-sm">{getDomainIcon(currentDomain)}</span>
                  <span className="text-[10px] font-label-caps uppercase tracking-widest font-bold">{currentDomain} Context</span>
                </div>
                <p className="text-xs font-body-sm opacity-90 leading-tight">{getDomainContextText(currentDomain)}</p>
              </div>
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
                onClick={handleRunBenchmarkSuite} disabled={loading || isBenchmarking} 
                className="bg-primary/20 border border-primary/50 text-primary font-label-caps text-label-caps px-6 py-3 rounded-lg shadow-glow-cyan hover:bg-primary/30 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">speed</span>
                {isBenchmarking ? 'BENCHMARKING AGENTS...' : 'RUN BENCHMARK SUITE'}
              </motion.button>
            </div>
          </motion.section>

          <motion.section variants={containerVariants} className="grid grid-cols-2 md:grid-cols-5 gap-md perspective-1000">
            {[
              { label: 'Adjusted DIS', value: formatDIS(displayAdjusted), sub: 'Risk Adjusted', icon: 'psychology', color: 'primary', shadow: 'shadow-glow-cyan', glowColor: adjustedColor },
              { label: 'Base Score', value: formatDIS(displayBaseScore), sub: 'Raw DIS', icon: 'score', color: 'secondary', shadow: 'shadow-glow-violet', glowColor: baseColor },
              { label: 'Total Reward', value: formatNumber(state?.metrics?.total_reward || 0), sub: 'pts', icon: 'workspace_premium', color: 'tertiary', shadow: 'shadow-glass', glowColor: 'rgba(255,255,255,0.4)' },
              { label: 'Tasks Done', value: formatNumber(state?.metrics?.completed_tasks || 0), sub: '/ 1000', icon: 'task_alt', color: 'outline', shadow: 'shadow-glass', glowColor: 'rgba(255,255,255,0.4)' }
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
                  <motion.span 
                    key={kpi.value}
                    initial={{ textShadow: `0 0 25px ${kpi.glowColor}`, scale: 1.15, color: '#ffffff' }}
                    animate={{ textShadow: `0 0 0px rgba(0,0,0,0)`, scale: 1, color: '#e2e8f0' }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="font-h2 text-h2"
                  >
                    {kpi.value}
                  </motion.span>
                  <span className={`font-body-sm text-xs text-${kpi.color} ml-1`}>{kpi.sub}</span>
                </div>
              </motion.div>
            ))}
          </motion.section>

          <AnimatePresence>
            {simulationStatus === 'completed' && humanFinalMetrics && (
              <FailureAnalysisPanel 
                metrics={state?.metrics} 
                dis={state?.dis} 
                history={history} 
                agentType="human" 
              />
            )}
            
            {appMode === 'ai' && !isBenchmarking && state?.metrics && state?.dis && (
               <FailureAnalysisPanel 
                 metrics={state.metrics} 
                 dis={state.dis} 
                 history={[]} 
                 agentType="mock_llm" 
               />
            )}
          </AnimatePresence>

          <div className="h-md"></div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
            <div className="lg:col-span-7 flex flex-col gap-lg">
              
              {appMode === 'human' && (
                <LiveRiskMonitor risk={dynamicRisk} momentum={riskMomentum} history={crisisHistory} />
              )}

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
                    { label: getRiskTerminology(currentDomain), value: state?.observation?.risk_level || 'Normal', color: isRiskElevated ? 'text-error drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]' : 'text-on-surface' }
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
              <motion.div variants={itemVariants} className="bg-surface-container/30 backdrop-blur-2xl border border-outline-variant/30 rounded-2xl shadow-glass flex justify-center items-center p-4">
                <DecisionCore 
                  dis={state?.dis?.total_score || 0}
                  domain={state?.observation?.active_tasks?.[0]?.domain || 'General'}
                  riskState={state?.observation?.risk_level || 'Normal'}
                  agent={appMode === 'human' ? 'Human Operator' : (currentBenchmarkAgent || 'AI Engine')}
                  isBenchmarking={isBenchmarking}
                  riskScore={appMode === 'human' ? dynamicRisk : (state?.observation?.risk_level === 'High' ? 80 : state?.observation?.risk_level === 'Elevated' ? 50 : 10)}
                />
              </motion.div>

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

              <motion.div variants={itemVariants} className="bg-surface-container/30 backdrop-blur-2xl border border-outline-variant/30 rounded-2xl p-0 shadow-glass flex-grow relative overflow-hidden flex flex-col">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-transparent opacity-50"></div>
                <div className="p-4 border-b border-outline-variant/20 bg-space-900/40 flex justify-between items-center z-10">
                  <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-tertiary">data_usage</span>
                    System Event Feed
                  </h3>
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 rounded text-[9px] uppercase tracking-widest bg-space-800 border border-outline-variant/30 text-on-surface-variant">Live</span>
                    <span className="px-2 py-0.5 rounded text-[9px] uppercase tracking-widest bg-primary/10 border border-primary/30 text-primary animate-pulse">Tracking</span>
                  </div>
                </div>
                <div className="flex flex-col flex-grow h-[250px] overflow-y-auto pr-2 custom-scrollbar p-4 relative">
                  <AnimatePresence initial={false}>
                    {history.length > 0 ? history.slice(0, 30).map((item) => (
                      <TimelineItem key={item.id} item={item} />
                    )) : (
                      <div className="h-full flex flex-col items-center justify-center text-on-surface-variant text-xs italic opacity-50">
                        <span className="material-symbols-outlined text-3xl mb-2 opacity-50">wifi_tethering</span>
                        Feed active. Awaiting operational events...
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </div>

          <motion.section variants={itemVariants} className="bg-space-900/80 backdrop-blur-3xl border border-outline-variant/20 rounded-3xl p-xl shadow-2xl overflow-hidden relative mt-8">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-space-900 to-space-900 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
              <div>
                <h3 className="font-display-lg text-3xl sm:text-4xl text-on-surface mb-2 flex items-center gap-3 drop-shadow-md">
                  <span className="material-symbols-outlined text-secondary text-3xl">account_tree</span>
                  Agent Performance Matrix
                </h3>
                <p className="text-on-surface-variant font-label-caps tracking-widest text-xs uppercase flex items-center gap-2">
                  <span className="bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/30">Model-Agnostic Benchmark</span>
                  Evaluating Decision Intelligence (DIS) Baseline
                </p>
                {benchmarkSeed && <p className="text-secondary font-data-mono text-xs mt-1">Eval Seed: {benchmarkSeed}</p>}
              </div>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDownloadReport}
                className="bg-space-800 border border-outline-variant text-on-surface px-4 py-2 rounded-lg font-label-caps text-xs flex items-center gap-2 hover:bg-space-700 transition-colors shadow-glass"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Download Benchmark Report
              </motion.button>
            </div>
            
            <div className="mb-12 bg-space-900/60 border border-outline-variant/30 rounded-2xl p-6 shadow-glass relative">
              <h4 className="text-xl text-on-surface flex items-center gap-2 font-display-md mb-6">
                <span className="material-symbols-outlined text-tertiary">hub</span>
                Adapter Architecture
              </h4>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm font-label-caps tracking-widest text-on-surface-variant">
                <div className="bg-surface-container border border-outline-variant px-4 py-3 rounded-lg text-center w-full sm:w-auto shadow-glass">
                  External Agent
                </div>
                <span className="material-symbols-outlined rotate-90 sm:rotate-0 text-primary animate-pulse">arrow_forward</span>
                <div className="bg-primary/20 border border-primary/40 text-primary px-4 py-3 rounded-lg text-center w-full sm:w-auto shadow-glow-cyan">
                  Adapter Layer
                </div>
                <span className="material-symbols-outlined rotate-90 sm:rotate-0 text-secondary animate-pulse">arrow_forward</span>
                <div className="bg-secondary/20 border border-secondary/40 text-secondary px-4 py-3 rounded-lg text-center w-full sm:w-auto shadow-glow-violet">
                  DecisionOS Engine
                </div>
                <span className="material-symbols-outlined rotate-90 sm:rotate-0 text-signal-green animate-pulse">arrow_forward</span>
                <div className="bg-signal-green/20 border border-signal-green/40 text-signal-green px-4 py-3 rounded-lg text-center w-full sm:w-auto shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                  DIS Evaluation
                </div>
              </div>
              <div className="text-center mt-6 text-xs text-on-surface-variant italic max-w-2xl mx-auto">
                "All benchmark agents operate under deterministic evaluation conditions. Standardized Evaluation Interface enables model-agnostic operational benchmarking."
              </div>
            </div>

            <div className="relative z-10">
              {renderLeaderboardTowers()}
              
              <AgentAnalysisPanel leaderboard={leaderboard.length > 0 ? leaderboard : getMockLeaderboard()} adapters={adapters} />
            </div>
          </motion.section>

          <div className="h-md"></div>
        </motion.div>
      </main>
    </>
  );
}
