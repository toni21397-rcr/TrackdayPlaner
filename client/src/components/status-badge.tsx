import { Badge } from "@/components/ui/badge";
import { ParticipationStatus, PaymentStatus } from "@shared/schema";
import { CheckCircle, Circle, XCircle, Clock } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  type: "participation" | "payment";
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  if (type === "participation") {
    const configs: Record<string, { label: string; className: string; icon: any }> = {
      planned: {
        label: "Planned",
        className: "bg-blue-500 text-white hover:bg-blue-600",
        icon: Circle,
      },
      registered: {
        label: "Registered",
        className: "bg-orange-500 text-white hover:bg-orange-600",
        icon: Clock,
      },
      attended: {
        label: "Attended",
        className: "bg-green-500 text-white hover:bg-green-600",
        icon: CheckCircle,
      },
      cancelled: {
        label: "Cancelled",
        className: "bg-red-500 text-white hover:bg-red-600",
        icon: XCircle,
      },
    };

    const config = configs[status];
    if (!config) return null;

    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  }

  if (type === "payment") {
    const configs: Record<string, { label: string; className: string }> = {
      planned: {
        label: "Planned",
        className: "bg-blue-500 text-white hover:bg-blue-600",
      },
      invoiced: {
        label: "Invoiced",
        className: "bg-amber-500 text-white hover:bg-amber-600",
      },
      paid: {
        label: "Paid",
        className: "bg-green-500 text-white hover:bg-green-600",
      },
      refunded: {
        label: "Refunded",
        className: "bg-red-500 text-white hover:bg-red-600",
      },
    };

    const config = configs[status];
    if (!config) return null;

    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  }

  return null;
}
