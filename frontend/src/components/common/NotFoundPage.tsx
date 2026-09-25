import React from 'react';
import { navigateTo } from '../../utils/navigation';
import { ArrowLeft, Home, Compass } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F5F1E9] text-[#181715] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#FFFDFC] border border-[#C8BEB0] shadow-sm flex items-center justify-center mb-6 text-[#4C4FD6]">
        <Compass className="w-8 h-8" />
      </div>

      <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-[#EAE9FB] text-[#4C4FD6] mb-3">
        404 NOT FOUND
      </span>

      <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#181715] mb-2">
        Page Not Found
      </h1>

      <p className="text-sm text-[#5C554D] max-w-[420px] mb-8 leading-relaxed">
        The requested path does not match any public or private workspace routes. You can return to the overview or open the analysis workspace.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => navigateTo('/')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFFDFC] hover:bg-[#ECE5DA] text-[#181715] font-semibold text-xs border border-[#C8BEB0] shadow-xs transition-all"
        >
          <Home className="w-4 h-4 text-[#5C554D]" />
          <span>Home Overview</span>
        </button>

        <button
          onClick={() => navigateTo('/workspace')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4C4FD6] hover:bg-[#3E41B8] text-white font-semibold text-xs shadow-sm transition-all"
        >
          <span>Open Workspace</span>
          <ArrowLeft className="w-4 h-4 rotate-180" />
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
