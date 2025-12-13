import React, { useCallback } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseExcelFile, parseTextFile } from '@/utils/dataParser';
import { IndentationData } from '@/types/indentation';
import { toast } from 'sonner';

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
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
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
      // Reset input so same files can be re-uploaded
      event.target.value = '';
    },
    [onDataLoaded, setIsLoading]
  );

  return (
    <div className="space-y-2">
      <label className="font-mono text-xs font-bold uppercase tracking-wide text-foreground">
        Data File
      </label>
      
      <div className="relative">
        <input
          type="file"
          accept=".txt,.csv,.tsv,.xlsx,.xls"
          multiple
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          disabled={isLoading}
        />
        <Button
          variant="outline"
          className="w-full justify-start font-mono text-xs h-8"
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
              Upload File(s)
            </>
          )}
        </Button>
      </div>
      
      <p className="text-[10px] font-mono text-muted-foreground">
        .txt, .csv, .tsv, .xlsx, .xls (multi-select)
      </p>
    </div>
  );
};
