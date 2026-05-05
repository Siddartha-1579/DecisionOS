const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? 'https://jaideep-1579-decisionos-backend.hf.space' : 'http://localhost:7860');

console.log("=========================================");
console.log("DecisionOS API Client Initialized");
console.log("Active API Base URL:", API_BASE_URL);
console.log("Environment Mode:", import.meta.env.MODE);
console.log("Vercel Provided URL:", import.meta.env.VITE_API_BASE_URL || 'Not Set');
console.log("=========================================");

export interface ActionPayload {
  action_type: string;
  task_id?: string;
  amount?: number;
  reason?: string;
}

export const api = {
  async getHealthCheck() {
    const res = await fetch(`${API_BASE_URL}/`);
    if (!res.ok) throw new Error('Network response was not ok');
    return res.json();
  },
  
  async resetEnvironment() {
    const res = await fetch(`${API_BASE_URL}/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset');
    return res.json();
  },

  async getState() {
    const res = await fetch(`${API_BASE_URL}/state`);
    if (!res.ok) throw new Error('Failed to fetch state');
    return res.json();
  },

  async step(action: ActionPayload) {
    const res = await fetch(`${API_BASE_URL}/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action)
    });
    if (!res.ok) throw new Error('Failed to step');
    return res.json();
  },

  async simulate(agentName: string) {
    const res = await fetch(`${API_BASE_URL}/simulate/${agentName}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to simulate');
    return res.json();
  },

  async compareAgents() {
    const res = await fetch(`${API_BASE_URL}/compare-agents`);
    if (!res.ok) throw new Error('Failed to compare agents');
    return res.json();
  },

  async getTasks() {
    const res = await fetch(`${API_BASE_URL}/tasks`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  async getMetrics() {
    const res = await fetch(`${API_BASE_URL}/metrics`);
    if (!res.ok) throw new Error('Failed to fetch metrics');
    return res.json();
  }
};
