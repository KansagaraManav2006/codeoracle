import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { quadtree } from 'd3-quadtree';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  RotateCcw,
} from 'lucide-react';
import type {
  ClusterMode,
  FocusDepth,
  NeuralGraph,
  NeuralLink,
  NeuralNode,
  NodeShape,
  VisualMode,
} from './graphDataAdapter';
import { useForceSimulation } from './useForceSimulation';
import { truncateMiddle } from '../../utils/formatters';

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
}

interface HoveredEdgeInfo {
  link: NeuralLink;
  sourceNode: NeuralNode;
  targetNode: NeuralNode;
  screenX: number;
  screenY: number;
}

// Custom shape drawing functions on 2D canvas
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
      // Entry point: diamond
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
      // Database: polygon
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
    case 'config': {
      // Config: slender diamond
      const dx = r * 1.6;
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
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { nodes, revision, settled } = useForceSimulation(graph, clusterMode, visualMode);

  const [size, setSize] = useState({ width: 800, height: 620 });
  const [view, setView] = useState({ x: 400, y: 310, k: 1 });
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<HoveredEdgeInfo | null>(null);

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
        if (!['high', 'critical'].includes(String(n.riskLevel).toLowerCase()) && n.hotspotScore < 50) return false;
      } else if (quickFilter === 'partial') {
        if (n.parseStatus !== 'partial') return false;
      } else if (quickFilter === 'entry_points') {
        if (!n.isEntryPoint) return false;
      } else if (quickFilter === 'unresolved') {
        if (n.nodeState !== 'unresolved' && n.unresolvedImports === 0) return false;
      }

      return true;
    },
    [search, language, showIsolated, quickFilter]
  );

  const focusId = hoverNodeId || selected;

  // Neighborhood sets for 1-hop and 2-hop focus lenses
  const { directNeighbors, secondHopNeighbors } = useMemo(() => {
    const hop1 = new Set<string>();
    const hop2 = new Set<string>();
    if (!focusId) return { directNeighbors: hop1, secondHopNeighbors: hop2 };

    hop1.add(focusId);
    hop2.add(focusId);

    // 1-Hop
    for (const link of graph.links) {
      if (link.source === focusId) hop1.add(link.target);
      if (link.target === focusId) hop1.add(link.source);
    }

    // 2-Hop
    if (focusDepth === '2-hop' || focusDepth === 'all') {
      for (const n of hop1) hop2.add(n);
      for (const link of graph.links) {
        if (hop1.has(link.source)) hop2.add(link.target);
        if (hop1.has(link.target)) hop2.add(link.source);
      }
    }

    return { directNeighbors: hop1, secondHopNeighbors: hop2 };
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

  // Direct and transitive impact sets when impactPreviewNode is active
  const { directImpact, transitiveImpact } = useMemo(() => {
    const dSet = new Set<string>();
    const tSet = new Set<string>();
    const target = impactPreviewNode || (selected && focusId === selected ? selected : null);
    if (!target) return { directImpact: dSet, transitiveImpact: tSet };

    // Direct callers (upstream)
    for (const link of graph.links) {
      if (link.target === target) dSet.add(link.source);
    }

    // Transitive callers
    const queue = [...dSet];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const link of graph.links) {
        if (link.target === curr && !dSet.has(link.source) && !tSet.has(link.source) && link.source !== target) {
          tSet.add(link.source);
          queue.push(link.source);
        }
      }
    }

    return { directImpact: dSet, transitiveImpact: tSet };
  }, [graph.links, impactPreviewNode, selected, focusId]);

  // Compute cluster bounding regions for soft ambient hulls
  const clusterHulls = useMemo(() => {
    const hulls = new Map<string, { minX: number; maxX: number; minY: number; maxY: number; count: number; color: string }>();
    for (const n of nodes) {
      if (!Number.isFinite(n.x) || !Number.isFinite(n.y) || !matchesFilter(n)) continue;
      const key = n.clusterLabel || 'BACKEND';
      const existing = hulls.get(key);
      const color =
        key === 'FRONTEND'
          ? '#38BDF8'
          : key === 'ML'
          ? '#F472B6'
          : key === 'DATABASE'
          ? '#34D399'
          : '#818CF8';

      if (!existing) {
        hulls.set(key, { minX: n.x!, maxX: n.x!, minY: n.y!, maxY: n.y!, count: 1, color });
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

    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const k = Math.max(
      0.05,
      Math.min(
        1.5,
        (size.width - 120) / Math.max(1, maxX - minX + 60),
        (size.height - 120) / Math.max(1, maxY - minY + 60)
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
        const k = Math.max(0.05, Math.min(5, v.k * Math.exp(-e.deltaY * 0.001)));
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

  // Main Canvas Render Loop
  useEffect(() => {
    const draw = () => {
      if (document.hidden) return;
      const element = canvas.current;
      const ctx = element?.getContext('2d');
      if (!element || !ctx) return;

      const dpr = window.devicePixelRatio || 1;
      element.width = Math.round(size.width * dpr);
      element.height = Math.round(size.height * dpr);
      ctx.scale(dpr, dpr);

      // Deep dark sleek canvas background
      ctx.fillStyle = '#090A0F';
      ctx.fillRect(0, 0, size.width, size.height);

      ctx.save();
      ctx.translate(view.x, view.y);
      ctx.scale(view.k, view.k);

      // 1. Soft Architecture Cluster Hulls & Headers
      if (visualMode !== 'flow' && clusterHulls.size > 0) {
        for (const [key, hull] of clusterHulls.entries()) {
          const padding = 50;
          const rx = hull.minX - padding;
          const ry = hull.minY - padding;
          const rw = Math.max(80, hull.maxX - hull.minX + padding * 2);
          const rh = Math.max(80, hull.maxY - hull.minY + padding * 2);

          // Soft ambient rounded background
          ctx.save();
          ctx.globalAlpha = 0.04;
          ctx.fillStyle = hull.color;
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(rx, ry, rw, rh, 28) : ctx.rect(rx, ry, rw, rh);
          ctx.fill();

          ctx.globalAlpha = 0.12;
          ctx.strokeStyle = hull.color;
          ctx.lineWidth = 1 / view.k;
          ctx.stroke();

          // Cluster header (fades out as user zooms in deeply for focus)
          const headerAlpha = Math.max(0, Math.min(0.85, (1.1 - view.k) * 1.5));
          if (headerAlpha > 0.05) {
            ctx.globalAlpha = headerAlpha;
            ctx.fillStyle = hull.color;
            ctx.font = `bold ${Math.max(11, 14 / view.k)}px monospace`;
            ctx.textAlign = 'left';
            ctx.fillText(`${key} · ${hull.count} modules`, rx + 18, ry + 24);
          }
          ctx.restore();
        }
      }

      // Time for subtle edge flow animation particle
      const now = performance.now();
      const flowT = (now % 2000) / 2000;

      // 2. Draw Edges
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

        let alpha = 0.12;
        let strokeColor = '#FFFFFF';
        let lineWidth = 0.8 / view.k;

        if (focusId) {
          if (isDirectConnection) {
            alpha = 0.95;
            strokeColor = selected === focusId ? '#6366F1' : '#38BDF8';
            lineWidth = 2.0 / view.k;
          } else if (focusDepth === '2-hop' && is2HopConnection) {
            alpha = 0.55;
            strokeColor = '#A5B4FC';
            lineWidth = 1.3 / view.k;
          } else if (focusDepth === '1-hop') {
            alpha = 0.02;
          } else {
            alpha = 0.04;
          }
        }

        // Impact Mode highlighting
        if (directImpact.has(link.source) || directImpact.has(link.target)) {
          alpha = 0.9;
          strokeColor = '#F59E0B';
          lineWidth = 2.2 / view.k;
        }

        if (visualMode === 'entry_points') {
          if (downstreamOfFocus.has(link.source) && downstreamOfFocus.has(link.target)) {
            strokeColor = '#14B8A6';
            alpha = 0.85;
            lineWidth = 1.6 / view.k;
          }
        }

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;

        if (link.type === 'type-only' || link.kind === 'type_only_import') {
          ctx.setLineDash([4 / view.k, 4 / view.k]);
        } else if (link.kind === 'dynamic_import') {
          ctx.setLineDash([2 / view.k, 3 / view.k]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();

        // Animated flow particle along selected active relationships
        if (isDirectConnection && selected === focusId) {
          const px = ax + (bx - ax) * flowT;
          const py = ay + (by - ay) * flowT;
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = '#67E8F9';
          ctx.beginPath();
          ctx.arc(px, py, 2.5 / view.k, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.setLineDash([]);

      // 3. Draw Nodes with Shapes, Importance, Halos, and Badges
      for (const n of nodes) {
        if (!matchesFilter(n)) continue;

        const nx = visualMode === 'flow' ? n.flowX : n.x!;
        const ny = visualMode === 'flow' ? n.flowY : n.y!;

        const active = n.id === selected;
        const hovered = n.id === hoverNodeId;
        const inFocusSet =
          !focusId ||
          (focusDepth === '1-hop'
            ? directNeighbors.has(n.id)
            : focusDepth === '2-hop'
            ? secondHopNeighbors.has(n.id)
            : true);

        let opacity = inFocusSet ? 1.0 : 0.16;
        if (hovered || active) opacity = 1.0;

        // Base Color Determination according to Visual Mode
        let nodeColor = '#FFFFFF';
        let haloColor: string | null = null;
        let haloLevel: 'none' | 'medium' | 'high' | 'critical' = 'none';

        // Risk Halos
        const score = n.hotspotScore;
        if (n.riskLevel === 'critical' || score >= 70) {
          haloLevel = 'critical';
          haloColor = '#EF4444';
        } else if (n.riskLevel === 'high' || score >= 45) {
          haloLevel = 'high';
          haloColor = '#F59E0B';
        } else if (n.riskLevel === 'medium' || score >= 20) {
          haloLevel = 'medium';
          haloColor = '#FBBF24';
        }

        if (visualMode === 'risk') {
          nodeColor = haloColor || '#14B8A6';
        } else if (visualMode === 'parse_quality') {
          if (n.parseStatus === 'partial') {
            nodeColor = '#F59E0B';
            haloColor = '#F59E0B';
            haloLevel = 'high';
          } else if (n.parseStatus === 'fallback' || n.parseStatus === 'failed') {
            nodeColor = '#EF4444';
            haloColor = '#EF4444';
            haloLevel = 'critical';
          } else if (n.nodeState === 'unresolved') {
            nodeColor = '#C084FC';
            haloColor = '#C084FC';
            haloLevel = 'medium';
          } else {
            nodeColor = '#FFFFFF';
          }
        } else if (visualMode === 'entry_points') {
          if (n.isEntryPoint) {
            nodeColor = '#14B8A6';
            haloColor = '#14B8A6';
            haloLevel = 'high';
          } else if (downstreamOfFocus.has(n.id)) {
            nodeColor = '#38BDF8';
          } else {
            nodeColor = '#94A3B8';
          }
        } else {
          // Structure Mode / Flow Mode
          if (active) {
            nodeColor = '#6366F1';
            haloColor = '#6366F1';
            haloLevel = 'critical';
          } else if (hovered) {
            nodeColor = '#FFFFFF';
          } else if (n.isEntryPoint) {
            nodeColor = '#14B8A6';
          } else if (['high', 'critical'].includes(String(n.riskLevel).toLowerCase())) {
            nodeColor = '#F59E0B';
          } else {
            nodeColor = '#E2E8F0';
          }
        }

        // Direct / Transitive Impact Preview Override
        if (directImpact.has(n.id)) {
          nodeColor = '#F97316';
          haloColor = '#F97316';
          haloLevel = 'high';
          opacity = 1.0;
        } else if (transitiveImpact.has(n.id)) {
          nodeColor = '#FBBF24';
          haloColor = '#FBBF24';
          haloLevel = 'medium';
          opacity = 0.9;
        }

        const radius = n.radius + (hovered ? 3 : 0);

        // Render Outer Halos according to Risk
        if (haloLevel !== 'none' && haloColor) {
          ctx.save();
          if (haloLevel === 'critical') {
            // Double halo
            ctx.globalAlpha = opacity * 0.12;
            ctx.fillStyle = haloColor;
            ctx.beginPath();
            ctx.arc(nx, ny, radius * 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = opacity * 0.22;
            ctx.beginPath();
            ctx.arc(nx, ny, radius * 1.8, 0, Math.PI * 2);
            ctx.fill();
          } else if (haloLevel === 'high') {
            ctx.globalAlpha = opacity * 0.18;
            ctx.fillStyle = haloColor;
            ctx.beginPath();
            ctx.arc(nx, ny, radius * 1.9, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.globalAlpha = opacity * 0.1;
            ctx.fillStyle = haloColor;
            ctx.beginPath();
            ctx.arc(nx, ny, radius * 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // Draw Semantic Node Shape (Circle, Diamond, Rounded Rect, Hexagon, Triangle, etc.)
        ctx.globalAlpha = opacity;
        ctx.fillStyle = nodeColor;
        drawNodeShape(ctx, n.shape, nx, ny, radius);
        ctx.fill();

        // Border Style based on Parse Confidence
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.4 / view.k;
        if (n.parseStatus === 'partial') {
          ctx.setLineDash([3 / view.k, 3 / view.k]);
          ctx.strokeStyle = '#F59E0B';
        } else if (n.parseStatus === 'fallback') {
          ctx.setLineDash([1.5 / view.k, 2.5 / view.k]);
          ctx.strokeStyle = '#EF4444';
        } else if (n.nodeState === 'unresolved') {
          ctx.setLineDash([4 / view.k, 3 / view.k]);
          ctx.strokeStyle = '#C084FC';
        } else {
          ctx.setLineDash([]);
        }
        drawNodeShape(ctx, n.shape, nx, ny, radius);
        ctx.stroke();
        ctx.setLineDash([]);

        // Active node selection beacon
        if (active) {
          ctx.globalAlpha = 1.0;
          ctx.strokeStyle = '#6366F1';
          ctx.lineWidth = 2.2 / view.k;
          ctx.beginPath();
          ctx.arc(nx, ny, radius + 6 / view.k, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Semantic Zooming for Labels
        const isImportant = n.visualImportance > 0.55 || n.isEntryPoint || n.riskLevel === 'critical';
        const showLabel =
          active ||
          hovered ||
          (search && n.label.toLowerCase().includes(search.toLowerCase())) ||
          (view.k >= 1.25 && inFocusSet) ||
          (view.k >= 0.75 && isImportant && inFocusSet) ||
          nodes.length <= 4;

        if (showLabel) {
          ctx.globalAlpha = opacity;
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `${Math.max(10, 11 / view.k)}px monospace`;
          ctx.textAlign = 'center';
          const shortName = n.label.split(/[\\/]/).pop() || n.label;
          ctx.fillText(shortName, nx, ny + radius + 16 / view.k);
        }
      }

      ctx.restore();

      // 4. Interactive Minimap (Bottom-Right)
      if (nodes.length > 10) {
        const mmWidth = 140;
        const mmHeight = 90;
        const mmX = size.width - mmWidth - 14;
        const mmY = size.height - mmHeight - 14;

        ctx.save();
        // Frosted glass background
        ctx.fillStyle = 'rgba(10, 11, 16, 0.85)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(mmX, mmY, mmWidth, mmHeight, 8) : ctx.rect(mmX, mmY, mmWidth, mmHeight);
        ctx.fill();
        ctx.stroke();

        // Minimap scale calculation
        const xs = nodes.map(n => n.x!).filter(Number.isFinite);
        const ys = nodes.map(n => n.y!).filter(Number.isFinite);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const spanX = Math.max(1, maxX - minX);
        const spanY = Math.max(1, maxY - minY);
        const mmScale = Math.min((mmWidth - 16) / spanX, (mmHeight - 16) / spanY);

        // Draw node dots in minimap
        for (const n of nodes) {
          if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) continue;
          const mx = mmX + 8 + (n.x! - minX) * mmScale;
          const my = mmY + 8 + (n.y! - minY) * mmScale;
          ctx.fillStyle = n.id === selected ? '#6366F1' : n.isEntryPoint ? '#14B8A6' : '#94A3B8';
          ctx.beginPath();
          ctx.arc(mx, my, n.id === selected ? 2.5 : 1.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw viewport bounds box in minimap
        const vpX = mmX + 8 + (-view.x / view.k - minX) * mmScale;
        const vpY = mmY + 8 + (-view.y / view.k - minY) * mmScale;
        const vpW = (size.width / view.k) * mmScale;
        const vpH = (size.height / view.k) * mmScale;

        ctx.strokeStyle = '#6366F1';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(vpX, vpY, vpW, vpH);
        ctx.restore();
      }
    };

    let frame = requestAnimationFrame(draw);
    const visible = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) frame = requestAnimationFrame(draw);
    };
    document.addEventListener('visibilitychange', visible);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [
    revision,
    nodes,
    graph,
    size,
    view,
    hoverNodeId,
    selected,
    search,
    language,
    visualMode,
    focusDepth,
    directNeighbors,
    secondHopNeighbors,
    downstreamOfFocus,
    directImpact,
    transitiveImpact,
    clusterHulls,
    focusId,
    byId,
    matchesFilter,
  ]);

  const point = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const hitNode = (p: { x: number; y: number }): string | null => {
    const x = (p.x - view.x) / view.k;
    const y = (p.y - view.y) / view.k;
    let found: NeuralNode | null = null;
    let distance = Infinity;
    const reach = 24 + 8 / view.k;

    tree.visit((quad, x0, y0, x1, y1) => {
      if (x0 > x + reach || x1 < x - reach || y0 > y + reach || y1 < y - reach) return true;
      if (!quad.length) {
        let leaf: typeof quad | undefined = quad;
        do {
          const n = leaf.data;
          if (matchesFilter(n)) {
            const nx = visualMode === 'flow' ? n.flowX : n.x!;
            const ny = visualMode === 'flow' ? n.flowY : n.y!;
            const d = Math.hypot(nx - x, ny - y);
            if (d <= n.radius + 8 / view.k && d < distance) {
              found = n;
              distance = d;
            }
          }
          leaf = leaf.next;
        } while (leaf);
      }
      return false;
    });

    return (found as NeuralNode | null)?.id || null;
  };

  const distToSegment = (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  };

  const hitEdge = (p: { x: number; y: number }): HoveredEdgeInfo | null => {
    const x = (p.x - view.x) / view.k;
    const y = (p.y - view.y) / view.k;
    const maxThreshold = 6 / view.k;

    for (const link of graph.links) {
      const a = byId.get(link.source);
      const b = byId.get(link.target);
      if (!a || !b) continue;
      if (!matchesFilter(a) || !matchesFilter(b)) continue;

      const ax = visualMode === 'flow' ? a.flowX : a.x!;
      const ay = visualMode === 'flow' ? a.flowY : a.y!;
      const bx = visualMode === 'flow' ? b.flowX : b.x!;
      const by = visualMode === 'flow' ? b.flowY : b.y!;

      const d = distToSegment(x, y, ax, ay, bx, by);
      if (d <= maxThreshold) {
        return {
          link,
          sourceNode: a,
          targetNode: b,
          screenX: p.x,
          screenY: p.y,
        };
      }
    }
    return null;
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-white/15 bg-[#090A0F]">
      <canvas
        ref={canvas}
        className="w-full h-[580px] sm:h-[660px] touch-none focus-visible:outline focus-visible:outline-indigo"
        style={{ cursor: hoverNodeId ? 'pointer' : hoveredEdge ? 'crosshair' : 'grab' }}
        tabIndex={0}
        aria-label="Neural dependency graph explorer. Drag to pan, scroll to zoom, click to select node. Escape clears selection."
        onKeyDown={e => {
          if (e.key === 'Escape') onSelect(null);
        }}
        onPointerDown={e => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = point(e);
          pointers.current.set(e.pointerId, p);
          gesture.current = { ...p, moved: pointers.current.size > 1 };
        }}
        onPointerMove={e => {
          const p = point(e);
          const previous = pointers.current.get(e.pointerId);
          if (!previous) {
            const nodeId = hitNode(p);
            setHoverNodeId(nodeId);
            if (!nodeId) {
              setHoveredEdge(hitEdge(p));
            } else {
              setHoveredEdge(null);
            }
            return;
          }

          setHoverNodeId(null);
          setHoveredEdge(null);

          if (Math.hypot(p.x - gesture.current.x, p.y - gesture.current.y) > 4) {
            gesture.current.moved = true;
          }

          const other = [...pointers.current.entries()].find(([id]) => id !== e.pointerId)?.[1];
          setView(v => {
            if (!other) {
              return { ...v, x: v.x + p.x - previous.x, y: v.y + p.y - previous.y };
            }
            const oldDistance = Math.hypot(previous.x - other.x, previous.y - other.y);
            const k = Math.max(
              0.05,
              Math.min(
                5,
                (v.k * Math.hypot(p.x - other.x, p.y - other.y)) / Math.max(1, oldDistance)
              )
            );
            return {
              x: (p.x + other.x) / 2 - (((previous.x + other.x) / 2 - v.x) * k) / v.k,
              y: (p.y + other.y) / 2 - (((previous.y + other.y) / 2 - v.y) * k) / v.k,
              k,
            };
          });
          pointers.current.set(e.pointerId, p);
        }}
        onPointerUp={e => {
          if (!pointers.current.has(e.pointerId)) return;
          if (!gesture.current.moved) {
            onSelect(hitNode(point(e)));
          }
          pointers.current.delete(e.pointerId);
          setHoverNodeId(null);
          setHoveredEdge(null);
        }}
        onPointerCancel={e => {
          pointers.current.delete(e.pointerId);
          gesture.current.moved = true;
        }}
        onPointerLeave={() => {
          setHoverNodeId(null);
          setHoveredEdge(null);
        }}
      />

      {/* Floating HUD Navigation Bar (Top-Right) */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 p-1 rounded-lg border border-white/15 bg-black/60 backdrop-blur-md text-white shadow-2">
        <button
          type="button"
          onClick={() =>
            setView(v => ({
              ...v,
              k: Math.min(5, v.k * 1.3),
              x: size.width / 2 - (size.width / 2 - v.x) * 1.3,
              y: size.height / 2 - (size.height / 2 - v.y) * 1.3,
            }))
          }
          className="p-1.5 rounded hover:bg-white/15 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() =>
            setView(v => ({
              ...v,
              k: Math.max(0.05, v.k / 1.3),
              x: size.width / 2 - (size.width / 2 - v.x) / 1.3,
              y: size.height / 2 - (size.height / 2 - v.y) / 1.3,
            }))
          }
          className="p-1.5 rounded hover:bg-white/15 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-white/20 my-auto" />
        <button
          type="button"
          onClick={fit}
          className="p-1.5 rounded hover:bg-white/15 transition-colors"
          title="Fit All Nodes"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        {selected && (
          <button
            type="button"
            onClick={centerSelected}
            className="p-1.5 rounded hover:bg-white/15 transition-colors text-indigo-on-dark"
            title="Center Selected Node"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setView({ x: size.width / 2, y: size.height / 2, k: 1 })}
          className="p-1.5 rounded hover:bg-white/15 transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Edge Tooltip on Hover */}
      {hoveredEdge && (
        <div
          className="absolute z-20 pointer-events-none p-3 rounded-lg bg-black/90 border border-white/20 text-white text-xs shadow-2 max-w-xs space-y-1.5 animate-[fade-up_100ms_ease-out]"
          style={{
            left: Math.min(size.width - 240, hoveredEdge.screenX + 14),
            top: Math.min(size.height - 130, hoveredEdge.screenY + 14),
          }}
        >
          <div className="font-mono font-bold text-[11px] text-white flex items-center gap-1.5 border-b border-white/15 pb-1">
            <span className="text-teal-strong">{truncateMiddle(hoveredEdge.sourceNode.label, 16)}</span>
            <span className="text-white/50">→</span>
            <span className="text-indigo-on-dark">{truncateMiddle(hoveredEdge.targetNode.label, 16)}</span>
          </div>
          <div className="space-y-0.5 text-[11px] font-mono text-white/80">
            <div>
              <span className="text-white/50">Type:</span> {hoveredEdge.link.kind || hoveredEdge.link.type}
            </div>
            <div>
              <span className="text-white/50">Confidence:</span> {hoveredEdge.link.confidence || 'high'}
            </div>
            {hoveredEdge.link.rawImport && (
              <div className="truncate" title={hoveredEdge.link.rawImport}>
                <span className="text-white/50">Import:</span> &quot;{hoveredEdge.link.rawImport}&quot;
              </div>
            )}
            <div>
              <span className="text-white/50">Status:</span>{' '}
              <span className={hoveredEdge.link.resolved ? 'text-teal-strong' : 'text-amber-text'}>
                {hoveredEdge.link.resolved ? 'RESOLVED' : 'UNRESOLVED'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
