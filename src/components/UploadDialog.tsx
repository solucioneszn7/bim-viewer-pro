import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Upload,
  FileType,
  X,
  CheckCircle2,
  AlertTriangle,
  FileArchive,
} from "lucide-react";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileLoad: (file: File) => void;
}

export function UploadDialog({ open, onOpenChange, onFileLoad }: UploadDialogProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValidExtension = (name: string): boolean => {
    const lower = name.toLowerCase();
    return lower.endsWith(".ifc") || 
           lower.endsWith(".ifczip") || 
           lower.endsWith(".ifcxml") ||
           lower.endsWith(".zip");
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (isValidExtension(file.name)) {
        setSelectedFile(file);
      } else {
        toast.error("Please upload a valid IFC file (.ifc, .ifcZIP, .ifcXML, .zip)");
      }
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isValidExtension(file.name)) {
        setSelectedFile(file);
      } else {
        toast.error("Please upload a valid IFC file (.ifc, .ifcZIP, .ifcXML, .zip)");
      }
    }
  }, []);

  const handleUpload = useCallback(() => {
    if (selectedFile) {
      onFileLoad(selectedFile);
      setSelectedFile(null);
      onOpenChange(false);
      toast.success(`Loading ${selectedFile.name}...`);
    }
  }, [selectedFile, onFileLoad, onOpenChange]);

  const handleClose = useCallback(() => {
    setSelectedFile(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <FileType className="w-5 h-5 text-emerald-400" />
            Load IFC Model
          </DialogTitle>
        </DialogHeader>

        <div className="pt-2">
          {/* Drop Zone */}
          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-emerald-400 bg-emerald-500/10"
                  : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".ifc,.ifcXML,.ifcZIP,.zip"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <p className="text-sm text-slate-300 mb-1">
                Drag & drop your IFC file here
              </p>
              <p className="text-xs text-slate-500 mb-3">or click to browse</p>
              <div className="flex items-center justify-center gap-1 text-[10px] text-slate-600">
                <FileType className="w-3 h-3" />
                <span>.ifc</span>
                <span className="mx-1">|</span>
                <FileArchive className="w-3 h-3" />
                <span>.ifcZIP / .zip</span>
                <span className="mx-1">|</span>
                <span>.ifcXML</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate font-medium">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="p-1 hover:bg-slate-600 rounded transition-colors shrink-0"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <AlertTriangle className="w-3 h-3" />
                <span>Large files may take a moment to process</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4 mr-2" />
              Load Model
            </Button>
            <Button
              variant="ghost"
              onClick={handleClose}
              className="text-slate-400 hover:text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
