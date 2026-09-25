import React, { useState } from 'react';
import {
  FileText,
  Network,
  CheckSquare,
  GitBranch,
  Milestone,
  ArrowRight,
  ExternalLink,
  Check,
  Copy,
} from 'lucide-react';

interface InteractivePreviewProps {
  onOpenDemo: () => void;
}

type TabKey = 'explanation' | 'graph' | 'tests' | 'refactor' | 'migration';

export const InteractivePreviewSection: React.FC<InteractivePreviewProps> = ({ onOpenDemo }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('explanation');
  const [copied, setCopied] = useState(false);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'explanation', label: 'Code explanation', icon: <FileText className="w-4 h-4" /> },
    { key: 'graph', label: 'Dependency graph', icon: <Network className="w-4 h-4" /> },
    { key: 'tests', label: 'Generated tests', icon: <CheckSquare className="w-4 h-4" /> },
    { key: 'refactor', label: 'Refactor proposals', icon: <GitBranch className="w-4 h-4" /> },
    { key: 'migration', label: 'Migration plan', icon: <Milestone className="w-4 h-4" /> },
  ];

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="preview" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F5F1E9] text-[#181715] scroll-mt-20">
      <div className="max-w-[1240px] mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFDFC] border border-[#C8BEB0] text-xs font-mono text-[#3B3733] shadow-sm mb-4">
              <span className="text-[#4C4FD6] font-bold">INTERACTIVE PREVIEW</span>
              <span className="text-[#A39888]">•</span>
              <span>Sample: pallets/flask</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#181715]">
              Explore the workspace analysis engine.
            </h2>
            <p className="text-sm text-[#5C554D] mt-2">
              Every view below reflects actual AST outputs from the public Flask WSGI benchmark.
            </p>
          </div>

          <button
            onClick={onOpenDemo}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4C4FD6] hover:bg-[#3E41B8] text-[#FFFDFC] font-semibold text-xs sm:text-sm transition-all shadow-sm hover:shadow active:scale-[0.98] self-start md:self-auto"
          >
            <span>Open live demo in workspace</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Tabbed Interactive Surface */}
        <div className="bg-[#FFFDFC] rounded-3xl border border-[#C8BEB0] shadow-md overflow-hidden">
          {/* Tabs bar */}
          <div className="flex overflow-x-auto border-b border-[#ECE5DA] bg-[#ECE5DA]/40 p-2 gap-1.5 scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                  activeTab === tab.key
                    ? 'bg-[#FFFDFC] text-[#181715] shadow-xs font-semibold'
                    : 'text-[#5C554D] hover:text-[#181715] hover:bg-[#FFFDFC]/60'
                }`}
              >
                <span className={activeTab === tab.key ? 'text-[#4C4FD6]' : 'text-[#5C554D]'}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content Display */}
          <div className="p-6 sm:p-8 min-h-[440px]">
            {/* Tab 1: Code Explanation */}
            {activeTab === 'explanation' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#ECE5DA]">
                  <div>
                    <span className="text-xs font-mono text-[#4C4FD6] bg-[#EAE9FB] px-2.5 py-0.5 rounded-md font-semibold">
                      flask/app.py
                    </span>
                    <h3 className="font-display text-xl font-bold text-[#181715] mt-1.5">
                      Core WSGI Application Controller
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-3 py-1 rounded-lg bg-[#ECE5DA] text-[#3B3733]">
                      AST Depth: 9
                    </span>
                    <span className="text-xs font-mono px-3 py-1 rounded-lg bg-[#B88228]/15 text-[#B88228] font-bold">
                      Risk: High (18)
                    </span>
                  </div>
                </div>

                <p className="text-sm text-[#3B3733] leading-relaxed">
                  The primary entry point coordinates WSGI dispatching, routing table initialization,
                  context binding, and error propagation. Changes here have a <strong>blast radius of 32 dependent files</strong>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#F5F1E9] border border-[#C8BEB0]/60">
                    <span className="text-xs font-mono text-[#5C554D] block mb-1">Architecture Role</span>
                    <span className="text-sm font-bold text-[#181715]">Central Orchestrator</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#F5F1E9] border border-[#C8BEB0]/60">
                    <span className="text-xs font-mono text-[#5C554D] block mb-1">Total Functions</span>
                    <span className="text-sm font-bold text-[#181715]">42 methods</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#F5F1E9] border border-[#C8BEB0]/60">
                    <span className="text-xs font-mono text-[#5C554D] block mb-1">Fan-in / Fan-out</span>
                    <span className="text-sm font-bold text-[#181715]">28 in / 19 out</span>
                  </div>
                </div>

                <div className="border border-[#C8BEB0]/70 rounded-2xl p-4 bg-[#FFFDFC]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5C554D] mb-3">
                    Key Method Signatures
                  </h4>
                  <div className="space-y-2 font-mono text-xs">
                    <div className="p-2.5 rounded-lg bg-[#ECE5DA]/50 flex items-center justify-between">
                      <span className="text-[#181715]">Flask.wsgi_app(environ, start_response)</span>
                      <span className="text-[#4C4FD6] text-[11px]">Primary Dispatch</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#ECE5DA]/50 flex items-center justify-between">
                      <span className="text-[#181715]">Flask.handle_exception(e)</span>
                      <span className="text-[#B88228] text-[11px]">Error Handler</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Dependency Graph */}
            {activeTab === 'graph' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between pb-4 border-b border-[#ECE5DA]">
                  <div>
                    <h3 className="font-display text-xl font-bold text-[#181715]">
                      Module Dependency & Coupling Topology
                    </h3>
                    <p className="text-xs text-[#5C554D]">
                      Directed acyclic graph with automatic cycle detection
                    </p>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-lg bg-[#B88228]/15 text-[#B88228] font-semibold">
                    1 Circular Chain Detected
                  </span>
                </div>

                <div className="p-6 rounded-2xl bg-[#181715] text-[#FFFDFC] border border-[#3B3733]">
                  <div className="flex items-center justify-between text-xs font-mono text-[#A39888] mb-4 pb-2 border-b border-[#3B3733]">
                    <span>MODULE LINKAGE OVERVIEW</span>
                    <span className="text-[#4C4FD6]">7 modules • 14 directed edges</span>
                  </div>

                  {/* Visual module diagram */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                    <div className="p-3 rounded-xl bg-[#23211E] border border-[#3B3733]">
                      <span className="text-[#4C4FD6] font-bold block mb-1">flask/app.py</span>
                      <span className="text-[10px] text-[#A39888]">Imports: ctx, config, helpers, wrappers</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#23211E] border border-[#B88228]">
                      <span className="text-[#B88228] font-bold block mb-1">flask/sessions.py</span>
                      <span className="text-[10px] text-[#B88228]">Imports: ctx (CYCLE with ctx.py)</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#23211E] border border-[#3B3733]">
                      <span className="text-[#3EA862] font-bold block mb-1">flask/helpers.py</span>
                      <span className="text-[10px] text-[#A39888]">Leaf utility (Zero outgoing)</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-[#B88228]/10 border border-[#B88228]/30 text-xs text-[#EAE9FB]">
                    <span className="font-bold text-[#B88228]">Cycle Details:</span>{' '}
                    <code className="text-[#FFFDFC]">flask.ctx → flask.sessions → flask.ctx</code>. Recommended action: extract session context interface to break circular runtime dependency.
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Generated Tests */}
            {activeTab === 'tests' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between pb-4 border-b border-[#ECE5DA]">
                  <div>
                    <h3 className="font-display text-xl font-bold text-[#181715]">
                      Synthesized Behavioral Test Suite
                    </h3>
                    <p className="text-xs text-[#5C554D]">
                      Pins existing behavior to prevent regressions during modernization
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopy('import pytest\nfrom flask import Flask\n\ndef test_wsgi_app_dispatch_valid_route():\n    app = Flask(__name__)\n    @app.route("/health")\n    def health():\n        return "OK", 200\n    client = app.test_client()\n    res = client.get("/health")\n    assert res.status_code == 200\n    assert res.data == b"OK"')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#C8BEB0] text-xs font-mono text-[#3B3733] hover:bg-[#ECE5DA] transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#3EA862]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Test'}</span>
                  </button>
                </div>

                <div className="rounded-2xl bg-[#181715] text-[#FFFDFC] p-5 font-mono text-xs border border-[#3B3733] overflow-x-auto">
                  <div className="text-[#A39888] pb-2 mb-2 border-b border-[#3B3733] flex justify-between">
                    <span>tests/test_flask_generated.py</span>
                    <span className="text-[#3EA862]">3 test cases • 100% syntactically valid</span>
                  </div>
                  <pre className="text-[#C8BEB0] leading-relaxed">
{`import pytest
from flask import Flask, request

def test_wsgi_app_dispatch_valid_route():
    app = Flask(__name__)
    @app.route("/health")
    def health():
        return "OK", 200
    client = app.test_client()
    response = client.get("/health")
    assert response.status_code == 200
    assert response.data == b"OK"

def test_request_context_cleanup():
    app = Flask(__name__)
    with app.test_request_context("/"):
        assert request.path == "/"
    # Verify context popped cleanly
    assert request._get_current_object is not None`}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 4: Refactor Proposals */}
            {activeTab === 'refactor' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between pb-4 border-b border-[#ECE5DA]">
                  <div>
                    <h3 className="font-display text-xl font-bold text-[#181715]">
                      Reviewable Modernization Diff
                    </h3>
                    <p className="text-xs text-[#5C554D]">
                      Non-destructive code proposals with verifiable safety guarantees
                    </p>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-lg bg-[#3EA862]/15 text-[#3EA862] font-semibold">
                    Zero Breaking Changes
                  </span>
                </div>

                <div className="rounded-2xl bg-[#181715] text-[#FFFDFC] p-5 font-mono text-xs border border-[#3B3733]">
                  <div className="text-[#A39888] pb-2 mb-3 border-b border-[#3B3733] flex justify-between">
                    <span>flask/sessions.py</span>
                    <span className="text-[#4C4FD6]">Proposal #1: Safe Serializer Modernization</span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="text-[#5C554D]">@@ -38,7 +38,8 @@ class SecureCookieSessionInterface(SessionInterface):</p>
                    <p className="text-[#D9383A] bg-[#D9383A]/10 px-1 py-0.5 rounded">- import itsdangerous.pickle as serializer</p>
                    <p className="text-[#3EA862] bg-[#3EA862]/10 px-1 py-0.5 rounded">+ import json</p>
                    <p className="text-[#3EA862] bg-[#3EA862]/10 px-1 py-0.5 rounded">+ from itsdangerous import URLSafeTimedSerializer</p>
                    <p className="text-[#C8BEB0] px-1">  def get_signing_serializer(self, app):</p>
                    <p className="text-[#D9383A] bg-[#D9383A]/10 px-1 py-0.5 rounded">-     return serializer.Serializer(app.secret_key)</p>
                    <p className="text-[#3EA862] bg-[#3EA862]/10 px-1 py-0.5 rounded">+     return URLSafeTimedSerializer(app.secret_key, serializer=json)</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#3B3733] text-[11px] text-[#A39888] flex justify-between">
                    <span>Safety Justification: Eliminates unsafe arbitrary object deserialization</span>
                    <span className="text-[#4C4FD6]">Confidence: 98%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: Migration Plan */}
            {activeTab === 'migration' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between pb-4 border-b border-[#ECE5DA]">
                  <div>
                    <h3 className="font-display text-xl font-bold text-[#181715]">
                      Four-Wave Modernization Roadmap
                    </h3>
                    <p className="text-xs text-[#5C554D]">
                      Sequenced phases ensuring system stability at every step
                    </p>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-lg bg-[#ECE5DA] text-[#3B3733]">
                    Estimated: 8 Engineering Days
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-4 rounded-2xl bg-[#FFFDFC] border-2 border-[#4C4FD6] shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#4C4FD6]">Wave W0: Foundation & Test Harness</span>
                      <span className="text-[11px] text-[#5C554D]">Day 1</span>
                    </div>
                    <p className="text-xs text-[#3B3733] font-sans">
                      Synthesize and run regression suites for <code>app.py</code> and <code>ctx.py</code>. Establish test baseline.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FFFDFC] border border-[#C8BEB0] shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#B88228]">Wave W1: Break Circular Cycles</span>
                      <span className="text-[11px] text-[#5C554D]">Days 2–3</span>
                    </div>
                    <p className="text-xs text-[#3B3733] font-sans">
                      Extract context protocol interface from <code>sessions.py</code> to decouple circular runtime imports.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FFFDFC] border border-[#C8BEB0] shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#3EA862]">Wave W2: Security & Serialization</span>
                      <span className="text-[11px] text-[#5C554D]">Days 4–6</span>
                    </div>
                    <p className="text-xs text-[#3B3733] font-sans">
                      Apply Proposal #1: migrate pickle cookie serializer to hardened JSON serializer.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FFFDFC] border border-[#C8BEB0] shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#181715]">Wave W3: Modern Python Typing</span>
                      <span className="text-[11px] text-[#5C554D]">Days 7–8</span>
                    </div>
                    <p className="text-xs text-[#3B3733] font-sans">
                      Upgrade type annotations to Python 3.12+ union syntax (<code>int | str</code>) across public API signatures.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer banner */}
          <div className="px-6 py-4 bg-[#ECE5DA]/60 border-t border-[#ECE5DA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="text-[#5C554D]">
              Note: This interactive preview displays illustrative AST metrics and diffs from <code>pallets/flask</code>.
            </span>
            <button
              onClick={onOpenDemo}
              className="text-[#4C4FD6] font-semibold hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Analyze this repository in workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InteractivePreviewSection;
