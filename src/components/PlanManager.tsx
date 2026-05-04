import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileImage, ZoomIn, ZoomOut,
  Maximize2, Trash2, Layers, ChevronRight,
} from "lucide-react";

/* ── Types ── */
interface Plan {
  id: string;
  name: string;
  level: string;
  dataUrl: string;
  width: number;
  height: number;
}

const LEVELS = ["B1 Subterráneo", "N0 Planta Baja", "N1 Primer Piso", "N2 Segundo Piso", "N3 Cubierta"];

/* ── Canvas viewer ── */
function PlanCanvas({ plan }: { plan: Plan }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ scale: 1, ox: 0, oy: 0, dragging: false, lx: 0, ly: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext("2d")!;
    const { scale, ox, oy } = stateRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const w = plan.width * scale;
    const h = plan.height * scale;
    ctx.drawImage(imgRef.current, ox, oy, w, h);
    /* Scale indicator */
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "11px monospace";
    ctx.fillText(`${Math.round(scale * 100)}%`, 8, canvas.height - 8);
  }, [plan]);

  const fitToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const scaleX = canvas.width / plan.width;
    const scaleY = canvas.height / plan.height;
    const s = Math.min(scaleX, scaleY) * 0.9;
    stateRef.current.scale = s;
    stateRef.current.ox = (canvas.width - plan.width * s) / 2;
    stateRef.current.oy = (canvas.height - plan.height * s) / 2;
    draw();
  }, [plan, draw]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      fitToCanvas();
    };
    img.src = plan.dataUrl;
  }, [plan.dataUrl, fitToCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      if (imgRef.current) fitToCanvas();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [fitToCanvas]);

  /* Events */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { scale, ox, oy } = stateRef.current;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const ns = Math.max(0.1, Math.min(10, scale * factor));
      stateRef.current.scale = ns;
      stateRef.current.ox = mx - (mx - ox) * (ns / scale);
      stateRef.current.oy = my - (my - oy) * (ns / scale);
      draw();
    };
    const onDown = (e: MouseEvent) => { stateRef.current.dragging = true; stateRef.current.lx = e.clientX; stateRef.current.ly = e.clientY; };
    const onMove = (e: MouseEvent) => {
      if (!stateRef.current.dragging) return;
      stateRef.current.ox += e.clientX - stateRef.current.lx;
      stateRef.current.oy += e.clientY - stateRef.current.ly;
      stateRef.current.lx = e.clientX;
      stateRef.current.ly = e.clientY;
      draw();
    };
    const onUp = () => { stateRef.current.dragging = false; };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draw]);

  const zoom = (f: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.width / 2; const cy = canvas.height / 2;
    const { scale, ox, oy } = stateRef.current;
    const ns = Math.max(0.1, Math.min(10, scale * f));
    stateRef.current.scale = ns;
    stateRef.current.ox = cx - (cx - ox) * (ns / scale);
    stateRef.current.oy = cy - (cy - oy) * (ns / scale);
    draw();
  };

  return (
    <div className="relative flex-1 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-[#334155] bg-[#0f172a] shrink-0">
        <Button size="sm" variant="ghost" onClick={() => zoom(1.2)} className="h-6 w-6 p-0 text-slate-400 hover:text-white">
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => zoom(0.8)} className="h-6 w-6 p-0 text-slate-400 hover:text-white">
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={fitToCanvas} className="h-6 w-6 p-0 text-slate-400 hover:text-white">
          <Maximize2 className="w-3.5 h-3.5" />
        </Button>
        <span className="text-[10px] text-slate-500 ml-1">{plan.name}</span>
      </div>
      <canvas
        ref={canvasRef}
        className="flex-1 cursor-grab active:cursor-grabbing"
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}

/* ── Main component ── */
export function PlanManager() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeLevel, setActiveLevel] = useState("N0 Planta Baja");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback((file: File, level: string) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const plan: Plan = {
          id: Date.now().toString(),
          name: file.name.replace(/\.[^.]+$/, ""),
          level,
          dataUrl,
          width: img.width,
          height: img.height,
        };
        setPlans(prev => [...prev, plan]);
        setSelectedPlan(plan);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    Array.from(e.dataTransfer.files).forEach(f => loadFile(f, activeLevel));
  }, [loadFile, activeLevel]);

  const levelPlans = plans.filter(p => p.level === activeLevel);

  return (
    <div className="flex flex-col h-full text-white">
      {/* Level tabs */}
      <div className="shrink-0 border-b border-[#334155] bg-[#0f172a] px-2 pt-1">
        <div className="overflow-x-auto">
          <div className="flex gap-1 pb-1 min-w-max">
            {LEVELS.map(lvl => (
              <button
                key={lvl}
                onClick={() => { setActiveLevel(lvl); setSelectedPlan(null); }}
                className={`shrink-0 px-2 py-1 text-[10px] rounded font-medium transition-colors ${
                  activeLevel === lvl
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedPlan ? (
        /* ── Viewer ── */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-1 px-2 py-1 shrink-0">
            <Button size="sm" variant="ghost" onClick={() => setSelectedPlan(null)}
              className="h-6 px-2 text-[10px] text-slate-400 hover:text-white">
              <ChevronRight className="w-3 h-3 rotate-180 mr-1" /> Planos
            </Button>
            <Badge className="text-[9px] h-4 bg-emerald-500/20 text-emerald-300 border-0">{activeLevel}</Badge>
          </div>
          <PlanCanvas plan={selectedPlan} />
        </div>
      ) : (
        /* ── List + Upload ── */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`m-2 rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-colors ${
              dragging ? "border-emerald-400 bg-emerald-500/10" : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/20"
            }`}
          >
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => Array.from(e.target.files || []).forEach(f => loadFile(f, activeLevel))} />
            <Upload className="w-6 h-6 text-slate-500 mx-auto mb-1" />
            <p className="text-[11px] text-slate-400">Subir plano para <span className="text-emerald-400 font-medium">{activeLevel}</span></p>
            <p className="text-[10px] text-slate-600 mt-0.5">PNG · JPG · WEBP</p>
          </div>

          {/* Plan list */}
          <ScrollArea className="flex-1 px-2">
            {levelPlans.length === 0 ? (
              <div className="text-center py-6">
                <Layers className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-[11px] text-slate-500">Sin planos en este nivel</p>
              </div>
            ) : (
              <div className="space-y-1.5 pb-2">
                {levelPlans.map((plan: Plan) => (
                  <div key={plan.id}
                    className="flex items-center gap-2 bg-slate-800/60 rounded-lg p-2 border border-slate-700/50 hover:border-emerald-500/40 cursor-pointer transition-colors group"
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <div className="w-10 h-10 rounded overflow-hidden bg-slate-700 shrink-0">
                      <img src={plan.dataUrl} alt={plan.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-slate-200 truncate font-medium">{plan.name}</p>
                      <p className="text-[10px] text-slate-500">{plan.width}×{plan.height}px</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setSelectedPlan(plan); }}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-white">
                        <Maximize2 className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost"
                        onClick={e => {
                          e.stopPropagation();
                          setPlans(prev => prev.filter(p => p.id !== plan.id));
                          if (selectedPlan?.id === plan.id) setSelectedPlan(null);
                        }}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-red-400">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {plans.length > 0 && (
            <div className="px-2 pb-2 shrink-0">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-800/40 rounded px-2 py-1.5">
                <FileImage className="w-3 h-3 text-emerald-400" />
                <span>{plans.length} plano{plans.length !== 1 ? "s" : ""} cargado{plans.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
