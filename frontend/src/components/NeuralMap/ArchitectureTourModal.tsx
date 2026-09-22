import { useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  X,
  Compass,
  Layers,
  Zap,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import type { NeuralGraph } from './graphDataAdapter';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  graph: NeuralGraph;
  onStepChange: (stepIndex: number) => void;
}

export default function ArchitectureTourModal({
  isOpen,
  onClose,
  graph,
  onStepChange,
}: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const frontendCluster = graph.clusters.find(c => c.id === 'FRONTEND');
  const backendCluster = graph.clusters.find(c => c.id === 'BACKEND');
  const highRiskCount = graph.nodes.filter(
    n => ['high', 'critical'].includes(String(n.riskLevel).toLowerCase()) || n.hotspotScore >= 60
  ).length;

  const steps = [
    {
      title: 'Repository Architecture Universe',
      subtitle: `${graph.summary.totalModules} Source Modules Analyzed`,
      icon: <Compass className="w-5 h-5 text-cyan-400" />,
      content: `Welcome to the CodeOracle Neural Universe. Rather than an unorganized cloud of dots, your repository is rendered as a living architectural system organized into distinct subsystem constellations: Frontend, Backend, ML, and Database.`,
      targetName: 'ALL',
    },
    {
      title: 'Frontend Constellation',
      subtitle: `${frontendCluster?.count || 0} UI & Presentation Modules`,
      icon: <Layers className="w-5 h-5 text-sky-400" />,
      content: `The Frontend constellation encapsulates presentation components, pages, hooks, and client state. High-level entry points and critical UI hubs stand out with distinct semantic geometry and prominence.`,
      targetName: 'FRONTEND',
    },
    {
      title: 'Backend & Cross-Layer Highways',
      subtitle: `${backendCluster?.count || 0} Core Services & API Handlers`,
      icon: <Zap className="w-5 h-5 text-indigo-400" />,
      content: `API client calls transition through cross-layer highways directly into Backend routers, application services, and database persistence layers with verified directional import flows.`,
      targetName: 'BACKEND',
    },
    {
      title: 'Risk Landscape & Architectural Hotspots',
      subtitle: `${highRiskCount} High-Risk Modules Identified`,
      icon: <Flame className="w-5 h-5 text-red-400" />,
      content: `Energy halos indicate composite risk based on cyclomatic complexity, fan-in coupling, blast radius, and dependency cycles. Low-risk modules recede while critical hubs remain prominently signaled.`,
      targetName: 'RISK',
    },
    {
      title: 'Static Intelligence & AST Confidence',
      subtitle: `${graph.summary.fullAstPercentage}% Full AST Coverage`,
      icon: <ShieldCheck className="w-5 h-5 text-teal-400" />,
      content: `Every node's border communicates its AST parse status: solid borders for high-confidence AST extraction, dashed for partial fallbacks, and warning markers for unresolved dependencies.`,
      targetName: 'PARSE',
    },
  ];

  const step = steps[currentStep];

  const goTo = (idx: number) => {
    setCurrentStep(idx);
    onStepChange(idx);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Architecture Guided Tour"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-lg bg-[#091524]/95 border border-cyan-400/40 rounded-2xl shadow-2xl p-5 text-white backdrop-blur-md animate-[fade-up_200ms_ease-out]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
            {step.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <h3 className="font-bold text-sm text-white">{step.title}</h3>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          title="Exit Tour"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-white/75 mt-3 leading-relaxed">{step.content}</p>

      {/* Progress Dots */}
      <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/10">
        <div className="flex items-center gap-1.5">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStep ? 'w-6 bg-cyan-400' : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={() => goTo(currentStep - 1)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
          )}

          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => goTo(currentStep + 1)}
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black flex items-center gap-1 transition-colors shadow-sm"
            >
              Next <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1 transition-colors shadow-sm"
            >
              Finish Tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
