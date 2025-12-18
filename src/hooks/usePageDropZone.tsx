import { useState, useCallback, useEffect } from 'react';
import { parseExcelFile, parseTextFile } from '@/utils/dataParser';
import { IndentationData } from '@/types/indentation';
import { toast } from 'sonner';

interface UsePageDropZoneOptions {
  onDataLoaded: (data: IndentationData, fileName: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const usePageDropZone = ({
  onDataLoaded,
  isLoading,
  setIsLoading,
}: UsePageDropZoneOptions) => {
  const [isDraggingOverPage, setIsDraggingOverPage] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const processFiles = useCallback(
    async (files: File[]) => {
      if (!files || files.length === 0) return;

      setIsLoading(true);
      let successCount = 0;
      let failCount = 0;

      for (const file of files) {
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

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer?.types.includes('Files')) {
      setIsDraggingOverPage(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDraggingOverPage(false);
      }
      return newCount;
    });
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter(0);
      setIsDraggingOverPage(false);

      if (isLoading) return;

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

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
    },
    [isLoading, processFiles]
  );

  useEffect(() => {
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return { isDraggingOverPage };
};
