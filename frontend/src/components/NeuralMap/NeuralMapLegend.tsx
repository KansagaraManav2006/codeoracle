export default function NeuralMapLegend() {
  return <div className="absolute bottom-4 left-4 pointer-events-none rounded-lg border border-white/15 bg-black/60 p-3 text-[11px] text-white/70">
    <p className="font-bold tracking-wider mb-2">GRAPH LEGEND</p>
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      <span>● File</span><span className="text-indigo-on-dark">◉ Selected</span>
      <span className="text-amber-on-dark">● Cycle / high risk</span><span className="text-teal-on-dark">● Entry point</span>
    </div>
    <p className="mt-2">Size = fan-in + fan-out · Dashed = type-only</p>
    <p className="mt-1">Drag to pan · Scroll or pinch to zoom</p>
  </div>;
}
