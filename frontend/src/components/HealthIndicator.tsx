import React, { useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { HealthResponse } from '../types';

export const HealthIndicator: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Health check failed');
      const data: HealthResponse = await res.json();
      setHealth(data);
      setError(false);
    } catch {
      setError(true);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !health) {
    return (
      <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
        <Activity className="w-3.5 h-3.5 animate-spin text-indigo-400" />
        <span>Checking backend health...</span>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="flex items-center space-x-2 text-xs text-red-400 bg-red-950/40 px-3 py-1.5 rounded-lg border border-red-800/40">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Backend Disconnected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-800/40">
      <CheckCircle2 className="w-3.5 h-3.5" />
      <span>
        API Online v{health.version} ({health.app_name})
      </span>
    </div>
  );
};

export default HealthIndicator;
