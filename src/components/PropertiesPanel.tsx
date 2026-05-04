import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { BIMElement } from "@/hooks/useBIMViewer";
import {
  Box,
  Hash,
  Type,
  Tag,
  FileText,
  Info,
  MapPin,
  Globe,
  Maximize,
  Minimize,
  Layers,
  Square,
  BoxSelect,
} from "lucide-react";

interface PropertiesPanelProps {
  element: BIMElement | null;
}

function PropertyRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number | undefined;
  icon?: React.ReactNode;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-start gap-2 py-1.5 hover:bg-slate-800/50 rounded px-1 transition-colors">
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-xs text-slate-200">{String(value)}</p>
      </div>
    </div>
  );
}

function DimensionRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
}) {
  /* Format based on magnitude */
  let displayValue: string;
  let displayUnit: string;
  const absVal = Math.abs(value);
  
  if (absVal < 0.01) {
    displayValue = (value * 1000).toFixed(1);
    displayUnit = "mm";
  } else if (absVal < 1) {
    displayValue = (value * 100).toFixed(1);
    displayUnit = "cm";
  } else {
    displayValue = value.toFixed(3);
    displayUnit = "m";
  }

  return (
    <div className="flex items-center gap-2 py-1.5 hover:bg-slate-800/50 rounded px-1 transition-colors">
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-xs text-slate-200">
          {displayValue} <span className="text-slate-500">{displayUnit}</span>
        </p>
      </div>
    </div>
  );
}

function PropertySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <h4 className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold mb-2 px-1">
        {title}
      </h4>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function PropertiesPanel({ element }: PropertiesPanelProps) {
  if (!element) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <Box className="w-12 h-12 text-slate-600 mb-3" />
        <p className="text-sm text-slate-400 mb-1">No Element Selected</p>
        <p className="text-xs text-slate-500">
          Click on an element in the 3D view or model tree.
          <br />Double-click to zoom to an element.
        </p>
      </div>
    );
  }

  const props = element.properties;
  const dims = element.dimensions;

  return (
    <ScrollArea className="h-full">
      <div className="p-3">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Box className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white truncate">{element.name}</h3>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            <Badge variant="secondary" className="text-[10px] bg-emerald-500/20 text-emerald-300 border-0">
              {element.type.replace("Ifc", "")}
            </Badge>
            <Badge variant="secondary" className="text-[10px] bg-slate-700 text-slate-300 border-0">
              {element.category}
            </Badge>
          </div>
        </div>

        <Separator className="bg-slate-700 mb-4" />

        {/* ─── GEOMETRY ─── */}
        <PropertySection title="Geometry Dimensions">
          <DimensionRow label="Length" value={dims.length} icon={<Maximize className="w-3.5 h-3.5 text-slate-500" />} />
          <DimensionRow label="Width" value={dims.width} icon={<Minimize className="w-3.5 h-3.5 text-slate-500" />} />
          <DimensionRow label="Thickness / Height" value={dims.height} icon={<Layers className="w-3.5 h-3.5 text-slate-500" />} />
          <div className="border-t border-slate-700/50 my-1" />
          <DimensionRow label="Surface Area" value={dims.area} icon={<Square className="w-3.5 h-3.5 text-slate-500" />} />
          <DimensionRow label="Volume" value={dims.volume} icon={<BoxSelect className="w-3.5 h-3.5 text-slate-500" />} />
        </PropertySection>

        <Separator className="bg-slate-700 mb-4" />

        {/* Identity */}
        <PropertySection title="Identity Data">
          <PropertyRow label="Express ID" value={element.expressID} icon={<Hash className="w-3.5 h-3.5 text-slate-500" />} />
          <PropertyRow label="Name" value={element.name} icon={<FileText className="w-3.5 h-3.5 text-slate-500" />} />
          <PropertyRow label="IFC Type" value={element.type} icon={<Type className="w-3.5 h-3.5 text-slate-500" />} />
          <PropertyRow label="Category" value={element.category} icon={<Tag className="w-3.5 h-3.5 text-slate-500" />} />
          <PropertyRow label="Global ID" value={props?.globalId || props?.GlobalId} icon={<Globe className="w-3.5 h-3.5 text-slate-500" />} />
        </PropertySection>

        {/* Position */}
        {props?.position && (
          <PropertySection title="Position">
            <PropertyRow label="X" value={typeof props.position.x === "number" ? props.position.x.toFixed(3) : undefined} icon={<MapPin className="w-3.5 h-3.5 text-slate-500" />} />
            <PropertyRow label="Y" value={typeof props.position.y === "number" ? props.position.y.toFixed(3) : undefined} icon={<MapPin className="w-3.5 h-3.5 text-slate-500" />} />
            <PropertyRow label="Z" value={typeof props.position.z === "number" ? props.position.z.toFixed(3) : undefined} icon={<MapPin className="w-3.5 h-3.5 text-slate-500" />} />
          </PropertySection>
        )}

        {/* IFC Properties */}
        {props && typeof props === "object" && (
          <PropertySection title="IFC Properties">
            {Object.entries(props).map(([key, value]: [string, any]) => {
              if (["type", "Name", "ObjectType", "position", "normal", "globalId"].includes(key)) return null;
              let displayValue = value;
              if (typeof value === "object" && value !== null) {
                displayValue = value.value !== undefined ? value.value : JSON.stringify(value);
              }
              return (
                <PropertyRow key={key} label={key} value={displayValue} icon={<Info className="w-3.5 h-3.5 text-slate-500" />} />
              );
            })}
          </PropertySection>
        )}
      </div>
    </ScrollArea>
  );
}
