import React, { useCallback, useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseExcelFile, parseTextFile } from '@/utils/dataParser';
import { IndentationData } from '@/types/indentation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  onDataLoaded: (data: IndentationData, fileName: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onDataLoaded,
  isLoading,
  setIsLoading,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedFiles, setDraggedFiles] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!files || files.length === 0) return;

      setIsLoading(true);
      let successCount = 0;
      let failCount = 0;

      for (const file of Array.from(files)) {
        try {
          let data: IndentationData;

          if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            data = await parseExcelFile(file);
          } else {
            data = await parseTextFile(file);
          }

          onDataLoaded(data, file.name);
          successCount++;
        } catch (error) {
          console.error(`Error parsing file ${file.name}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Loaded ${successCount} file${successCount > 1 ? 's' : ''}`);
      }
      if (failCount > 0) {
        toast.error(`Failed to parse ${failCount} file${failCount > 1 ? 's' : ''}`);
      }

      setIsLoading(false);
    },
    [onDataLoaded, setIsLoading]
  );

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files) {
        await processFiles(files);
      }
      // Reset input so same files can be re-uploaded
      event.target.value = '';
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) {
      setIsDragOver(true);
      // Show file names being dragged
      if (e.dataTransfer.items) {
        const names: string[] = [];
        for (let i = 0; i < Math.min(e.dataTransfer.items.length, 5); i++) {
          const item = e.dataTransfer.items[i];
          if (item.kind === 'file') {
            names.push(`File ${i + 1}`);
          }
        }
        if (e.dataTransfer.items.length > 5) {
          names.push(`+${e.dataTransfer.items.length - 5} more`);
        }
        setDraggedFiles(names);
      }
    }
  }, [isLoading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDraggedFiles([]);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setDraggedFiles([]);

      if (isLoading) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        // Filter to only accepted file types
        const acceptedFiles = Array.from(files).filter((file) => {
          const ext = file.name.toLowerCase();
          return (
            ext.endsWith('.txt') ||
            ext.endsWith('.csv') ||
            ext.endsWith('.tsv') ||
            ext.endsWith('.xlsx') ||
            ext.endsWith('.xls')
          );
        });

        if (acceptedFiles.length === 0) {
          toast.error('No valid files. Accepted: .txt, .csv, .tsv, .xlsx, .xls');
          return;
        }

        if (acceptedFiles.length < files.length) {
          toast.warning(
            `${files.length - acceptedFiles.length} file(s) skipped (unsupported format)`
          );
        }

        await processFiles(acceptedFiles);
      }
    },
    [isLoading, processFiles]
  );

  return (
    <div className="space-y-2">
      <label className="font-mono text-xs font-bold uppercase tracking-wide text-foreground">
        Data File
      </label>

      <div
        className={cn(
          "relative rounded-md transition-all duration-200",
          isDragOver && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.csv,.tsv,.xlsx,.xls"
          multiple
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          disabled={isLoading}
        />
        
        <div
          className={cn(
            "border-2 border-dashed rounded-md p-3 transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/50"
          )}
        >
          {isDragOver ? (
            <div className="flex flex-col items-center gap-1 py-1">
              <Upload className="w-5 h-5 text-primary animate-bounce" />
              <span className="font-mono text-xs text-primary font-medium">
                Drop to upload
              </span>
              {draggedFiles.length > 0 && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {draggedFiles.join(', ')}
                </span>
              )}
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-center font-mono text-xs h-auto py-2 hover:bg-transparent"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 mr-2 border-2 border-foreground border-t-transparent animate-spin rounded-full" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-3 h-3 mr-2" />
                  Upload or drag files
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <p className="text-[10px] font-mono text-muted-foreground">
        .txt, .csv, .tsv, .xlsx, .xls (multi-select or drag & drop)
      </p>
    </div>
  );
};
