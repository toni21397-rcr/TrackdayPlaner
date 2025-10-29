import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ScheduleBlockDialog } from "@/components/schedule-block-dialog";
import type { TrackdayScheduleBlock } from "@shared/schema";
import { format } from "date-fns";

interface TimelineTabProps {
  trackdayId: string;
}

export function TimelineTab({ trackdayId }: TimelineTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: blocks } = useQuery<TrackdayScheduleBlock[]>({
    queryKey: ["/api/schedule-blocks", trackdayId],
  });

  const getBlockColor = (type: string) => {
    const colors: Record<string, string> = {
      registration: "bg-blue-500/20 border-blue-500/50",
      session: "bg-green-500/20 border-green-500/50",
      break: "bg-gray-500/20 border-gray-500/50",
      lunch: "bg-orange-500/20 border-orange-500/50",
      other: "bg-purple-500/20 border-purple-500/50",
    };
    return colors[type] || colors.other;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>Daily Schedule</CardTitle>
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm" data-testid="button-add-schedule">
            <Plus className="w-4 h-4 mr-2" />
            Add Block
          </Button>
        </CardHeader>
        <CardContent>
          {blocks && blocks.length > 0 ? (
            <div className="space-y-3">
              {blocks.map((block) => (
                <div key={block.id} className={`p-4 rounded-lg border ${getBlockColor(block.type)}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-mono text-muted-foreground">
                          {block.startTime} - {block.endTime}
                        </span>
                      </div>
                      <h4 className="font-semibold">{block.title}</h4>
                      {block.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{block.notes}</p>
                      )}
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-md bg-background/50 capitalize">
                      {block.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Clock}
              title="No schedule blocks"
              description="Add schedule blocks to plan your trackday timeline."
              actionLabel="Add Block"
              onAction={() => setIsAddDialogOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      <ScheduleBlockDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        trackdayId={trackdayId}
      />
    </div>
  );
}
