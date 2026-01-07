"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Video, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function FileUpload({ onFileSelect, disabled }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles[0]) {
        setSelectedFile(acceptedFiles[0]);
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".mov", ".avi", ".mkv", ".webm"],
    },
    maxFiles: 1,
    disabled,
  });

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
  };

  return (
    <Card
      {...getRootProps()}
      className={cn(
        "relative cursor-pointer overflow-hidden border-2 border-dashed transition-all duration-300",
        isDragActive && "border-primary bg-primary/10 scale-[1.02] shadow-[0_0_30px_hsl(270,100%,70%/0.2)]",
        disabled && "cursor-not-allowed opacity-50",
        !selectedFile && "hover:border-primary/50 hover:bg-primary/5"
      )}
    >
      <input {...getInputProps()} />
      <div className="p-12 text-center">
        <AnimatePresence mode="wait">
          {selectedFile ? (
            <motion.div
              key="selected"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-center gap-3">
                <Video className="h-8 w-8 text-primary" />
                <span className="text-lg font-medium">{selectedFile.name}</span>
                <button
                  onClick={handleRemove}
                  disabled={disabled}
                  className="rounded-full p-1 hover:bg-destructive/10 transition-colors"
                >
                  <X className="h-5 w-5 text-destructive" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-4"
            >
              <motion.div
                animate={{
                  y: isDragActive ? -10 : 0,
                  scale: isDragActive ? 1.1 : 1,
                }}
                transition={{ duration: 0.2 }}
                className="flex justify-center"
              >
                <Upload className="h-12 w-12 text-muted-foreground" />
              </motion.div>
              <div>
                <p className="text-lg font-semibold">
                  {isDragActive
                    ? "Solte o arquivo aqui"
                    : "Arraste um vídeo ou clique para selecionar"}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  MP4, MOV, AVI, MKV ou WEBM (máx. 500MB)
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}
