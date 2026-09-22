import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { quadtree } from 'd3-quadtree';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  Compass,
  ChevronRight,
  Zap,
} from 'lucide-react';
import type {
  ClusterMode,
  DensityLevel,
  FocusDepth,
  NeuralGraph,
  NeuralNode,
  NodeShape,
  VisualMode,
} from './graphDataAdapter';
import {
  buildNodeBreadcrumb,
  CONSTELLATION_CENTROIDS,
} from './graphDataAdapter';
import { useForceSimulation } from './useForceSimulation';

interface Props {
  graph: NeuralGraph;
  search: string;
  language: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
  reset: number;
  visualMode: VisualMode;
  focusDepth: FocusDepth;
  clusterMode: ClusterMode;
  quickFilter: 'all' | 'high_risk' | 'partial' | 'entry_points' | 'unresolved';
  showIsolated: boolean;
  impactPreviewNode?: string | null;
  density?: DensityLevel;
  isolatedPath?: string[] | null;
  onClearIsolatedPath?: () => void;
}

// Language color palette for inner accent cores
const LANGUAGE_COLORS: Record<string, string> = {
  python: '#3B82F6',
  typescript: '#38BDF8',
  javascript: '#FBBF24',
  html: '#F97316',
  css: '#EC4899',
  sql: '#10B981',
  shell: '#84CC16',
  other: '#94A3B8',
};

// Custom shape drawing on Canvas
function drawNodeShape(
  ctx: CanvasRenderingContext2D,
  shape: NodeShape,
  x: number,
  y: number,
  r: number
) {
  ctx.beginPath();
  switch (shape) {
    case 'diamond': {
      // Entry point: prominent diamond
      const d = r * 1.35;
      ctx.moveTo(x, y - d);
      ctx.lineTo(x + d, y);
      ctx.lineTo(x, y + d);
      ctx.lineTo(x - d, y);
      ctx.closePath();
      break;
    }
    case 'service': {
      // Service: rounded rectangle
      const w = r * 2.2;
      const h = r * 1.8;
      const cr = Math.min(4, r * 0.35);
      const rx = x - w / 2;
      const ry = y - h / 2;
      ctx.moveTo(rx + cr, ry);
      ctx.lineTo(rx + w - cr, ry);
      ctx.quadraticCurveTo(rx + w, ry, rx + w, ry + cr);
      ctx.lineTo(rx + w, ry + h - cr);
      ctx.quadraticCurveTo(rx + w, ry + h, rx + w - cr, ry + h);
      ctx.lineTo(rx + cr, ry + h);
      ctx.quadraticCurveTo(rx, ry + h, rx, ry + h - cr);
      ctx.lineTo(rx, ry + cr);
      ctx.quadraticCurveTo(rx, ry, rx + cr, ry);
      ctx.closePath();
      break;
    }
    case 'api': {
      // API / Router: hexagon
      const d = r * 1.25;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 6;
        const px = x + d * Math.cos(angle);
        const py = y + d * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'ml': {
      // ML model: triangle
      const d = r * 1.35;
      ctx.moveTo(x, y - d);
      ctx.lineTo(x + d * 0.9, y + d * 0.8);
      ctx.lineTo(x - d * 0.9, y + d * 0.8);
      ctx.closePath();
      break;
    }
    case 'db': {
      // Database: pentagon
      const d = r * 1.25;
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const px = x + d * Math.cos(angle);
        const py = y + d * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'utility': {
      // Utility: square
      const s = r * 1.8;
      ctx.rect(x - s / 2, y - s / 2, s, s);
      break;
    }
    case 'store':
    case 'config': {
      // Config/Store: slender diamond
      const dx = r * 1.5;
      const dy = r * 0.9;
      ctx.moveTo(x, y - dy);
      ctx.lineTo(x + dx, y);
      ctx.lineTo(x, y + dy);
      ctx.lineTo(x - dx, y);
      ctx.closePath();
      break;
    }
    case 'ui':
    case 'circle':
    default: {
      // UI / Normal: smooth circle
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;
    }
  }
}

export default function ForceGraphCanvas({
  graph,
  search,
  language,
  selected,
  onSelect,
  reset,
  visualMode,
  focusDepth,
  clusterMode,
  quickFilter,
  showIsolated,
  impactPreviewNode,
  density = 'balanced',
  isolatedPath = null,
  onClearIsolatedPath,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { nodes, revision, settled } = useForceSimulation(graph, clusterMode, visualMode);

  const [size, setSize] = useState({ width: 800, height: 620 });
  const [view, setView] = useState({ x: 400, y: 310, k: 1 });
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);

  // Smooth camera animation state
  const targetView = useRef<{ x: number; y: number; k: number } | null>(null);
  const animFrame = useRef<number>(0);

  // Selection shockwave pulse effect
  const selectionPulse = useRef<{ id: string; startTime: number } | null>(null);

  // Pointers for panning / dragging
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ x: 0, y: 0, moved: false });

  // Fast ID lookup map
  const byId = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  // Spatial search quadtree for fast hit-testing
  const tree = useMemo(
    () => quadtree<NeuralNode>().x(n => n.x!).y(n => n.y!).addAll(nodes),
    [nodes, revision]
  );

  // Filter matching predicate
  const matchesFilter = useCallback(
    (n: NeuralNode) => {
      if (search && !n.label.toLowerCase().includes(search.toLowerCase())) return false;
      if (language !== 'all' && n.language !== language) return false;

      if (!showIsolated && n.fanIn === 0 && n.fanOut === 0) return false;

      if (quickFilter === 'high_risk') {
        if (!['high', 'critical'].includes(String(n.riskLevel).toLowerCase()) && n.hotspotScore < 50) {
          return false;
        }
      } else if (quickFilter === 'partial') {
        if (n.parseStatus !== 'partial') return false;
      } else if (quickFilter === 'entry_points') {
        if (!n.isEntryPoint) return false;
      } else if (quickFilter === 'unresolved') {
        if (n.nodeState !== 'unresolved' && n.unresolvedImports === 0) return false;
      }

      // Density filter: in minimal mode, show anchors and hubs only
      if (density === 'minimal') {
        if (n.visualTier === 'micro') return false;
      }

      return true;
    },
    [search, language, showIsolated, quickFilter, density]
  );

  const focusId = hoverNodeId || selected;

  // Track selection change for smooth camera fly-to & pulse
  useEffect(() => {
    if (selected) {
      selectionPulse.current = { id: selected, startTime: performance.now() };
      const n = byId.get(selected);
      if (n && Number.isFinite(n.x) && Number.isFinite(n.y)) {
        // Smooth camera flight toward node
        const targetK = Math.max(1.2, Math.min(2.2, view.k * 1.3));
        targetView.current = {
          x: size.width / 2 - n.x! * targetK,
          y: size.height / 2 - n.y! * targetK,
          k: targetK,
        };
      }
    }
  }, [selected, byId, size]);

  // Smooth camera animation loop (350-600ms cubic ease)
  useEffect(() => {
    let active = true;
    const animateCamera = () => {
      if (!active) return;
      if (targetView.current) {
        const tv = targetView.current;
        const dx = tv.x - view.x;
        const dy = tv.y - view.y;
        const dk = tv.k - view.k;

        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(dk) < 0.005) {
          setView(tv);
          targetView.current = null;
        } else {
          setView(v => ({
            x: v.x + dx * 0.18,
            y: v.y + dy * 0.18,
            k: v.k + dk * 0.18,
          }));
        }
      }
      animFrame.current = requestAnimationFrame(animateCamera);
    };

    animFrame.current = requestAnimationFrame(animateCamera);
    return () => {
      active = false;
      cancelAnimationFrame(animFrame.current);
    };
  }, [view]);

  // Neighborhood sets for 1-hop, 2-hop, and 3-hop focus lenses
  const { directNeighbors, secondHopNeighbors, thirdHopNeighbors } = useMemo(() => {
    const hop1 = new Set<string>();
    const hop2 = new Set<string>();
    const hop3 = new Set<string>();
    if (!focusId) {
      return { directNeighbors: hop1, secondHopNeighbors: hop2, thirdHopNeighbors: hop3 };
    }

    hop1.add(focusId);
    hop2.add(focusId);
    hop3.add(focusId);

    // 1-Hop
    for (const link of graph.links) {
      if (link.source === focusId) hop1.add(link.target);
      if (link.target === focusId) hop1.add(link.source);
    }

    // 2-Hop
    if (focusDepth === '2-hop' || focusDepth === '3-hop' || focusDepth === 'all') {
      for (const n of hop1) hop2.add(n);
      for (const link of graph.links) {
        if (hop1.has(link.source)) hop2.add(link.target);
        if (hop1.has(link.target)) hop2.add(link.source);
      }
    }

    // 3-Hop
    if (focusDepth === '3-hop' || focusDepth === 'all') {
      for (const n of hop2) hop3.add(n);
      for (const link of graph.links) {
        if (hop2.has(link.source)) hop3.add(link.target);
        if (hop2.has(link.target)) hop3.add(link.source);
      }
    }

    return { directNeighbors: hop1, secondHopNeighbors: hop2, thirdHopNeighbors: hop3 };
  }, [graph.links, focusId, focusDepth]);

  // Downstream subtree set for Entry Points visual mode
  const downstreamOfFocus = useMemo(() => {
    const set = new Set<string>();
    if (!focusId) return set;
    set.add(focusId);
    const queue = [focusId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const link of graph.links) {
        if (link.source === curr && !set.has(link.target)) {
          set.add(link.target);
          queue.push(link.target);
        }
      }
    }
    return set;
  }, [graph.links, focusId]);

  // Direct and transitive impact sets with affected entry points for Impact Mode
  const { directImpact, transitiveImpact, affectedEntryPoints } = useMemo(() => {
    const dSet = new Set<string>();
    const tSet = new Set<string>();
    const epSet = new Set<string>();
    const target = impactPreviewNode || (selected && focusId === selected ? selected : null);
    if (!target) return { directImpact: dSet, transitiveImpact: tSet, affectedEntryPoints: epSet };

    // Direct callers (upstream)
    for (const link of graph.links) {
      if (link.target === target) {
        dSet.add(link.source);
        const srcNode = byId.get(link.source);
        if (srcNode?.isEntryPoint) epSet.add(link.source);
      }
    }

    // Transitive callers
    const queue = [...dSet];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const link of graph.links) {
        if (
          link.target === curr &&
          !dSet.has(link.source) &&
          !tSet.has(link.source) &&
          link.source !== target
        ) {
          tSet.add(link.source);
          queue.push(link.source);
          const srcNode = byId.get(link.source);
          if (srcNode?.isEntryPoint) epSet.add(link.source);
        }
      }
    }

    return { directImpact: dSet, transitiveImpact: tSet, affectedEntryPoints: epSet };
  }, [graph.links, impactPreviewNode, selected, focusId, byId]);

  // Isolated path set for Path Tracing
  const isolatedPathSet = useMemo(() => {
    if (!isolatedPath) return null;
    return new Set(isolatedPath);
  }, [isolatedPath]);

  // Compute cluster bounding hulls & atmospheric regions
  const clusterHulls = useMemo(() => {
    const hulls = new Map<
      string,
      { minX: number; maxX: number; minY: number; maxY: number; count: number; color: string; desc: string }
    >();
    for (const n of nodes) {
      if (!Number.isFinite(n.x) || !Number.isFinite(n.y) || !matchesFilter(n)) continue;
      const key = n.clusterLabel || 'BACKEND';
      const conf = CONSTELLATION_CENTROIDS[key] || {
        color: '#0B3D91',
        desc: 'Subsystem',
      };
      const existing = hulls.get(key);

      if (!existing) {
        hulls.set(key, {
          minX: n.x!,
          maxX: n.x!,
          minY: n.y!,
          maxY: n.y!,
          count: 1,
          color: conf.color,
          desc: conf.desc,
        });
      } else {
        existing.minX = Math.min(existing.minX, n.x!);
        existing.maxX = Math.max(existing.maxX, n.x!);
        existing.minY = Math.min(existing.minY, n.y!);
        existing.maxY = Math.max(existing.maxY, n.y!);
        existing.count++;
      }
    }
    return hulls;
  }, [nodes, matchesFilter]);

  // Viewport bounds fitting
  const fit = useCallback(() => {
    if (!nodes.length) return;
    const xs = nodes.map(n => (visualMode === 'flow' ? n.flowX : n.x!)).filter(Number.isFinite);
    const ys = nodes.map(n => (visualMode === 'flow' ? n.flowY : n.y!)).filter(Number.isFinite);
    if (!xs.length || !ys.length) return;

    const minX = Math.min(...xs),
      maxX = Math.max(...xs);
    const minY = Math.min(...ys),
      maxY = Math.max(...ys);
    const k = Math.max(
      0.08,
      Math.min(
        1.4,
        (size.width - 140) / Math.max(1, maxX - minX + 80),
        (size.height - 140) / Math.max(1, maxY - minY + 80)
      )
    );
    setView({
      x: size.width / 2 - ((minX + maxX) / 2) * k,
      y: size.height / 2 - ((minY + maxY) / 2) * k,
      k,
    });
  }, [nodes, size, visualMode]);

  // Center on selected node
  const centerSelected = useCallback(() => {
    if (!selected) return;
    const n = byId.get(selected);
    if (!n || !Number.isFinite(n.x) || !Number.isFinite(n.y)) return;
    setView(v => ({
      ...v,
      x: size.width / 2 - n.x! * v.k,
      y: size.height / 2 - n.y! * v.k,
    }));
  }, [selected, byId, size]);

  // Fly to specific constellation
  const flyToConstellation = useCallback(
    (constellationName: string) => {
      const hull = clusterHulls.get(constellationName);
      if (!hull) return;
      const cx = (hull.minX + hull.maxX) / 2;
      const cy = (hull.minY + hull.maxY) / 2;
      const spanX = hull.maxX - hull.minX + 80;
      const spanY = hull.maxY - hull.minY + 80;
      const k = Math.max(0.6, Math.min(1.8, (size.width - 80) / spanX, (size.height - 80) / spanY));

      targetView.current = {
        x: size.width / 2 - cx * k,
        y: size.height / 2 - cy * k,
        k,
      };
    },
    [clusterHulls, size]
  );

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    if (canvas.current) observer.observe(canvas.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fit();
  }, [fit, reset, settled, visualMode]);

  // Mouse wheel zoom
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setView(v => {
        const k = Math.max(0.08, Math.min(5, v.k * Math.exp(-e.deltaY * 0.0012)));
        return {
          x: x - ((x - v.x) * k) / v.k,
          y: y - ((y - v.y) * k) / v.k,
          k,
        };
      });
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape') {
        onSelect(null);
        if (onClearIsolatedPath) onClearIsolatedPath();
      } else if (e.key === 'f' || e.key === 'F') {
        fit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelect, fit, onClearIsolatedPath]);

  // Main Canvas Render Loop
  useEffect(() => {
    let frameId = 0;
    const draw = () => {
      if (document.hidden) return;
      const element = canvas.current;
      const ctx = element?.getContext('2d');
      if (!element || !ctx) return;

      const dpr = window.devicePixelRatio || 1;
      element.width = Math.round(size.width * dpr);
      element.height = Math.round(size.height * dpr);
      ctx.scale(dpr, dpr);

      const now = performance.now();

      // 1. Deep Ocean Canvas Surface with atmospheric radial gradient
      const bgGrad = ctx.createRadialGradient(
        size.width / 2,
        size.height / 2,
        40,
        size.width / 2,
        size.height / 2,
        Math.max(size.width, size.height) * 0.8
      );
      bgGrad.addColorStop(0, '#0A2033'); // Cool deep ocean blue
      bgGrad.addColorStop(0.5, '#071625');
      bgGrad.addColorStop(1, '#040C16'); // Void depth
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, size.width, size.height);

      ctx.save();
      ctx.translate(view.x, view.y);
      ctx.scale(view.k, view.k);

      // Faint coordinate matrix grid points
      const gridSpacing = 160;
      const startX = Math.floor((-view.x / view.k) / gridSpacing) * gridSpacing - gridSpacing;
      const endX = Math.ceil(((size.width - view.x) / view.k) / gridSpacing) * gridSpacing + gridSpacing;
      const startY = Math.floor((-view.y / view.k) / gridSpacing) * gridSpacing - gridSpacing;
      const endY = Math.ceil(((size.height - view.y) / view.k) / gridSpacing) * gridSpacing + gridSpacing;

      ctx.fillStyle = '#38BDF8';
      ctx.globalAlpha = 0.08;
      for (let gx = startX; gx <= endX; gx += gridSpacing) {
        for (let gy = startY; gy <= endY; gy += gridSpacing) {
          ctx.fillRect(gx - 1 / view.k, gy - 1 / view.k, 2 / view.k, 2 / view.k);
        }
      }
      ctx.globalAlpha = 1.0;

      // 2. Atmospheric Subsystem Constellation Boundaries & Ambient Glow
      if (visualMode !== 'flow' && clusterHulls.size > 0) {
        for (const [key, hull] of clusterHulls.entries()) {
          const padding = 55;
          const rx = hull.minX - padding;
          const ry = hull.minY - padding;
          const rw = Math.max(120, hull.maxX - hull.minX + padding * 2);
          const rh = Math.max(120, hull.maxY - hull.minY + padding * 2);
          const cx = rx + rw / 2;
          const cy = ry + rh / 2;

          ctx.save();

          // Organic low-opacity radial field
          const radialGlow = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(rw, rh) * 0.65);
          radialGlow.addColorStop(0, `${hull.color}15`);
          radialGlow.addColorStop(0.7, `${hull.color}05`);
          radialGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = radialGlow;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(rw, rh) * 0.65, 0, Math.PI * 2);
          ctx.fill();

          // Soft translucent boundary hull
          ctx.globalAlpha = 0.04;
          ctx.fillStyle = hull.color;
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(rx, ry, rw, rh, 36) : ctx.rect(rx, ry, rw, rh);
          ctx.fill();

          ctx.globalAlpha = 0.18;
          ctx.strokeStyle = hull.color;
          ctx.lineWidth = 1.2 / view.k;
          ctx.stroke();

          // Subsystem header: visible when camera is at high/mid zoom levels
          const headerAlpha = Math.max(0, Math.min(0.9, (1.8 - view.k) * 1.2));
          if (headerAlpha > 0.05) {
            ctx.globalAlpha = headerAlpha;
            ctx.fillStyle = hull.color;
            ctx.font = `bold ${Math.max(12, 15 / view.k)}px monospace`;
            ctx.textAlign = 'left';
            ctx.fillText(`✦ ${key}`, rx + 20, ry + 26);

            ctx.font = `${Math.max(10, 11 / view.k)}px sans-serif`;
            ctx.fillStyle = '#94A3B8';
            ctx.fillText(`${hull.count} modules · ${hull.desc}`, rx + 20, ry + 42);
          }
          ctx.restore();
        }
      }

      // 3. Architecture Cross-Layer Highways (e.g. FRONTEND -> BACKEND)
      if (visualMode !== 'flow' && graph.highways && graph.highways.length > 0) {
        for (const hw of graph.highways) {
          const srcHull = clusterHulls.get(hw.sourceCluster);
          const tgtHull = clusterHulls.get(hw.targetCluster);
          if (!srcHull || !tgtHull) continue;

          const sx = (srcHull.minX + srcHull.maxX) / 2;
          const sy = (srcHull.minY + srcHull.maxY) / 2;
          const tx = (tgtHull.minX + tgtHull.maxX) / 2;
          const ty = (tgtHull.minY + tgtHull.maxY) / 2;

          ctx.save();
          ctx.globalAlpha = 0.25;
          ctx.strokeStyle = '#3BA7F2';
          ctx.lineWidth = Math.min(5, Math.max(2, (hw.count / 10) / view.k));
          ctx.setLineDash([8 / view.k, 6 / view.k]);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 4. Edges & Flow Particles
      const flowT = (now % 2200) / 2200; // Particle time [0..1]

      for (const link of graph.links) {
        const a = byId.get(link.source);
        const b = byId.get(link.target);
        if (!a || !b) continue;

        const aVisible = matchesFilter(a);
        const bVisible = matchesFilter(b);
        if (!aVisible || !bVisible) continue;

        const ax = visualMode === 'flow' ? a.flowX : a.x!;
        const ay = visualMode === 'flow' ? a.flowY : a.y!;
        const bx = visualMode === 'flow' ? b.flowX : b.x!;
        const by = visualMode === 'flow' ? b.flowY : b.y!;

        const isDirectConnection =
          focusId && (link.source === focusId || link.target === focusId);
        const is2HopConnection =
          focusId && directNeighbors.has(link.source) && directNeighbors.has(link.target);
        const isPathLink =
          isolatedPathSet && (isolatedPathSet.has(link.source) && isolatedPathSet.has(link.target));

        let alpha = 0.12;
        let strokeColor = '#64748B';
        let lineWidth = 0.8 / view.k;

        if (isolatedPathSet) {
          if (isPathLink) {
            alpha = 1.0;
            strokeColor = '#06B6D4'; // Bright Cyan
            lineWidth = 2.8 / view.k;
          } else {
            alpha = 0.03;
          }
        } else if (focusId) {
          if (isDirectConnection) {
            alpha = 0.95;
            strokeColor = selected === focusId ? '#38BDF8' : '#7FE7D6';
            lineWidth = 2.2 / view.k;
          } else if (focusDepth === '2-hop' && is2HopConnection) {
            alpha = 0.55;
            strokeColor = '#818CF8';
            lineWidth = 1.4 / view.k;
          } else if (focusDepth === '1-hop') {
            alpha = 0.02;
          } else {
            alpha = 0.05;
          }
        }

        // Impact Mode edge highlighting
        if (directImpact.has(link.source) || directImpact.has(link.target)) {
          alpha = 0.92;
          strokeColor = '#F59E0B';
          lineWidth = 2.2 / view.k;
        } else if (transitiveImpact.has(link.source) || transitiveImpact.has(link.target)) {
          alpha = 0.65;
          strokeColor = '#FBBF24';
          lineWidth = 1.6 / view.k;
        }

        // Signal Flow / Entry points edge highlighting
        if (visualMode === 'flow' || visualMode === 'entry_points') {
          if (downstreamOfFocus.has(link.source) && downstreamOfFocus.has(link.target)) {
            strokeColor = '#34D399';
            alpha = 0.88;
            lineWidth = 1.8 / view.k;
          }
        }

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;

        // Line dashing by dependency semantic kind
        if (link.type === 'type-only' || link.kind === 'type_only_import') {
          ctx.setLineDash([4 / view.k, 4 / view.k]);
        } else if (link.kind === 'dynamic_import') {
          ctx.setLineDash([2 / view.k, 4 / view.k]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();

        // 5. Flow Particles: animate light pulse only when link is actively highlighted
        const shouldAnimateFlow =
          (isDirectConnection && selected) ||
          (isPathLink) ||
          (visualMode === 'flow' && downstreamOfFocus.has(link.source)) ||
          (impactPreviewNode && directImpact.has(link.source));

        if (shouldAnimateFlow) {
          const px = ax + (bx - ax) * flowT;
          const py = ay + (by - ay) * flowT;

          ctx.save();
          ctx.setLineDash([]);
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = '#7FE7D6';
          ctx.beginPath();
          ctx.arc(px, py, Math.max(2.5, 3.5 / view.k), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.setLineDash([]);

      // 6. Impact Ripple Propagation Effect
      if (impactPreviewNode) {
        const impactSource = byId.get(impactPreviewNode);
        if (impactSource && Number.isFinite(impactSource.x) && Number.isFinite(impactSource.y)) {
          const t = (now % 3000) / 3000;
          ctx.save();
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 1.5 / view.k;
          ctx.globalAlpha = Math.max(0, 0.7 * (1 - t));
          ctx.beginPath();
          ctx.arc(impactSource.x!, impactSource.y!, 40 + t * 240, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 7. Render Nodes
      const renderedLabels: { x: number; y: number; width: number; height: number }[] = [];

      for (const n of nodes) {
        if (!matchesFilter(n)) continue;

        const nx = visualMode === 'flow' ? n.flowX : n.x!;
        const ny = visualMode === 'flow' ? n.flowY : n.y!;
        if (!Number.isFinite(nx) || !Number.isFinite(ny)) continue;

        const isSelected = selected === n.id;
        const isHovered = hoverNodeId === n.id;
        const isDirectNeighbor = directNeighbors.has(n.id);
        const is2HopNeighbor = secondHopNeighbors.has(n.id);
        const isInIsolatedPath = isolatedPathSet ? isolatedPathSet.has(n.id) : true;

        // Base node alpha & scaling
        let nodeAlpha = 1.0;
        let scale = 1.0;

        if (isolatedPathSet) {
          if (!isInIsolatedPath) nodeAlpha = 0.12;
        } else if (focusId) {
          if (isSelected || isHovered) {
            scale = 1.18;
            nodeAlpha = 1.0;
          } else if (isDirectNeighbor) {
            scale = 1.06;
            nodeAlpha = 0.95;
          } else if (focusDepth === '2-hop' && is2HopNeighbor) {
            nodeAlpha = 0.65;
          } else if (focusDepth === '1-hop') {
            nodeAlpha = 0.12;
          } else {
            nodeAlpha = 0.2;
          }
        }

        // RISK Mode: fade low risk, highlight high/critical
        if (visualMode === 'risk') {
          const rL = String(n.riskLevel).toLowerCase();
          if (rL === 'low') {
            nodeAlpha = Math.min(nodeAlpha, 0.35);
          } else if (rL === 'critical' || rL === 'high') {
            nodeAlpha = 1.0;
            scale = Math.max(scale, 1.15);
          }
        }

        if (affectedEntryPoints.has(n.id)) {
          scale = Math.max(scale, 1.25);
        }

        const r = n.radius * scale;

        // A. Node Halo: Overall Risk Encoding
        const rL = String(n.riskLevel).toLowerCase();
        if (rL === 'critical') {
          ctx.save();
          ctx.globalAlpha = nodeAlpha * 0.45;
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.arc(nx, ny, r + 9 / view.k, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = nodeAlpha * 0.25;
          ctx.beginPath();
          ctx.arc(nx, ny, r + 15 / view.k, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (rL === 'high') {
          ctx.save();
          ctx.globalAlpha = nodeAlpha * 0.35;
          ctx.fillStyle = '#F97316';
          ctx.beginPath();
          ctx.arc(nx, ny, r + 7 / view.k, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (rL === 'medium') {
          ctx.save();
          ctx.globalAlpha = nodeAlpha * 0.2;
          ctx.fillStyle = '#FBBF24';
          ctx.beginPath();
          ctx.arc(nx, ny, r + 4 / view.k, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // B. Selected Node Concentric Aura (Gravity Well)
        if (isSelected) {
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = '#7FE7D6';
          ctx.lineWidth = 2.0 / view.k;
          ctx.beginPath();
          ctx.arc(nx, ny, r + 8 / view.k, 0, Math.PI * 2);
          ctx.stroke();

          // Selection Shockwave Pulse (one subtle pulse)
          if (selectionPulse.current && selectionPulse.current.id === n.id) {
            const pulseAge = (now - selectionPulse.current.startTime) / 600;
            if (pulseAge < 1.0) {
              ctx.globalAlpha = Math.max(0, 0.8 * (1 - pulseAge));
              ctx.strokeStyle = '#38BDF8';
              ctx.lineWidth = 1.5 / view.k;
              ctx.beginPath();
              ctx.arc(nx, ny, r + pulseAge * 35 / view.k, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
          ctx.restore();
        }

        // C. Draw Node Body (Shape = Module Role)
        ctx.save();
        ctx.globalAlpha = nodeAlpha;

        // Node fill color based on state & constellation
        let fillColor = '#1E293B';
        if (n.isEntryPoint) {
          fillColor = '#0F766E'; // Teal Entry Point
        } else if (n.nodeState === 'failed') {
          fillColor = '#7F1D1D';
        } else if (n.nodeState === 'unresolved') {
          fillColor = '#78350F';
        } else if (n.clusterLabel === 'FRONTEND') {
          fillColor = '#0284C7';
        } else if (n.clusterLabel === 'ML') {
          fillColor = '#7E22CE';
        } else if (n.clusterLabel === 'DATABASE') {
          fillColor = '#047857';
        } else {
          fillColor = '#1D4ED8'; // Backend
        }

        ctx.fillStyle = fillColor;
        drawNodeShape(ctx, n.shape, nx, ny, r);
        ctx.fill();

        // D. Node Border = Analysis Confidence & AST Quality
        let strokeColor = '#FFFFFF';
        let borderDash: number[] = [];

        if (n.parseStatus === 'full') {
          strokeColor = isSelected ? '#7FE7D6' : '#E2E8F0';
          borderDash = [];
        } else if (n.parseStatus === 'partial') {
          strokeColor = '#FBBF24';
          borderDash = [3 / view.k, 2 / view.k];
        } else if (n.parseStatus === 'fallback') {
          strokeColor = '#F97316';
          borderDash = [1.5 / view.k, 2 / view.k];
        } else {
          strokeColor = '#EF4444';
          borderDash = [4 / view.k, 2 / view.k];
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = (isSelected ? 2.5 : 1.2) / view.k;
        ctx.setLineDash(borderDash);
        drawNodeShape(ctx, n.shape, nx, ny, r);
        ctx.stroke();
        ctx.setLineDash([]);

        // E. Inner Core = Language Identification Accent
        const langColor = LANGUAGE_COLORS[n.language] || '#94A3B8';
        ctx.fillStyle = langColor;
        ctx.beginPath();
        ctx.arc(nx, ny, Math.max(1.8, r * 0.3), 0, Math.PI * 2);
        ctx.fill();

        // F. Shield Icon for Protected Nodes in Impact Mode
        if (impactPreviewNode && directImpact.has(n.id)) {
          ctx.fillStyle = '#34D399';
          ctx.beginPath();
          ctx.arc(nx + r * 0.8, ny - r * 0.8, 3.5 / view.k, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // G. Collision-Aware Label Engine
        // Decide whether this node should attempt to render a label based on zoom & priority
        const shouldShowLabel =
          isSelected ||
          isHovered ||
          n.isEntryPoint ||
          n.visualTier === 'anchor' ||
          (view.k > 0.8 && (n.visualTier === 'hub' || rL === 'critical' || rL === 'high')) ||
          (view.k > 1.4 && n.visualTier === 'important') ||
          (view.k > 2.0 && density === 'full');

        if (shouldShowLabel && nodeAlpha > 0.3) {
          const displayName = n.label.split('/').pop() || n.label;
          const fontSize = Math.max(10, Math.min(13, 11 / view.k));
          ctx.font = `${isSelected ? 'bold ' : ''}${fontSize}px sans-serif`;

          const textWidth = ctx.measureText(displayName).width;
          const labelBox = {
            x: nx - textWidth / 2 - 4 / view.k,
            y: ny + r + 3 / view.k,
            width: textWidth + 8 / view.k,
            height: fontSize + 4 / view.k,
          };

          // Collision check against already rendered labels
          let collides = false;
          for (const box of renderedLabels) {
            if (
              labelBox.x < box.x + box.width &&
              labelBox.x + labelBox.width > box.x &&
              labelBox.y < box.y + box.height &&
              labelBox.y + labelBox.height > box.y
            ) {
              collides = true;
              break;
            }
          }

          if (!collides || isSelected || isHovered) {
            renderedLabels.push(labelBox);

            ctx.save();
            ctx.globalAlpha = Math.min(1.0, nodeAlpha);

            // Subtle dark label pill background
            ctx.fillStyle = 'rgba(7, 22, 37, 0.85)';
            ctx.beginPath();
            ctx.roundRect
              ? ctx.roundRect(labelBox.x, labelBox.y, labelBox.width, labelBox.height, 4)
              : ctx.rect(labelBox.x, labelBox.y, labelBox.width, labelBox.height);
            ctx.fill();

            // Label text
            ctx.fillStyle = isSelected ? '#7FE7D6' : isHovered ? '#FFFFFF' : '#E2E8F0';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(displayName, nx, labelBox.y + 2 / view.k);
            ctx.restore();
          }
        }
      }

      ctx.restore();

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [
    nodes,
    view,
    size,
    matchesFilter,
    graph.links,
    graph.highways,
    focusId,
    selected,
    hoverNodeId,
    directNeighbors,
    secondHopNeighbors,
    thirdHopNeighbors,
    focusDepth,
    visualMode,
    density,
    isolatedPathSet,
    clusterHulls,
    directImpact,
    transitiveImpact,
    affectedEntryPoints,
    downstreamOfFocus,
    impactPreviewNode,
    byId,
  ]);

  // Mouse Interaction: Hover & Hit Testing
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const wx = (mx - view.x) / view.k;
    const wy = (my - view.y) / view.k;

    // Search quadtree for closest node within hit distance
    const searchRadius = Math.max(14, 20 / view.k);
    const closest = tree.find(wx, wy, searchRadius);

    if (closest && matchesFilter(closest)) {
      setHoverNodeId(closest.id);
    } else {
      setHoverNodeId(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverNodeId(null);
  };

  const handleClick = () => {
    if (gesture.current.moved) return;
    if (hoverNodeId) {
      onSelect(hoverNodeId === selected ? null : hoverNodeId);
    } else {
      onSelect(null);
    }
  };

  // Drag to pan
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current = { x: e.clientX, y: e.clientY, moved: false };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const last = pointers.current.get(e.pointerId)!;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;

    if (Math.hypot(e.clientX - gesture.current.x, e.clientY - gesture.current.y) > 4) {
      gesture.current.moved = true;
    }

    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
  };

  const hoveredNode = hoverNodeId ? byId.get(hoverNodeId) : null;
  const selectedNode = selected ? byId.get(selected) : null;
  const activeBreadcrumb = selectedNode ? buildNodeBreadcrumb(selectedNode) : null;

  return (
    <div className="relative w-full h-[620px] rounded-xl overflow-hidden select-none border border-cyan-500/20 shadow-2xl bg-[#071625]">
      <canvas
        ref={canvas}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Top Floating Breadcrumb Bar */}
      {activeBreadcrumb && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#091829]/90 border border-cyan-400/30 text-white text-xs backdrop-blur-md shadow-lg animate-[fade-in_150ms_ease-out]">
          <Compass className="w-3.5 h-3.5 text-cyan-400 mr-0.5" />
          {activeBreadcrumb.map((crumb, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (crumb.level === 'universe') fit();
                  else if (crumb.level === 'constellation') flyToConstellation(crumb.label);
                }}
                className={`font-mono text-[11px] transition-colors ${
                  idx === activeBreadcrumb.length - 1
                    ? 'font-bold text-cyan-300'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {crumb.label}
              </button>
              {idx < activeBreadcrumb.length - 1 && (
                <ChevronRight className="w-3 h-3 text-white/30" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Path Isolation Active Banner */}
      {isolatedPath && (
        <div className="absolute top-3 right-14 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-900/90 border border-cyan-400 text-white text-xs backdrop-blur-md shadow-lg">
          <Zap className="w-3.5 h-3.5 text-cyan-300" />
          <span className="font-mono font-bold text-[11px]">
            Path Isolated ({isolatedPath.length - 1} hops)
          </span>
          {onClearIsolatedPath && (
            <button
              type="button"
              onClick={onClearIsolatedPath}
              className="ml-1 text-[10px] uppercase font-bold text-white/70 hover:text-white underline"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Compact Floating Glass Tooltip */}
      {hoveredNode && (
        <div
          className="absolute pointer-events-none z-20 px-3.5 py-2.5 rounded-xl bg-[#091626]/95 border border-cyan-400/40 text-white shadow-2xl backdrop-blur-md max-w-xs transition-opacity"
          style={{
            left: Math.min(size.width - 290, Math.max(12, hoveredNode.x! * view.k + view.x + 18)),
            top: Math.min(size.height - 180, Math.max(12, hoveredNode.y! * view.k + view.y - 45)),
          }}
        >
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10">
            <span className="font-bold text-xs truncate text-cyan-300">
              {hoveredNode.label.split('/').pop()}
            </span>
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/10 text-white/70">
              {hoveredNode.language}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
            <div className="text-white/60">
              Role: <span className="text-white font-medium">{hoveredNode.role}</span>
            </div>
            <div className="text-white/60">
              Cluster: <span className="text-white font-medium">{hoveredNode.clusterLabel}</span>
            </div>
            <div className="text-white/60">
              Risk:{' '}
              <span
                className={`font-bold uppercase ${
                  hoveredNode.riskLevel === 'critical'
                    ? 'text-red-400'
                    : hoveredNode.riskLevel === 'high'
                    ? 'text-orange-400'
                    : 'text-emerald-400'
                }`}
              >
                {hoveredNode.riskLevel}
              </span>
            </div>
            <div className="text-white/60">
              Complexity: <span className="text-white font-medium">{hoveredNode.complexityScore}</span>
            </div>
            <div className="text-white/60">
              In / Out:{' '}
              <span className="text-white font-medium">
                {hoveredNode.fanIn} / {hoveredNode.fanOut}
              </span>
            </div>
            <div className="text-white/60">
              AST Parse:{' '}
              <span className="text-white font-medium uppercase">{hoveredNode.parseStatus}</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Camera Controls Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 p-1 rounded-xl bg-[#091829]/90 border border-white/10 backdrop-blur-md shadow-xl text-white">
        <button
          type="button"
          onClick={() =>
            setView(v => ({
              ...v,
              k: Math.min(5, v.k * 1.3),
              x: size.width / 2 - ((size.width / 2 - v.x) * 1.3),
              y: size.height / 2 - ((size.height / 2 - v.y) * 1.3),
            }))
          }
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() =>
            setView(v => ({
              ...v,
              k: Math.max(0.08, v.k / 1.3),
              x: size.width / 2 - ((size.width / 2 - v.x) / 1.3),
              y: size.height / 2 - ((size.height / 2 - v.y) / 1.3),
            }))
          }
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={fit}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          title="Fit Architecture to Viewport (F)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        {selected && (
          <button
            type="button"
            onClick={centerSelected}
            className="p-1.5 rounded-lg hover:bg-white/10 text-cyan-400 hover:text-cyan-300 transition-colors"
            title="Center on Selected Node"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
