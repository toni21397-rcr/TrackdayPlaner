import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trophy, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { SessionDialog } from "@/components/session-dialog";
import { LapDialog } from "@/components/lap-dialog";
import type { TrackSession, Lap } from "@shared/schema";

interface LapsTabProps {
  trackdayId: string;
}

export function LapsTab({ trackdayId }: LapsTabProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
  const [isLapDialogOpen, setIsLapDialogOpen] = useState(false);

  const { data: sessions } = useQuery<Array<TrackSession & { laps?: Lap[] }>>({
    queryKey: ["/api/sessions", trackdayId],
  });

  const selectedSession = sessions?.find(s => s.id === selectedSessionId);
  const laps = selectedSession?.laps || [];

  const formatLapTime = (ms: number) => {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(3);
    return `${minutes}:${seconds.padStart(6, '0')}`;
  };

  const bestLap = laps.length > 0 ? Math.min(...laps.filter(l => l.valid).map(l => l.lapTimeMs)) : null;
  const avgLap = laps.length > 0 ? laps.filter(l => l.valid).reduce((sum, l) => sum + l.lapTimeMs, 0) / laps.filter(l => l.valid).length : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 flex-wrap">
          <CardTitle>Sessions & Laps</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {sessions && sessions.length > 0 && (
              <Select
                value={selectedSessionId || undefined}
                onValueChange={setSelectedSessionId}
              >
                <SelectTrigger className="w-[200px]" data-testid="select-session">
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              onClick={() => setIsSessionDialogOpen(true)}
              size="sm"
              variant="outline"
              data-testid="button-add-session"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
            {selectedSessionId && (
              <Button
                onClick={() => setIsLapDialogOpen(true)}
                size="sm"
                data-testid="button-add-lap"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Lap
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!sessions || sessions.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No sessions yet"
              description="Create a session to start tracking lap times."
              actionLabel="Add Session"
              onAction={() => setIsSessionDialogOpen(true)}
            />
          ) : !selectedSessionId ? (
            <p className="text-center text-muted-foreground py-12">
              Select a session to view lap times
            </p>
          ) : laps.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-6 pb-4 border-b">
                <div className="flex items-center gap-6">
                  {bestLap && (
                    <div>
                      <p className="text-sm text-muted-foreground">Best Lap</p>
                      <p className="text-2xl font-mono font-semibold text-green-600" data-testid="best-lap">
                        {formatLapTime(bestLap)}
                      </p>
                    </div>
                  )}
                  {avgLap && (
                    <div>
                      <p className="text-sm text-muted-foreground">Average</p>
                      <p className="text-xl font-mono font-semibold">
                        {formatLapTime(avgLap)}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" data-testid="button-import-csv">
                    <Upload className="w-4 h-4 mr-2" />
                    Import CSV
                  </Button>
                  <Button variant="outline" size="sm" data-testid="button-export-csv">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lap #</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                    <TableHead className="text-right">Gap</TableHead>
                    <TableHead className="text-center">Valid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {laps.map((lap) => (
                    <TableRow
                      key={lap.id}
                      className={lap.lapTimeMs === bestLap && lap.valid ? 'bg-green-500/10' : ''}
                    >
                      <TableCell className="font-medium">{lap.lapNumber}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatLapTime(lap.lapTimeMs)}
                        {lap.lapTimeMs === bestLap && lap.valid && (
                          <Trophy className="inline-block w-4 h-4 ml-2 text-green-600" />
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {bestLap && lap.valid ? `+${formatLapTime(lap.lapTimeMs - bestLap)}` : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {lap.valid ? '✓' : '✗'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <EmptyState
              icon={Trophy}
              title="No laps recorded"
              description="Add lap times to track your performance."
              actionLabel="Add Lap"
              onAction={() => setIsLapDialogOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      <SessionDialog
        open={isSessionDialogOpen}
        onOpenChange={setIsSessionDialogOpen}
        trackdayId={trackdayId}
      />

      {selectedSessionId && (
        <LapDialog
          open={isLapDialogOpen}
          onOpenChange={setIsLapDialogOpen}
          sessionId={selectedSessionId}
        />
      )}
    </div>
  );
}
