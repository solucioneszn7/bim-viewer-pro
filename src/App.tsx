import { useRef, useState } from "react";
import { useBIMViewer } from "./hooks/useBIMViewer";
import { Toolbar } from "./components/Toolbar";
import { ModelTree } from "./components/ModelTree";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { IssuesPanel } from "./components/IssuesPanel";
import { UploadDialog } from "./components/UploadDialog";
import { MeasurementsPanel } from "./components/MeasurementsPanel";
import { ClippingPanel } from "./components/ClippingPanel";
import { PlanManager } from "./components/PlanManager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Upload,
  Building2,
  Loader2,
  Ruler,
  Scissors,
  PersonStanding,
  Map,
  Zap,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    isInitialized,
    isLoading,
    loadingProgress,
    selectedElement,
    elements,
    issues,
    models,
    categories,
    toolMode,
    activeMeasurements,
    activeClipPlanes,
    hiddenMeshes,
    isolatedMesh,
    categoryFilter,
    loadIfc,
    loadSampleModel,
    setMode,
    resetView,
    zoomToSelection,
    hideElement,
    showElement,
    isolateElement,
    showAll,
    filterByCategory,
    takeScreenshot,
    clearMeasurements,
    clearClipPlanes,
    addIssue,
    updateIssue,
    deleteIssue,
    zoomToIssue,
    addCommentToIssue,
    selectElement,
    navMode,
    setNavMode,
  } = useBIMViewer(containerRef);

  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("properties");

  const handleLoadSample = () => {
    loadSampleModel();
    toast.success("Sample building loaded! Use the tools to explore.");
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f172a] text-white overflow-hidden">
      {/* ─── Header ─── */}
      <header className="h-12 bg-[#1e293b] border-b border-[#334155] flex items-center justify-between px-3 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-emerald-400" />
          <h1 className="text-lg font-semibold text-white">BIM Viewer Pro</h1>
          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">v3.0</span>
          <Badge className="text-[9px] h-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-1.5 gap-0.5">
            <Zap className="w-2.5 h-2.5" /> PRO
          </Badge>
          {navMode === "firstperson" && (
            <Badge className="text-[9px] h-4 bg-sky-500/20 text-sky-300 border-sky-500/30 px-1.5 gap-0.5">
              <PersonStanding className="w-2.5 h-2.5" /> Escala Humana
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {models.length === 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleLoadSample}
                className="border-slate-600 hover:bg-slate-700 text-slate-200"
              >
                <Building2 className="w-4 h-4 mr-1" />
                Load Sample
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => setUploadOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Upload className="w-4 h-4 mr-1" />
                Load IFC
              </Button>
            </>
          )}
          {models.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setUploadOpen(true)}
              className="border-slate-600 hover:bg-slate-700 text-slate-200"
            >
              <Upload className="w-4 h-4 mr-1" />
              Load Another IFC
            </Button>
          )}
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div
          className="flex flex-col bg-[#1e293b] border-r border-[#334155] overflow-hidden transition-all duration-300 ease-in-out shrink-0"
          style={{ width: leftPanelOpen ? 290 : 0, opacity: leftPanelOpen ? 1 : 0 }}
        >
          <div className="flex items-center justify-between p-2 border-b border-[#334155] shrink-0 min-w-[290px]">
            <span className="text-sm font-medium text-slate-200">Model Browser</span>
            <button onClick={() => setLeftPanelOpen(false)} className="p-1 hover:bg-slate-700 rounded">
              <PanelLeftClose className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden min-w-[290px]">
            <ModelTree
              elements={elements}
              models={models}
              categories={categories}
              selectedElement={selectedElement}
              categoryFilter={categoryFilter}
              hiddenMeshes={hiddenMeshes}
              isolatedMesh={isolatedMesh}
              onElementSelect={selectElement}
              onHideElement={hideElement}
              onShowElement={showElement}
              onIsolateElement={isolateElement}
              onFilterByCategory={filterByCategory}
              onShowAll={showAll}
            />
          </div>
        </div>

        {!leftPanelOpen && (
          <button
            onClick={() => setLeftPanelOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-[#1e293b] border border-[#334155] rounded-r-md p-1.5 hover:bg-slate-700"
          >
            <PanelLeftOpen className="w-4 h-4 text-slate-400" />
          </button>
        )}

        {/* Center - 3D Viewer */}
        <div className="flex-1 flex flex-col relative min-w-0">
          {/* Toolbar */}
          {isInitialized && models.length > 0 && (
            <Toolbar
              toolMode={toolMode}
              navMode={navMode}
              onSetMode={setMode}
              onSetNavMode={setNavMode}
              onResetView={resetView}
              onZoomToSelection={zoomToSelection}
              onShowAll={showAll}
              onScreenshot={takeScreenshot}
              onAddIssue={() => setActiveTab("issues")}
              onClearMeasurements={clearMeasurements}
              onClearClipPlanes={clearClipPlanes}
              hasSelection={!!selectedElement}
              activeMeasurementsCount={activeMeasurements.length}
              activeClipPlanesCount={activeClipPlanes.length}
            />
          )}

          {/* Mode indicator */}
          {(toolMode || navMode === "firstperson") && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1">
              {navMode === "firstperson" && (
                <div className="bg-sky-600/90 text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg backdrop-blur-sm">
                  <span className="flex items-center gap-1">
                    <PersonStanding className="w-3 h-3" /> WASD mover · Drag rotar · ESC orbit
                  </span>
                </div>
              )}
              {toolMode === "measure" && (
                <div className="bg-emerald-600 text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg">
                  <span className="flex items-center gap-1">
                    <Ruler className="w-3 h-3" /> Click two points to measure
                  </span>
                </div>
              )}
              {toolMode === "clip" && (
                <div className="bg-emerald-600 text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg">
                  <span className="flex items-center gap-1">
                    <Scissors className="w-3 h-3" /> Click on a face to create section plane
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 3D Canvas */}
          <div className="flex-1 relative">
            <div ref={containerRef} className="w-full h-full" style={{ background: "#0f172a" }} />

            {isLoading && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20">
                <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
                <p className="text-white text-lg font-medium mb-2">Loading IFC Model...</p>
                <div className="w-64 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${loadingProgress}%` }} />
                </div>
                <p className="text-slate-400 text-sm mt-2">{loadingProgress}%</p>
              </div>
            )}

            {!isLoading && models.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <Building2 className="w-20 h-20 text-slate-600 mb-6" />
                <h2 className="text-2xl font-semibold text-slate-300 mb-2">BIM Viewer Pro</h2>
                <p className="text-slate-400 mb-6 text-center max-w-md">
                  Professional IFC model viewer with measurement tools, section planes, BCF issue management, and real-time collaboration.
                </p>
                <div className="flex gap-3">
                  <Button onClick={handleLoadSample} variant="outline" className="border-slate-600 hover:bg-slate-700 text-slate-200">
                    <Building2 className="w-4 h-4 mr-2" />
                    Load Sample Building
                  </Button>
                  <Button onClick={() => setUploadOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload IFC File
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {!rightPanelOpen && (
          <button
            onClick={() => setRightPanelOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-[#1e293b] border border-[#334155] rounded-l-md p-1.5 hover:bg-slate-700"
          >
            <PanelRightOpen className="w-4 h-4 text-slate-400" />
          </button>
        )}

        {/* Right Panel */}
        <div
          className="flex flex-col bg-[#1e293b] border-l border-[#334155] overflow-hidden transition-all duration-300 ease-in-out shrink-0"
          style={{ width: rightPanelOpen ? 340 : 0, opacity: rightPanelOpen ? 1 : 0 }}
        >
          <div className="flex items-center justify-between p-2 border-b border-[#334155] shrink-0 min-w-[340px]">
            <span className="text-sm font-medium text-slate-200">Inspector</span>
            <button onClick={() => setRightPanelOpen(false)} className="p-1 hover:bg-slate-700 rounded">
              <PanelRightClose className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden min-w-[340px]">
            <TabsList className="w-full bg-[#0f172a] border-b border-[#334155] rounded-none shrink-0 flex flex-wrap">
              <TabsTrigger value="properties" className="flex-1 data-[state=active]:bg-[#1e293b] data-[state=active]:text-emerald-400 text-slate-400 text-[10px]">Props</TabsTrigger>
              <TabsTrigger value="issues" className="flex-1 data-[state=active]:bg-[#1e293b] data-[state=active]:text-emerald-400 text-slate-400 text-[10px]">Issues ({issues.length})</TabsTrigger>
              <TabsTrigger value="measurements" className="flex-1 data-[state=active]:bg-[#1e293b] data-[state=active]:text-emerald-400 text-slate-400 text-[10px]">Medidas</TabsTrigger>
              <TabsTrigger value="clipping" className="flex-1 data-[state=active]:bg-[#1e293b] data-[state=active]:text-emerald-400 text-slate-400 text-[10px]">Cortes</TabsTrigger>
              <TabsTrigger value="plans" className="flex-1 data-[state=active]:bg-[#1e293b] data-[state=active]:text-emerald-400 text-slate-400 text-[10px] gap-0.5">
                <Map className="w-3 h-3" /> Planos
              </TabsTrigger>
            </TabsList>
            <TabsContent value="properties" className="flex-1 m-0 overflow-hidden">
              <PropertiesPanel element={selectedElement} />
            </TabsContent>
            <TabsContent value="issues" className="flex-1 m-0 overflow-hidden">
              <IssuesPanel
                issues={issues}
                onAddIssue={addIssue}
                onUpdateIssue={updateIssue}
                onDeleteIssue={deleteIssue}
                onZoomToIssue={zoomToIssue}
                onAddComment={addCommentToIssue}
                onTakeScreenshot={takeScreenshot}
                selectedElement={selectedElement}
              />
            </TabsContent>
            <TabsContent value="measurements" className="flex-1 m-0 overflow-hidden">
              <MeasurementsPanel measurements={activeMeasurements} onClear={clearMeasurements} />
            </TabsContent>
            <TabsContent value="clipping" className="flex-1 m-0 overflow-hidden">
              <ClippingPanel clipPlanes={activeClipPlanes} onClear={clearClipPlanes} />
            </TabsContent>
            <TabsContent value="plans" className="flex-1 m-0 overflow-hidden">
              <PlanManager />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onFileLoad={loadIfc} />
      <Toaster position="bottom-right" toastOptions={{ style: { background: "#1e293b", color: "#fff", border: "1px solid #334155" } }} />
    </div>
  );
}

export default App;
