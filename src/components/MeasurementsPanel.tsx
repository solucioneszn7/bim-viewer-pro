import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Ruler, Trash2 } from "lucide-react";

interface MeasurementsPanelProps {
  measurements: { id: number; distance: string; from: string; to: string }[];
  onClear: () => void;
}

export function MeasurementsPanel({ measurements, onClear }: MeasurementsPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-[#334155] flex items-center justify-between">
        <span className="text-xs text-slate-300">Active Measurements</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          disabled={measurements.length === 0}
          className="h-6 px-2 text-xs text-slate-400 hover:text-red-300 hover:bg-slate-700 disabled:opacity-30"
        >
          <Trash2 className="w-3 h-3 mr-1" /> Clear
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {measurements.length === 0 ? (
            <div className="text-center py-8">
              <Ruler className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No measurements</p>
              <p className="text-[10px] text-slate-500 mt-1">
                Click the <span className="text-orange-400">Measure</span> tool in the toolbar, then click two points in the 3D view.
              </p>
            </div>
          ) : (
            measurements.map((m, i) => (
              <div key={m.id} className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-500">Measurement #{i + 1}</span>
                  <Badge variant="secondary" className="text-[10px] h-4 bg-orange-500/20 text-orange-300 border-0">
                    {m.distance}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400">From: <span className="text-slate-200">{m.from}</span></p>
                <p className="text-[11px] text-slate-400">To: <span className="text-slate-200">{m.to}</span></p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
