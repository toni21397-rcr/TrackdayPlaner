import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, Check, X, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
}

interface ParsedLap {
  lapNumber: number;
  lapTimeMs: number;
  sectorTimesMsJson?: string;
  valid: boolean;
  errors?: string[];
}

export function CSVImportDialog({ open, onOpenChange, sessionId }: CSVImportDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [parsedLaps, setParsedLaps] = useState<ParsedLap[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (laps: ParsedLap[]) => {
      const payload = laps.map(lap => ({
        sessionId,
        lapNumber: lap.lapNumber,
        lapTimeMs: lap.lapTimeMs,
        sectorTimesMsJson: lap.sectorTimesMsJson || null,
        valid: lap.valid,
      }));
      return apiRequest("POST", "/api/laps/bulk", { laps: payload });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      const count = data.imported || data.laps?.length || parsedLaps.length;
      toast({
        title: "Import successful",
        description: `Imported ${count} laps successfully.`,
      });
      setParsedLaps([]);
      setErrors([]);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import laps. Please try again.",
        variant: "destructive",
      });
    },
  });

  const parseCSV = useCallback((content: string) => {
    const lines = content.trim().split('\n');
    const laps: ParsedLap[] = [];
    const parseErrors: string[] = [];

    // Skip header row if present
    const startIndex = lines[0].toLowerCase().includes('lap') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',').map(p => p.trim());
      const rowNumber = i + 1;
      const lapErrors: string[] = [];

      // Parse lap number
      const lapNumber = parseInt(parts[0]);
      if (isNaN(lapNumber) || lapNumber < 1) {
        lapErrors.push(`Invalid lap number: ${parts[0]}`);
      }

      // Parse lap time (supports formats: 1:23.456, 83.456, 83456)
      let lapTimeMs = 0;
      const timeStr = parts[1];
      if (timeStr.includes(':')) {
        // Format: M:SS.mmm
        const [minutes, seconds] = timeStr.split(':');
        const mins = parseInt(minutes);
        const secs = parseFloat(seconds);
        if (isNaN(mins) || isNaN(secs)) {
          lapErrors.push(`Invalid time format: ${timeStr}`);
        } else {
          lapTimeMs = (mins * 60 + secs) * 1000;
        }
      } else if (timeStr.includes('.')) {
        // Format: seconds.milliseconds
        const seconds = parseFloat(timeStr);
        if (isNaN(seconds)) {
          lapErrors.push(`Invalid time format: ${timeStr}`);
        } else {
          lapTimeMs = seconds * 1000;
        }
      } else {
        // Format: milliseconds
        lapTimeMs = parseInt(timeStr);
        if (isNaN(lapTimeMs)) {
          lapErrors.push(`Invalid time format: ${timeStr}`);
        }
      }

      // Parse sector times (optional, comma-separated after lap time)
      let sectorTimesMsJson: string | undefined;
      if (parts.length > 2) {
        const sectorTimes = parts.slice(2).map(s => {
          const ms = parseFloat(s) * 1000;
          return isNaN(ms) ? 0 : ms;
        });
        if (sectorTimes.some(s => s > 0)) {
          sectorTimesMsJson = JSON.stringify(sectorTimes);
        }
      }

      if (lapErrors.length > 0) {
        parseErrors.push(`Row ${rowNumber}: ${lapErrors.join(', ')}`);
      } else {
        laps.push({
          lapNumber,
          lapTimeMs: Math.round(lapTimeMs),
          sectorTimesMsJson,
          valid: true,
          errors: lapErrors,
        });
      }
    }

    setParsedLaps(laps);
    setErrors(parseErrors);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        parseCSV(content);
      };
      reader.readAsText(file);
    } else {
      toast({
        title: "Invalid file",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
    }
  }, [parseCSV, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        parseCSV(content);
      };
      reader.readAsText(file);
    }
  }, [parseCSV]);

  const formatLapTime = (ms: number) => {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(3);
    return `${minutes}:${seconds.padStart(6, '0')}`;
  };

  const handleImport = () => {
    if (parsedLaps.length > 0) {
      mutation.mutate(parsedLaps);
    }
  };

  const handleClose = () => {
    setParsedLaps([]);
    setErrors([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Lap Times from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with lap data. Format: lap number, time (M:SS.mmm or seconds), optional sector times
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {parsedLaps.length === 0 ? (
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              data-testid="drop-zone-csv"
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                Drop CSV file here or click to browse
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Supports lap data with format: lap#, time, sector1, sector2, ...
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
                id="csv-file-input"
                data-testid="input-csv-file"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('csv-file-input')?.click()}
                data-testid="button-browse-file"
              >
                <FileText className="w-4 h-4 mr-2" />
                Browse Files
              </Button>
              
              <div className="mt-6 p-4 bg-muted rounded-md text-left">
                <p className="text-sm font-semibold mb-2">Example CSV format:</p>
                <code className="text-xs block">
                  Lap,Time,Sector1,Sector2<br />
                  1,1:23.456,45.2,38.256<br />
                  2,1:22.891,44.8,38.091<br />
                  3,83.120,44.5,38.620
                </code>
              </div>
            </div>
          ) : (
            <>
              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-1">Parsing Errors:</p>
                    <ul className="list-disc list-inside text-sm">
                      {errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-muted p-3 rounded-md flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="font-semibold">
                    {parsedLaps.length} laps ready to import
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setParsedLaps([]);
                    setErrors([]);
                  }}
                  data-testid="button-clear-import"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lap #</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                      <TableHead className="text-right">Sectors</TableHead>
                      <TableHead className="text-center">Valid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedLaps.map((lap, index) => (
                      <TableRow key={index} data-testid={`row-parsed-lap-${index}`}>
                        <TableCell className="font-medium">{lap.lapNumber}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatLapTime(lap.lapTimeMs)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {lap.sectorTimesMsJson 
                            ? JSON.parse(lap.sectorTimesMsJson)
                                .map((ms: number) => (ms / 1000).toFixed(3))
                                .join(', ')
                            : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          {lap.valid ? (
                            <Check className="w-4 h-4 mx-auto text-green-600" />
                          ) : (
                            <X className="w-4 h-4 mx-auto text-red-600" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            data-testid="button-cancel-import"
          >
            Cancel
          </Button>
          {parsedLaps.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={mutation.isPending || errors.length > 0}
              data-testid="button-confirm-import"
            >
              {mutation.isPending ? "Importing..." : `Import ${parsedLaps.length} Laps`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
