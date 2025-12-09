import React, { useCallback } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseExcelFile, parseTextFile } from '@/utils/dataParser';
import { IndentationData } from '@/types/indentation';
import { toast } from 'sonner';

interface FileUploaderProps {
  onDataLoaded: (data: IndentationData) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onDataLoaded,
  isLoading,
  setIsLoading,
}) => {
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsLoading(true);

      try {
        let data: IndentationData;

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          data = await parseExcelFile(file);
        } else {
          data = await parseTextFile(file);
        }

        onDataLoaded(data);
        toast.success(`Loaded ${data.points.length} data points`);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Failed to parse file. Please check the format.');
      } finally {
        setIsLoading(false);
      }
    },
    [onDataLoaded, setIsLoading]
  );

  return (
    <div className="space-y-3">
      <label className="font-mono text-xs font-bold uppercase tracking-wide text-foreground">
        Data File
      </label>
      
      <div className="relative">
        <input
          type="file"
          accept=".txt,.csv,.tsv,.xlsx,.xls"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          disabled={isLoading}
        />
        <Button
          variant="outline"
          className="w-full justify-start font-mono text-sm"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-foreground border-t-transparent animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </>
          )}
        </Button>
      </div>
      
      <p className="text-xs font-mono text-muted-foreground">
        Supports: .txt, .csv, .tsv, .xlsx, .xls
      </p>
    </div>
  );
};
