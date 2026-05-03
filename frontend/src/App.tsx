import { useState, useEffect } from 'react';
import { api } from './lib/api';
import type { ActionPayload } from './lib/api';

export default function App() {
  const [state, setState] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

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
      const payload: ActionPayload = {
        action_type: actionType,
        task_id: activeTask?.id || 'T1',
        amount: 0,
        reason: 'Selected based on urgency, importance, and risk.'
      };
      const result = await api.step(payload);
      setState({ observation: result.observation, metrics: result.metrics, dis: result.dis });
      
      const newHistoryItem = {
        id: Date.now(),
        action: actionType,
        reward: result.reward || 0,
        explanation: result.info?.explanation || 'Selected due to high urgency and high importance.',
        outcome: result.info?.outcome || 'Action executed successfully.'
      };
      setHistory(prev => [newHistoryItem, ...prev]);
      setError(null);
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
    if (d.includes('logistic')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (d.includes('finance')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (d.includes('operation')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  const renderLeaderboard = () => {
    const list = leaderboard.length > 0 ? leaderboard : getMockLeaderboard();
    return list.map((item, index) => {
      const isWinner = item.agent_name === 'mock_llm';
      return (
        <tr key={index} className={isWinner ? "bg-primary/5 border-l-4 border-l-primary border-b border-outline-variant/20 hover:bg-primary/10 transition-colors" : "border-b border-outline-variant/20 hover:bg-surface-container-highest/30 transition-colors"}>
          <td className={`py-4 px-4 flex items-center gap-2 ${isWinner ? 'text-primary font-bold' : ''}`}>
            <span className={`w-2 h-2 rounded-full ${isWinner ? 'bg-primary shadow-[0_0_8px_rgba(138,235,255,0.8)]' : index === 0 ? 'bg-outline' : 'bg-secondary'}`}></span>
            {item.agent_name === 'random' ? 'Random Baseline' : item.agent_name === 'rule_based' ? 'Rule-Based Heuristic' : 'DecisionOS Mock LLM'}
          </td>
          <td className={`py-4 px-4 text-right ${isWinner ? 'text-primary font-bold' : 'text-on-surface'}`}>
            <div className="flex flex-col items-end">
              <span>{formatDIS(item.final_dis)}</span>
              <div className="w-24 h-1.5 bg-surface-container-highest mt-1 rounded-full overflow-hidden">
                <div className={`h-full ${isWinner ? 'bg-primary' : 'bg-outline'}`} style={{ width: `${item.final_dis * 100}%` }}></div>
              </div>
            </div>
          </td>
          <td className={`py-4 px-4 text-right text-on-surface`}>{formatNumber(item.completed_tasks)}</td>
          <td className={`py-4 px-4 text-right ${item.risk_failures > 50 ? 'text-error' : 'text-on-surface'}`}>{item.risk_failures}</td>
          <td className={`py-4 px-4 font-label-caps text-label-caps ${isWinner ? 'text-primary' : 'text-on-surface'}`}>
            {isWinner ? <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">pulse_alert</span> Active</span> : 'Completed'}
          </td>
        </tr>
      );
    });
  };

  const isRiskElevated = state?.observation?.risk_level === 'Elevated' || state?.observation?.risk_level === 'High';

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-surface-container border border-primary/20 p-6 rounded-xl flex flex-col items-center gap-4 shadow-[0_0_30px_rgba(138,235,255,0.15)]">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="font-label-caps tracking-widest text-primary animate-pulse">AI agent is making decisions...</span>
          </div>
        </div>
      )}

      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-slate-950/80 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.4)] border-b border-white/10 font-['Space_Grotesk'] antialiased">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold tracking-tight text-cyan-400">DecisionOS</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={handleSimulate} disabled={loading} className="bg-primary/10 hover:bg-primary/20 text-cyan-400 px-4 py-2 rounded border border-cyan-400/30 transition-colors duration-200 active:scale-95 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">play_arrow</span>
            <span className="font-label-caps text-label-caps">Execute Simulation</span>
          </button>
          <div className="flex items-center gap-4 border-l border-white/10 pl-6">
            <button className="text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors duration-200 p-2 rounded-full active:scale-95 relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-cyan-400 rounded-full"></span>
            </button>
          </div>
        </div>
      </header>

      <nav className="hidden lg:flex flex-col h-screen fixed left-0 top-0 z-40 w-64 bg-slate-950/90 backdrop-blur-xl border-r border-white/10 shadow-2xl shadow-cyan-900/10 font-['Space_Grotesk'] text-sm tracking-wide pt-20 pb-6 px-4">
        <div className="mb-8 px-4">
          <h2 className="text-cyan-400 font-bold uppercase tracking-widest text-xs mb-1">Research Terminal</h2>
          <p className="text-slate-500 text-[10px] uppercase">Clinical Precision AI</p>
        </div>
        <button onClick={handleReset} disabled={loading} className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-bold py-3 px-4 rounded mb-8 flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)]">
          <span className="material-symbols-outlined text-sm">restart_alt</span>
          RESET ENVIRONMENT
        </button>
        <div className="flex flex-col gap-1 flex-grow">
          <a className="flex items-center gap-3 px-4 py-3 rounded bg-cyan-500/10 text-cyan-400 border-r-2 border-cyan-400 hover:translate-x-1 transition-all duration-300" href="#">
            <span className="material-symbols-outlined">analytics</span>
            <span>Benchmark Dashboard</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-3 rounded text-slate-500 hover:text-cyan-200 hover:bg-white/5 hover:translate-x-1 transition-all duration-300" href="#">
            <span className="material-symbols-outlined">leaderboard</span>
            <span>Agent Leaderboard</span>
          </a>
        </div>
      </nav>

      <main className="lg:ml-64 pt-16 min-h-screen flex flex-col relative z-10">
        <div className="absolute top-0 left-1/4 w-[800px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="p-gutter max-w-container-max mx-auto w-full flex flex-col gap-xl relative z-10">
          
          {error && (
            <div className="bg-error/10 border border-error/20 p-4 rounded-lg flex items-center justify-between mt-4">
              <span className="text-error font-body-sm">{error}</span>
              <button onClick={fetchState} className="text-error underline text-sm hover:text-error-container">Retry</button>
            </div>
          )}

          <section className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-lg border-b border-outline-variant/30 pb-xl pt-md mt-4">
            <div className="max-w-2xl">
              <h1 className="font-display-lg text-display-lg text-on-surface mb-xs tracking-tight">
                Decision<span className="text-primary">OS</span>
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
                Multi-Domain Benchmark for AI Decision-Making Under Real-World Constraints.
              </p>
            </div>
            <div className="flex items-center gap-md">
              <button onClick={handleCompareAgents} disabled={loading} className="bg-surface-container-highest border border-outline-variant hover:border-secondary hover:text-secondary text-on-surface font-label-caps text-label-caps px-6 py-3 rounded-DEFAULT transition-all shadow-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">compare_arrows</span>
                COMPARE AGENTS
              </button>
              <button onClick={handleSimulate} disabled={loading} className="bg-primary hover:bg-primary-container text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-DEFAULT transition-all shadow-[0_0_20px_rgba(138,235,255,0.3)] flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">science</span>
                {loading ? 'SIMULATING...' : 'RUN SIMULATION'}
              </button>
            </div>
          </section>

          <section className="grid grid-cols-2 md:grid-cols-5 gap-md">
            <div className="bg-surface-container-low/80 backdrop-blur-xl border border-outline-variant/30 rounded-lg p-md shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
              <div className="flex items-center justify-between mb-sm">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Decision Intel</span>
                <span className="material-symbols-outlined text-primary text-[18px]">psychology</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-h2 text-h2 text-on-surface">{formatDIS(state?.dis?.total_score || 0)}</span>
                <span className="font-body-sm text-body-sm text-primary">+2.1%</span>
              </div>
            </div>
            <div className="bg-surface-container-low/80 backdrop-blur-xl border border-outline-variant/30 rounded-lg p-md shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-secondary/50 to-transparent"></div>
              <div className="flex items-center justify-between mb-sm">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Total Reward</span>
                <span className="material-symbols-outlined text-secondary text-[18px]">workspace_premium</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-h2 text-h2 text-on-surface">{formatNumber(state?.metrics?.total_reward || 0)}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">pts</span>
              </div>
            </div>
            <div className="bg-surface-container-low/80 backdrop-blur-xl border border-outline-variant/30 rounded-lg p-md shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] relative overflow-hidden">
              <div className="flex items-center justify-between mb-sm">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Tasks Done</span>
                <span className="material-symbols-outlined text-outline text-[18px]">task_alt</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-h2 text-h2 text-on-surface">{formatNumber(state?.metrics?.completed_tasks || 0)}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">/ 1000</span>
              </div>
            </div>
            <div className="bg-surface-container-low/80 backdrop-blur-xl border border-outline-variant/30 rounded-lg p-md shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] relative overflow-hidden">
              <div className="flex items-center justify-between mb-sm">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Risk Accuracy</span>
                <span className="material-symbols-outlined text-tertiary-container text-[18px]">crisis_alert</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-h2 text-h2 text-on-surface">98.1%</span>
              </div>
            </div>
            <div className="bg-surface-container-low/80 backdrop-blur-xl border border-outline-variant/30 rounded-lg p-md shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] relative overflow-hidden">
              <div className="flex items-center justify-between mb-sm">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Resource Eff.</span>
                <span className="material-symbols-outlined text-primary-fixed-dim text-[18px]">energy_savings_leaf</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-h2 text-h2 text-on-surface">A+</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Optimal</span>
              </div>
            </div>
          </section>

          <section className="bg-surface-container-highest/20 border border-primary/20 rounded-xl p-md">
            <h3 className="font-h3 text-h3 text-primary mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined">science</span>
              Research Insight
            </h3>
            <p className="text-on-surface-variant font-body-md leading-relaxed">
              DecisionOS evaluates AI agents across sequential decision tasks under real-world constraints. Unlike static benchmarks, it measures prioritization, resource allocation, and risk handling using deterministic graders and a unified Decision Intelligence Score (DIS).
            </p>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
            <div className="lg:col-span-7 flex flex-col gap-lg">
              <div className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/30 rounded-xl p-lg shadow-lg">
                <h3 className="font-h3 text-h3 text-on-surface mb-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">public</span>
                  Current Environment State
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-sm">
                  <div className="bg-surface-container-highest/50 rounded-lg p-sm border border-outline-variant/20">
                    <span className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Budget</span>
                    <span className="font-data-mono text-data-mono text-primary">{formatBudget(state?.observation?.budget || 0)}</span>
                  </div>
                  <div className="bg-surface-container-highest/50 rounded-lg p-sm border border-outline-variant/20">
                    <span className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Time Elapsed</span>
                    <span className="font-data-mono text-data-mono text-secondary">T+{state?.observation?.time_elapsed || 0}:00</span>
                  </div>
                  <div className="bg-surface-container-highest/50 rounded-lg p-sm border border-outline-variant/20">
                    <span className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Workforce</span>
                    <span className="font-data-mono text-data-mono text-on-surface">{formatNumber(state?.observation?.workforce || 0)} Units</span>
                  </div>
                  <div className={`bg-surface-container-highest/50 rounded-lg p-sm border ${isRiskElevated ? 'border-error/20 bg-error/5' : 'border-outline-variant/20'}`}>
                    <span className={`font-label-caps text-label-caps ${isRiskElevated ? 'text-error' : 'text-on-surface-variant'} block mb-1`}>Risk Level</span>
                    <span className={`font-data-mono text-data-mono ${isRiskElevated ? 'text-error' : 'text-on-surface'}`}>{state?.observation?.risk_level || 'Normal'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/30 rounded-xl p-lg shadow-lg">
                <div className="flex justify-between items-center mb-md">
                  <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">list_alt</span>
                    Active Task Queue
                  </h3>
                  <button className="font-label-caps text-label-caps text-primary hover:text-primary-container transition-colors">View All</button>
                </div>
                <div className="flex flex-col gap-sm">
                  {(state?.observation?.active_tasks?.slice(0,3) || []).map((task: any, i: number) => (
                    <div key={task.id || i} className="bg-surface-container-highest/40 hover:bg-surface-container-highest/80 transition-colors border border-outline-variant/20 rounded-lg p-md flex flex-col sm:flex-row items-start sm:items-center justify-between group cursor-pointer gap-4">
                      <div className="flex items-center gap-md">
                        <div className={`w-10 h-10 rounded-full ${i % 2 === 0 ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-secondary/10 border-secondary/20 text-secondary'} flex items-center justify-center border shrink-0`}>
                          <span className="material-symbols-outlined text-sm">{i % 2 === 0 ? 'local_hospital' : 'account_balance'}</span>
                        </div>
                        <div>
                          <h4 className="font-body-md text-body-md text-on-surface font-medium mb-1">{task.title || `Task ${task.id}`}</h4>
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${getDomainColor(task.domain || 'General')}`}>
                            {task.domain || 'General'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right self-end sm:self-auto">
                        <div>
                          <span className={`font-label-caps text-label-caps ${task.urgency === 'Critical' ? 'text-error' : 'text-tertiary-container'} block`}>Urgency</span>
                          <span className="font-data-mono text-data-mono text-on-surface text-sm">{task.urgency || 'Normal'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!state?.observation?.active_tasks || state.observation.active_tasks.length === 0) && (
                    <div className="text-on-surface-variant text-center p-4">No active tasks</div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-lg">
              <div className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/30 rounded-xl p-lg shadow-lg">
                <h3 className="font-h3 text-h3 text-on-surface mb-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container">tune</span>
                  Action Control Panel
                </h3>
                <div className="grid grid-cols-2 gap-sm mb-4">
                  <button onClick={() => handleAction('prioritize_task')} disabled={loading} className="bg-surface-container-highest hover:bg-surface-bright border border-outline-variant/30 text-primary font-label-caps text-label-caps py-3 px-4 rounded flex flex-col items-center gap-1 transition-colors">
                    <span className="material-symbols-outlined text-lg">priority_high</span>
                    PRIORITIZE
                  </button>
                  <button onClick={() => handleAction('allocate_resources')} disabled={loading} className="bg-surface-container-highest hover:bg-surface-bright border border-outline-variant/30 text-secondary font-label-caps text-label-caps py-3 px-4 rounded flex flex-col items-center gap-1 transition-colors">
                    <span className="material-symbols-outlined text-lg">call_split</span>
                    ALLOCATE
                  </button>
                  <button onClick={() => handleAction('veto_task')} disabled={loading} className="bg-surface-container-highest hover:bg-surface-bright border border-outline-variant/30 text-on-surface font-label-caps text-label-caps py-3 px-4 rounded flex flex-col items-center gap-1 transition-colors">
                    <span className="material-symbols-outlined text-lg">block</span>
                    VETO
                  </button>
                  <button onClick={() => handleAction('step')} disabled={loading} className="bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary font-label-caps text-label-caps py-3 px-4 rounded flex flex-col items-center gap-1 transition-colors">
                    <span className="material-symbols-outlined text-lg">step_into</span>
                    STEP
                  </button>
                </div>
              </div>

              <div className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/30 rounded-xl p-lg shadow-lg flex-grow">
                <h3 className="font-h3 text-h3 text-on-surface mb-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary-container">history</span>
                  Simulation Timeline
                </h3>
                <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {history.length > 0 ? history.map((item) => (
                    <div key={item.id} className="border-l-2 border-primary/40 pl-4 py-1 relative">
                      <div className="absolute w-2 h-2 rounded-full bg-primary -left-[5px] top-2"></div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-label-caps text-label-caps text-primary uppercase">{item.action}</span>
                        <span className={`text-xs font-bold ${item.reward >= 0 ? 'text-secondary' : 'text-error'}`}>
                          {item.reward >= 0 ? '+' : ''}{item.reward} pts
                        </span>
                      </div>
                      <p className="text-on-surface-variant text-sm mb-1 italic">"{item.explanation}"</p>
                      <p className="text-on-surface text-xs">{item.outcome}</p>
                    </div>
                  )) : (
                    <div className="text-on-surface-variant text-sm italic">No actions taken yet. Click STEP or action buttons above to begin.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <section className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/30 rounded-xl p-lg shadow-lg overflow-x-auto">
            <h3 className="font-h2 text-h2 text-on-surface mb-md flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">bar_chart</span>
              Agent Comparison Leaderboard
            </h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/50">
                  <th className="py-4 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Agent Model</th>
                  <th className="py-4 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase text-right w-48">DIS Score</th>
                  <th className="py-4 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase text-right">Tasks Solved</th>
                  <th className="py-4 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase text-right">Violations</th>
                  <th className="py-4 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="font-data-mono text-data-mono">
                {renderLeaderboard()}
              </tbody>
            </table>
          </section>

          <div className="h-md"></div>
        </div>
      </main>
    </>
  );
}
