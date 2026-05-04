import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Scissors, Trash2 } from "lucide-react";

interface ClippingPanelProps {
  clipPlanes: { id: number; name: string }[];
  onClear: () => void;
}

export function ClippingPanel({ clipPlanes, onClear }: ClippingPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-[#334155] flex items-center justify-between">
        <span className="text-xs text-slate-300">Active Section Planes</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          disabled={clipPlanes.length === 0}
          className="h-6 px-2 text-xs text-slate-400 hover:text-red-300 hover:bg-slate-700 disabled:opacity-30"
        >
          <Trash2 className="w-3 h-3 mr-1" /> Clear
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {clipPlanes.length === 0 ? (
            <div className="text-center py-8">
              <Scissors className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No section planes</p>
              <p className="text-[10px] text-slate-500 mt-1">
                Click the <span className="text-red-400">Section</span> tool in the toolbar, then click a face in the 3D view.
              </p>
            </div>
          ) : (
            clipPlanes.map((p, i) => (
              <div key={p.id} className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300">{p.name}</span>
                  <Badge variant="secondary" className="text-[10px] h-4 bg-red-500/20 text-red-300 border-0">
                    Plane {i + 1}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
