import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BIMIssue, BIMElement } from "@/hooks/useBIMViewer";
import {
  Plus,
  AlertCircle,
  Clock,
  User,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Camera,
  ZoomIn,
  Send,
  Download,
} from "lucide-react";

interface IssuesPanelProps {
  issues: BIMIssue[];
  onAddIssue: (issue: Omit<BIMIssue, "id" | "date" | "comments">) => void;
  onUpdateIssue: (id: string, updates: Partial<BIMIssue>) => void;
  onDeleteIssue: (id: string) => void;
  onZoomToIssue: (issue: BIMIssue) => void;
  onAddComment: (issueId: string, comment: { author: string; text: string }) => void;
  onTakeScreenshot: () => string;
  selectedElement: BIMElement | null;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  open: { color: "bg-red-500/20 text-red-300", icon: <AlertCircle className="w-3 h-3" /> },
  in_progress: { color: "bg-amber-500/20 text-amber-300", icon: <Clock className="w-3 h-3" /> },
  resolved: { color: "bg-emerald-500/20 text-emerald-300", icon: <CheckCircle2 className="w-3 h-3" /> },
  closed: { color: "bg-slate-500/20 text-slate-300", icon: <XCircle className="w-3 h-3" /> },
};

const priorityConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  critical: { color: "text-red-400", label: "Critical", icon: <AlertTriangle className="w-3 h-3" /> },
  high: { color: "text-orange-400", label: "High", icon: <AlertTriangle className="w-3 h-3" /> },
  medium: { color: "text-amber-400", label: "Medium", icon: <AlertCircle className="w-3 h-3" /> },
  low: { color: "text-slate-400", label: "Low", icon: <MessageSquare className="w-3 h-3" /> },
};

export function IssuesPanel({
  issues,
  onAddIssue,
  onUpdateIssue,
  onDeleteIssue,
  onZoomToIssue,
  onAddComment,
  selectedElement,
}: IssuesPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingIssue, setEditingIssue] = useState<BIMIssue | null>(null);
  const [viewingIssue, setViewingIssue] = useState<BIMIssue | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [commentText, setCommentText] = useState("");
  const [newIssue, setNewIssue] = useState({
    title: "",
    description: "",
    status: "open" as BIMIssue["status"],
    priority: "medium" as BIMIssue["priority"],
  });

  const handleCreateIssue = () => {
    if (!newIssue.title.trim()) return;
    onAddIssue({
      title: newIssue.title,
      description: newIssue.description,
      status: newIssue.status,
      priority: newIssue.priority,
      elementId: selectedElement?.expressID,
      elementName: selectedElement?.name,
      author: "Current User",
    });
    setNewIssue({ title: "", description: "", status: "open", priority: "medium" });
    setIsCreating(false);
  };

  const handleUpdateIssue = () => {
    if (!editingIssue) return;
    onUpdateIssue(editingIssue.id, editingIssue);
    setEditingIssue(null);
  };

  const filteredIssues = issues.filter(i => filter === "all" || i.status === filter);

  /* Export BCF zip */
  const exportBCF = async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("bcf.version", `<?xml version="1.0" encoding="UTF-8"?>
<Version VersionId="3.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="version.xsd">
  <DetailedVersion>3.0</DetailedVersion>
</Version>`);

    issues.forEach(issue => {
      const folderName = issue.id;
      const markup = `<?xml version="1.0" encoding="UTF-8"?>
<Markup xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Topic Guid="${issue.id}" TopicType="Coordination" TopicStatus="${issue.status}">
    <Title>${issue.title}</Title>
    <Priority>${issue.priority}</Priority>
    <CreationDate>${issue.date}</CreationDate>
    <CreationAuthor>${issue.author}</CreationAuthor>
    <Description>${issue.description}</Description>
  </Topic>
</Markup>`;
      zip.folder(folderName)?.file("markup.bcf", markup);
      if (issue.screenshot) {
        const base64 = issue.screenshot.split(",")[1];
        if (base64) zip.folder(folderName)?.file("snapshot.png", base64, { base64: true });
      }
      if (issue.viewpoint) {
        const vp = issue.viewpoint;
        const viewpoint = `<?xml version="1.0" encoding="UTF-8"?>
<VisualizationInfo Guid="${issue.id}">
  <PerspectiveCamera>
    <CameraViewPoint><X>${vp.cameraPosition.x}</X><Y>${vp.cameraPosition.y}</Y><Z>${vp.cameraPosition.z}</Z></CameraViewPoint>
    <CameraDirection><X>${vp.cameraTarget.x - vp.cameraPosition.x}</X><Y>${vp.cameraTarget.y - vp.cameraPosition.y}</Y><Z>${vp.cameraTarget.z - vp.cameraPosition.z}</Z></CameraDirection>
    <CameraUpVector><X>0</X><Y>0</Y><Z>1</Z></CameraUpVector>
    <FieldOfView>${vp.fieldOfView || 60}</FieldOfView>
  </PerspectiveCamera>
</VisualizationInfo>`;
        zip.folder(folderName)?.file("viewpoint.bcfv", viewpoint);
      }
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bcf-export-${Date.now()}.bcf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-2 border-b border-[#334155] flex items-center justify-between gap-1">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-7 text-xs bg-slate-800 border-slate-600 text-slate-200 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            <SelectItem value="all" className="text-xs text-slate-200">All ({issues.length})</SelectItem>
            <SelectItem value="open" className="text-xs text-red-400">Open</SelectItem>
            <SelectItem value="in_progress" className="text-xs text-amber-400">In Progress</SelectItem>
            <SelectItem value="resolved" className="text-xs text-emerald-400">Resolved</SelectItem>
            <SelectItem value="closed" className="text-xs text-slate-400">Closed</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1">
          {issues.length > 0 && (
            <Button size="sm" variant="ghost" onClick={exportBCF} className="h-7 px-2 text-xs text-slate-400 hover:text-emerald-300 hover:bg-slate-700" title="Export BCF">
              <Download className="w-3.5 h-3.5 mr-1" /> BCF
            </Button>
          )}
          <Button size="sm" onClick={() => setIsCreating(true)} className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> New
          </Button>
        </div>
      </div>

      {/* Create form */}
      {isCreating && (
        <div className="p-3 border-b border-[#334155] bg-slate-800/50">
          <h4 className="text-xs font-medium text-slate-200 mb-2">Create BCF Issue</h4>
          <Input
            placeholder="Issue title..."
            value={newIssue.title}
            onChange={e => setNewIssue({ ...newIssue, title: e.target.value })}
            className="h-7 text-xs mb-2 bg-slate-700 border-slate-600 text-slate-200"
          />
          <Textarea
            placeholder="Description..."
            value={newIssue.description}
            onChange={e => setNewIssue({ ...newIssue, description: e.target.value })}
            className="text-xs mb-2 bg-slate-700 border-slate-600 text-slate-200 min-h-[50px]"
          />
          <div className="flex gap-2 mb-2">
            <Select value={newIssue.priority} onValueChange={v => setNewIssue({ ...newIssue, priority: v as BIMIssue["priority"] })}>
              <SelectTrigger className="h-7 text-xs bg-slate-700 border-slate-600 text-slate-200 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="critical" className="text-xs text-red-400">Critical</SelectItem>
                <SelectItem value="high" className="text-xs text-orange-400">High</SelectItem>
                <SelectItem value="medium" className="text-xs text-amber-400">Medium</SelectItem>
                <SelectItem value="low" className="text-xs text-slate-400">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {selectedElement && (
            <p className="text-[10px] text-slate-500 mb-2">Linked to: <span className="text-emerald-400">{selectedElement.name}</span></p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreateIssue} className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-xs flex-1">
              <Camera className="w-3 h-3 mr-1" /> Create with Viewpoint
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)} className="h-7 px-3 text-xs text-slate-400 hover:text-white hover:bg-slate-700">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredIssues.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No issues</p>
              <p className="text-[10px] text-slate-500 mt-1">Create a BCF issue to track coordination tasks.</p>
            </div>
          ) : (
            filteredIssues.map(issue => (
              <div
                key={issue.id}
                className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer"
                onClick={() => setViewingIssue(issue)}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <h5 className="text-xs font-medium text-slate-200 flex-1 mr-2">{issue.title}</h5>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={e => { e.stopPropagation(); onZoomToIssue(issue); }} className="p-1 hover:bg-slate-700 rounded" title="Zoom to viewpoint">
                      <ZoomIn className="w-3 h-3 text-sky-400" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setEditingIssue(issue); }} className="p-1 hover:bg-slate-700 rounded">
                      <Edit3 className="w-3 h-3 text-slate-500" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); onDeleteIssue(issue.id); }} className="p-1 hover:bg-slate-700 rounded">
                      <Trash2 className="w-3 h-3 text-slate-500" />
                    </button>
                  </div>
                </div>

                {issue.elementName && (
                  <p className="text-[10px] text-slate-500 mb-1">Element: <span className="text-slate-300">{issue.elementName}</span></p>
                )}

                <div className="flex items-center justify-between mt-1">
                  <div className="flex gap-1">
                    <Badge variant="secondary" className={`text-[10px] h-4 ${statusConfig[issue.status]?.color}`}>
                      <span className="flex items-center gap-0.5">{statusConfig[issue.status]?.icon} {issue.status.replace("_", " ")}</span>
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] h-4 bg-transparent border-0">
                      <span className={`flex items-center gap-0.5 ${priorityConfig[issue.priority]?.color}`}>
                        {priorityConfig[issue.priority]?.icon} {priorityConfig[issue.priority]?.label}
                      </span>
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <User className="w-3 h-3" /> {issue.author}
                  </div>
                </div>

                {issue.comments.length > 0 && (
                  <p className="text-[10px] text-slate-500 mt-1.5">{issue.comments.length} comments</p>
                )}

                {issue.screenshot && (
                  <img src={issue.screenshot} alt="snapshot" className="mt-1.5 w-full h-16 object-cover rounded border border-slate-700" />
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* View Issue Dialog */}
      {viewingIssue && (
        <Dialog open={!!viewingIssue} onOpenChange={() => { setViewingIssue(null); setCommentText(""); }}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                {viewingIssue.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="flex gap-2">
                <Badge variant="secondary" className={`text-[10px] ${statusConfig[viewingIssue.status]?.color}`}>
                  {viewingIssue.status.replace("_", " ")}
                </Badge>
                <Badge variant="secondary" className="text-[10px] bg-transparent border-0">
                  <span className={priorityConfig[viewingIssue.priority]?.color}>{priorityConfig[viewingIssue.priority]?.label}</span>
                </Badge>
              </div>

              <p className="text-xs text-slate-300">{viewingIssue.description}</p>

              {viewingIssue.elementName && (
                <p className="text-[11px] text-slate-400">Linked element: <span className="text-emerald-400">{viewingIssue.elementName}</span></p>
              )}

              {viewingIssue.screenshot && (
                <img src={viewingIssue.screenshot} alt="Viewpoint snapshot" className="w-full rounded border border-slate-700" />
              )}

              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <User className="w-3 h-3" /> {viewingIssue.author} · {viewingIssue.date}
              </div>

              <Separator className="bg-slate-700" />

              {/* Comments */}
              <div className="space-y-2">
                <h4 className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Comments ({viewingIssue.comments.length})</h4>
                {viewingIssue.comments.map((c, i) => (
                  <div key={i} className="bg-slate-900/50 rounded p-2 text-xs">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
                      <User className="w-3 h-3" /> {c.author} · {c.date}
                    </div>
                    <p className="text-slate-300">{c.text}</p>
                  </div>
                ))}
                <div className="flex gap-1">
                  <Input
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    className="h-7 text-xs bg-slate-700 border-slate-600 text-slate-200"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!commentText.trim()) return;
                      onAddComment(viewingIssue.id, { author: "Current User", text: commentText });
                      setCommentText("");
                    }}
                    className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="ghost" onClick={() => { onZoomToIssue(viewingIssue); setViewingIssue(null); }} className="text-xs text-sky-400 hover:text-sky-300 hover:bg-slate-700 flex-1">
                  <ZoomIn className="w-3.5 h-3.5 mr-1" /> Zoom to Viewpoint
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setViewingIssue(null)} className="text-xs text-slate-400 hover:text-white hover:bg-slate-700">
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editingIssue && (
        <Dialog open={!!editingIssue} onOpenChange={() => setEditingIssue(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-sm">
            <DialogHeader><DialogTitle className="text-sm">Edit Issue</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <Input
                value={editingIssue.title}
                onChange={e => setEditingIssue({ ...editingIssue, title: e.target.value })}
                className="text-xs bg-slate-700 border-slate-600 text-slate-200"
              />
              <Textarea
                value={editingIssue.description}
                onChange={e => setEditingIssue({ ...editingIssue, description: e.target.value })}
                className="text-xs bg-slate-700 border-slate-600 text-slate-200 min-h-[60px]"
              />
              <Select value={editingIssue.status} onValueChange={v => setEditingIssue({ ...editingIssue, status: v as BIMIssue["status"] })}>
                <SelectTrigger className="text-xs bg-slate-700 border-slate-600 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="open" className="text-xs text-red-400">Open</SelectItem>
                  <SelectItem value="in_progress" className="text-xs text-amber-400">In Progress</SelectItem>
                  <SelectItem value="resolved" className="text-xs text-emerald-400">Resolved</SelectItem>
                  <SelectItem value="closed" className="text-xs text-slate-400">Closed</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button onClick={handleUpdateIssue} className="bg-emerald-600 hover:bg-emerald-700 text-xs flex-1">Save</Button>
                <Button variant="ghost" onClick={() => setEditingIssue(null)} className="text-xs text-slate-400 hover:text-white hover:bg-slate-700">Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
