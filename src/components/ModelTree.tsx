import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { BIMElement } from "@/hooks/useBIMViewer";
import {
  ChevronRight,
  ChevronDown,
  Search,
  Box,
  Building2,
  Layers,
  Square,
  Columns,
  DoorOpen,
  Frame,
  Home,
  Eye,
  EyeOff,
  Focus,
  FolderOpen,
  Filter,
  RotateCcw,
} from "lucide-react";

interface ModelTreeProps {
  elements: BIMElement[];
  models: string[];
  categories: string[];
  selectedElement: BIMElement | null;
  categoryFilter: string[];
  hiddenMeshes: Set<number>;
  isolatedMesh: number | null;
  onElementSelect: (element: BIMElement) => void;
  onHideElement: (expressID: number) => void;
  onShowElement: (expressID: number) => void;
  onIsolateElement: (expressID: number) => void;
  onFilterByCategory: (categories: string[]) => void;
  onShowAll: () => void;
}

function getElementIcon(type: string) {
  switch (type.toLowerCase()) {
    case "ifcwall": return <Square className="w-3.5 h-3.5 text-amber-400" />;
    case "ifcslab": return <Layers className="w-3.5 h-3.5 text-blue-400" />;
    case "ifccolumn": return <Columns className="w-3.5 h-3.5 text-slate-400" />;
    case "ifcwindow": return <Frame className="w-3.5 h-3.5 text-sky-300" />;
    case "ifcdoor": return <DoorOpen className="w-3.5 h-3.5 text-orange-400" />;
    case "ifcstair": return <Layers className="w-3.5 h-3.5 text-purple-400" />;
    case "ifcroof": return <Home className="w-3.5 h-3.5 text-red-400" />;
    default: return <Box className="w-3.5 h-3.5 text-emerald-400" />;
  }
}

export function ModelTree({
  elements,
  models,
  categories,
  selectedElement,
  hiddenMeshes,
  isolatedMesh,
  onElementSelect,
  onHideElement,
  onShowElement,
  onIsolateElement,
  onFilterByCategory,
  onShowAll,
}: ModelTreeProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  const filteredElements = searchTerm
    ? elements.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.type.toLowerCase().includes(searchTerm.toLowerCase()))
    : elements;

  /* Group by category */
  const byCategory: Record<string, BIMElement[]> = {};
  filteredElements.forEach(el => {
    const cat = el.category || "Uncategorized";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(el);
  });

  const handleCatToggle = (cat: string) => {
    const next = selectedCats.includes(cat)
      ? selectedCats.filter(c => c !== cat)
      : [...selectedCats, cat];
    setSelectedCats(next);
    onFilterByCategory(next);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-2 border-b border-[#334155]">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input
            placeholder="Search elements..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="h-7 pl-7 text-xs bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-2 py-1.5 border-b border-[#334155]">
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-300 transition-colors"
        >
          <Filter className="w-3 h-3" />
          <span>Filter by Category {selectedCats.length > 0 && `(${selectedCats.length})`}</span>
          {filterOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        {filterOpen && (
          <div className="mt-1.5 space-y-1">
            {categories.map(cat => (
              <label key={cat} className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer hover:text-slate-300">
                <Checkbox
                  checked={selectedCats.includes(cat)}
                  onCheckedChange={() => handleCatToggle(cat)}
                  className="w-3 h-3 border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                />
                {cat}
              </label>
            ))}
            {selectedCats.length > 0 && (
              <button
                onClick={() => { setSelectedCats([]); onFilterByCategory([]); }}
                className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 mt-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Models */}
          {models.map((model, mIdx) => (
            <Collapsible key={mIdx} defaultOpen>
              <CollapsibleTrigger className="flex items-center w-full hover:bg-slate-700/50 rounded px-1 py-1">
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <Building2 className="w-4 h-4 text-emerald-400 ml-1 mr-2" />
                <span className="text-xs text-slate-200">{model}</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-2 border-l border-slate-700/50 pl-1">
                  {Object.entries(byCategory).map(([cat, catElements]) => (
                    <Collapsible key={cat} defaultOpen>
                      <CollapsibleTrigger className="flex items-center w-full hover:bg-slate-700/50 rounded px-1 py-1">
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <FolderOpen className="w-3.5 h-3.5 text-slate-400 ml-1 mr-1.5" />
                        <span className="text-[11px] text-slate-300">{cat}</span>
                        <Badge variant="secondary" className="ml-1 text-[9px] h-3.5 bg-slate-700 text-slate-400 border-0">{catElements.length}</Badge>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {catElements.map(el => {
                          const isHidden = hiddenMeshes.has(el.expressID);
                          const isSelected = selectedElement?.expressID === el.expressID;
                          return (
                            <div
                              key={el.expressID}
                              onClick={() => onElementSelect(el)}
                              className={`flex items-center w-full rounded px-2 py-1 transition-colors group cursor-pointer ${
                                isSelected ? "bg-emerald-500/20 text-emerald-300" : "text-slate-300 hover:bg-slate-700/50"
                              } ${isHidden ? "opacity-40" : ""}`}
                            >
                              <span className="mr-1.5 shrink-0">{getElementIcon(el.type)}</span>
                              <span className="text-[11px] truncate flex-1">{el.name}</span>
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {isHidden ? (
                                  <button onClick={() => onShowElement(el.expressID)} className="p-0.5 hover:bg-slate-600 rounded" title="Show">
                                    <Eye className="w-3 h-3 text-emerald-400" />
                                  </button>
                                ) : (
                                  <button onClick={() => onHideElement(el.expressID)} className="p-0.5 hover:bg-slate-600 rounded" title="Hide">
                                    <EyeOff className="w-3 h-3 text-slate-400" />
                                  </button>
                                )}
                                <button onClick={() => onIsolateElement(el.expressID)} className="p-0.5 hover:bg-slate-600 rounded" title="Isolate">
                                  <Focus className="w-3 h-3 text-sky-400" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>

      {/* Bottom actions */}
      {models.length > 0 && (
        <div className="p-2 border-t border-[#334155] bg-slate-800/50 flex gap-1">
          <Button size="sm" variant="ghost" onClick={onShowAll} className="h-6 px-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700">
            <Eye className="w-3 h-3 mr-1" /> Show All
          </Button>
          {(hiddenMeshes.size > 0 || isolatedMesh !== null) && (
            <Badge variant="secondary" className="text-[9px] h-5 bg-amber-500/20 text-amber-300 border-0">
              {hiddenMeshes.size > 0 && `${hiddenMeshes.size} hidden`}
              {isolatedMesh !== null && " isolated"}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
