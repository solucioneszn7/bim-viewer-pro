import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Ruler,
  Scissors,
  RotateCcw,
  Crosshair,
  AlertCircle,
  Eye,
  Layers,
  Camera,
  MousePointerClick,
  Trash2,
  PersonStanding,
  Orbit,
} from "lucide-react";
import type { ToolMode, NavMode } from "@/hooks/useBIMViewer";

interface ToolbarProps {
  toolMode: ToolMode;
  navMode: NavMode;
  onSetMode: (mode: ToolMode) => void;
  onSetNavMode: (mode: NavMode) => void;
  onResetView: () => void;
  onZoomToSelection: () => void;
  onShowAll: () => void;
  onScreenshot: () => string;
  onAddIssue: () => void;
  onClearMeasurements: () => void;
  onClearClipPlanes: () => void;
  hasSelection: boolean;
  activeMeasurementsCount: number;
  activeClipPlanesCount: number;
}

export function Toolbar({
  toolMode,
  navMode,
  onSetMode,
  onSetNavMode,
  onResetView,
  onZoomToSelection,
  onShowAll,
  onScreenshot,
  onAddIssue,
  onClearMeasurements,
  onClearClipPlanes,
  hasSelection,
  activeMeasurementsCount,
  activeClipPlanesCount,
}: ToolbarProps) {
  const handleScreenshot = () => {
    const dataURL = onScreenshot();
    if (dataURL) {
      const link = document.createElement("a");
      link.download = `bim-viewer-${Date.now()}.png`;
      link.href = dataURL;
      link.click();
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-10 bg-[#0f172a] border-b border-[#334155] flex items-center px-2 gap-0.5 shrink-0 overflow-x-auto">
        {/* Selection */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={toolMode === "select" ? "secondary" : "ghost"}
              onClick={() => onSetMode("select")}
              className={`h-7 px-2 ${toolMode === "select" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-300 hover:text-white hover:bg-slate-700"}`}
            >
              <MousePointerClick className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Select (click element)</p></TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 bg-slate-700 mx-1" />

        {/* Navigation Mode */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant={navMode === "firstperson" ? "secondary" : "ghost"}
              onClick={() => onSetNavMode(navMode === "firstperson" ? "orbit" : "firstperson")}
              className={`h-7 px-2 gap-1 ${navMode === "firstperson" ? "bg-sky-500/20 text-sky-300" : "text-slate-300 hover:text-white hover:bg-slate-700"}`}>
              {navMode === "firstperson" ? <PersonStanding className="w-4 h-4" /> : <Orbit className="w-4 h-4" />}
              <span className="text-[10px]">{navMode === "firstperson" ? "Walk" : "Orbit"}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{navMode === "firstperson" ? "Modo Escala Humana (WASD+drag) → click para Orbit" : "Modo Orbitador → click para Escala Humana"}</p>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 bg-slate-700 mx-1" />

        {/* View */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" onClick={onResetView} className="h-7 px-2 text-slate-300 hover:text-white hover:bg-slate-700">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Reset View</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" onClick={onZoomToSelection} disabled={!hasSelection} className="h-7 px-2 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30">
              <Crosshair className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Zoom to Selection</p></TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 bg-slate-700 mx-1" />

        {/* Measure */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={toolMode === "measure" ? "secondary" : "ghost"}
              onClick={() => onSetMode(toolMode === "measure" ? "select" : "measure")}
              className={`h-7 px-2 ${toolMode === "measure" ? "bg-orange-500/20 text-orange-300" : "text-slate-300 hover:text-white hover:bg-slate-700"}`}
            >
              <Ruler className="w-4 h-4" />
              {activeMeasurementsCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-[9px] h-3.5 bg-orange-500/30 text-orange-300 border-0 px-1">{activeMeasurementsCount}</Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Measure Distance (click 2 points)</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" onClick={onClearMeasurements} disabled={activeMeasurementsCount === 0} className="h-7 px-1.5 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Clear Measurements</p></TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 bg-slate-700 mx-1" />

        {/* Clip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={toolMode === "clip" ? "secondary" : "ghost"}
              onClick={() => onSetMode(toolMode === "clip" ? "select" : "clip")}
              className={`h-7 px-2 ${toolMode === "clip" ? "bg-red-500/20 text-red-300" : "text-slate-300 hover:text-white hover:bg-slate-700"}`}
            >
              <Scissors className="w-4 h-4" />
              {activeClipPlanesCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-[9px] h-3.5 bg-red-500/30 text-red-300 border-0 px-1">{activeClipPlanesCount}</Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Section Plane (click face)</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" onClick={onClearClipPlanes} disabled={activeClipPlanesCount === 0} className="h-7 px-1.5 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Clear Section Planes</p></TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 bg-slate-700 mx-1" />

        {/* Visibility */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" onClick={onShowAll} className="h-7 px-2 text-slate-300 hover:text-white hover:bg-slate-700">
              <Eye className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Show All</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" onClick={() => onSetMode("select")} className="h-7 px-2 text-slate-300 hover:text-white hover:bg-slate-700">
              <Layers className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Isolate Selection (select first)</p></TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 bg-slate-700 mx-1" />

        {/* Screenshot */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" onClick={handleScreenshot} className="h-7 px-2 text-slate-300 hover:text-white hover:bg-slate-700">
              <Camera className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Screenshot</p></TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 bg-slate-700 mx-1" />

        {/* BCF Issue */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={onAddIssue}
              className="h-7 px-2 text-amber-400 hover:text-amber-300 hover:bg-slate-700"
            >
              <AlertCircle className="w-4 h-4 mr-1" />
              <span className="text-xs">BCF Issue</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Create BCF Issue with Viewpoint</p></TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
