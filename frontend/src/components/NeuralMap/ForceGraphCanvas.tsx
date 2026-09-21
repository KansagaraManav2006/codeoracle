import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { quadtree } from 'd3-quadtree';
import type { NeuralGraph, NeuralNode } from './graphDataAdapter';
import { useForceSimulation } from './useForceSimulation';

interface Props {
  graph: NeuralGraph;
  search: string;
  language: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
  reset: number;
}
export default function ForceGraphCanvas({ graph, search, language, selected, onSelect, reset }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { nodes, revision, settled } = useForceSimulation(graph);
  const [size, setSize] = useState({ width: 800, height: 560 });
  const [view, setView] = useState({ x: 400, y: 280, k: 1 });
  const [hover, setHover] = useState<string | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ x: 0, y: 0, moved: false });
  const tree = useMemo(() => quadtree<NeuralNode>().x(n => n.x!).y(n => n.y!).addAll(nodes), [nodes, revision]);
  const byId = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const focus = hover || selected;
  const neighbors = useMemo(() => {
    const result = new Set([focus]);
    for (const link of graph.links) {
      if (link.source === focus) result.add(link.target);
      if (link.target === focus) result.add(link.source);
    }
    return result;
  }, [graph, focus]);
  const matches = (n: NeuralNode) => (!search || n.label.toLowerCase().includes(search.toLowerCase())) &&
    (language === 'all' || n.language === language);
  const fit = useCallback(() => {
    if (!nodes.length) return;
    const xs = nodes.map(n => n.x!);
    const ys = nodes.map(n => n.y!);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const k = Math.max(0.05, Math.min(1.5, (size.width - 100) / (maxX - minX + 60), (size.height - 100) / (maxY - minY + 60)));
    setView({ x: size.width / 2 - (minX + maxX) / 2 * k, y: size.height / 2 - (minY + maxY) / 2 * k, k });
  }, [nodes, size]);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    if (canvas.current) observer.observe(canvas.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { fit(); }, [fit, reset, settled]);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      setView(v => {
        const k = Math.max(0.05, Math.min(5, v.k * Math.exp(-e.deltaY * 0.001)));
        return { x: x - (x - v.x) * k / v.k, y: y - (y - v.y) * k / v.k, k };
      });
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, []);
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
      ctx.fillStyle = '#0A0A0F'; ctx.fillRect(0, 0, size.width, size.height);
      ctx.translate(view.x, view.y); ctx.scale(view.k, view.k);
      const styles = getComputedStyle(document.documentElement);
      const blue = styles.getPropertyValue('--interactive').trim();
      const amber = styles.getPropertyValue('--amber').trim();
      const green = styles.getPropertyValue('--teal-on-dark').trim();
      for (const link of graph.links) {
        const a = byId.get(link.source)!, b = byId.get(link.target)!;
        const touching = link.source === focus || link.target === focus;
        ctx.globalAlpha = !matches(a) || !matches(b) ? 0.025 : focus ? touching ? 0.9 : 0.025 : 0.13;
        ctx.strokeStyle = touching && selected === focus ? blue : '#FFFFFF';
        ctx.lineWidth = (touching ? 1.5 : 0.7) / view.k;
        ctx.setLineDash(link.type === 'type-only' ? [4 / view.k, 4 / view.k] : []);
        ctx.beginPath(); ctx.moveTo(a.x!, a.y!); ctx.lineTo(b.x!, b.y!); ctx.stroke();
      }
      ctx.setLineDash([]);
      for (const n of nodes) {
        const active = n.id === selected;
        const hovered = n.id === hover;
        const opacity = !matches(n) ? 0.15 : focus && !neighbors.has(n.id) ? 0.2 : active || hovered ? 1 : 0.7;
        const color = active ? blue : hovered ? '#FFFFFF' : n.inCycle || ['high', 'critical'].includes(n.riskLevel) ? amber : n.isEntryPoint ? green : '#FFFFFF';
        const radius = n.radius + (hovered ? 2 : 0);
        // Concentric translucent disks avoid expensive per-node shadow blur.
        for (const [scale, alpha] of [[2.5, 0.035], [1.7, 0.08], [1, 1]]) {
          ctx.globalAlpha = opacity * alpha; ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(n.x!, n.y!, radius * scale, 0, Math.PI * 2); ctx.fill();
        }
        if (active) {
          ctx.globalAlpha = 1; ctx.strokeStyle = blue; ctx.lineWidth = 1.5 / view.k;
          ctx.beginPath(); ctx.arc(n.x!, n.y!, radius + 5 / view.k, 0, Math.PI * 2); ctx.stroke();
        }
        if (active || hovered || (search && matches(n)) || n.radius >= 14 || nodes.length <= 2) {
          ctx.globalAlpha = opacity; ctx.fillStyle = '#FFFFFF'; ctx.font = `${11 / view.k}px monospace`;
          ctx.textAlign = 'center'; ctx.fillText(n.label, n.x!, n.y! + radius + 18 / view.k);
        }
      }
    };
    let frame = requestAnimationFrame(draw);
    const visible = () => { cancelAnimationFrame(frame); if (!document.hidden) frame = requestAnimationFrame(draw); };
    document.addEventListener('visibilitychange', visible);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', visible); };
  }, [revision, nodes, graph, size, view, hover, selected, search, language, neighbors, focus, byId]);

  const point = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const hit = (p: { x: number; y: number }) => {
    const x = (p.x - view.x) / view.k, y = (p.y - view.y) / view.k;
    let found: NeuralNode | null = null;
    let distance = Infinity;
    const reach = 22 + 6 / view.k;
    tree.visit((quad, x0, y0, x1, y1) => {
      if (x0 > x + reach || x1 < x - reach || y0 > y + reach || y1 < y - reach) return true;
      if (!quad.length) {
        let leaf: typeof quad | undefined = quad;
        do {
          const n = leaf.data;
          const d = Math.hypot(n.x! - x, n.y! - y);
          if (d <= n.radius + 6 / view.k && d < distance) { found = n; distance = d; }
          leaf = leaf.next;
        } while (leaf);
      }
      return false;
    });
    return (found as NeuralNode | null)?.id || null;
  };
  return <canvas ref={canvas} className="w-full h-[560px] sm:h-[640px] touch-none rounded-lg focus-visible:outline focus-visible:outline-indigo"
    style={{ cursor: hover ? 'pointer' : 'grab' }} tabIndex={0}
    aria-label="Neural dependency graph. Drag to pan, scroll or pinch to zoom. Use the file selector above for keyboard selection. Escape clears selection."
    onKeyDown={e => { if (e.key === 'Escape') onSelect(null); }}
    onPointerDown={e => {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const p = point(e); pointers.current.set(e.pointerId, p);
      gesture.current = { ...p, moved: pointers.current.size > 1 };
    }}
    onPointerMove={e => {
      const p = point(e), previous = pointers.current.get(e.pointerId);
      if (!previous) { setHover(hit(p)); return; }
      setHover(null);
      if (Math.hypot(p.x - gesture.current.x, p.y - gesture.current.y) > 4) gesture.current.moved = true;
      const other = [...pointers.current.entries()].find(([id]) => id !== e.pointerId)?.[1];
      setView(v => {
        if (!other) return { ...v, x: v.x + p.x - previous.x, y: v.y + p.y - previous.y };
        const oldDistance = Math.hypot(previous.x - other.x, previous.y - other.y);
        const k = Math.max(0.05, Math.min(5, v.k * Math.hypot(p.x - other.x, p.y - other.y) / Math.max(1, oldDistance)));
        return { x: (p.x + other.x) / 2 - ((previous.x + other.x) / 2 - v.x) * k / v.k,
          y: (p.y + other.y) / 2 - ((previous.y + other.y) / 2 - v.y) * k / v.k, k };
      });
      pointers.current.set(e.pointerId, p);
    }}
    onPointerUp={e => {
      if (!pointers.current.has(e.pointerId)) return;
      if (!gesture.current.moved) onSelect(hit(point(e)));
      pointers.current.delete(e.pointerId); setHover(null);
    }}
    onPointerCancel={e => { pointers.current.delete(e.pointerId); gesture.current.moved = true; }}
    onPointerLeave={() => setHover(null)} />;
}
