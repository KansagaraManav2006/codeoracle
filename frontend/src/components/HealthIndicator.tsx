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
      <div className="flex items-center space-x-2 text-xs font-semibold text-[#4D4842] bg-[#F0EBE2] px-3 py-1.5 rounded-full border border-[#D8CFC2]">
        <Activity className="w-3.5 h-3.5 animate-spin text-[#4C4FD6]" />
        <span className="hidden sm:inline">Connecting...</span>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="flex items-center space-x-2 text-xs font-semibold text-[#8F3F3A] bg-[#F6E5E2] px-3 py-1.5 rounded-full border border-[#ECC7C3]">
        <AlertCircle className="w-3.5 h-3.5 text-[#C45F58]" />
        <span className="hidden sm:inline">Service unavailable</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-xs font-bold text-[#245F59] bg-[#E0EFEB] px-3.5 py-1.5 rounded-full border border-[#BEE0D6]">
      <CheckCircle2 className="w-3.5 h-3.5 text-[#368A80]" />
      <span className="hidden sm:inline">Service ready</span>
    </div>
  );
};

export default HealthIndicator;
