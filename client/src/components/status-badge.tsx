import { Badge } from "@/components/ui/badge";
import { ParticipationStatus, PaymentStatus } from "@shared/schema";
import { CheckCircle, Circle, XCircle, Clock } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  type: "participation" | "payment";
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  if (type === "participation") {
    const configs = {
      [ParticipationStatus.PLANNED]: {
        label: "Planned",
        variant: "secondary" as const,
        icon: Circle,
      },
      [ParticipationStatus.REGISTERED]: {
        label: "Registered",
        variant: "default" as const,
        icon: Clock,
      },
      [ParticipationStatus.ATTENDED]: {
        label: "Attended",
        variant: "default" as const,
        icon: CheckCircle,
        className: "bg-green-600 hover:bg-green-700 text-white",
      },
      [ParticipationStatus.CANCELLED]: {
        label: "Cancelled",
        variant: "destructive" as const,
        icon: XCircle,
      },
    };

    const config = configs[status as keyof typeof ParticipationStatus];
    if (!config) return null;

    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  }

  if (type === "payment") {
    const configs = {
      [PaymentStatus.PLANNED]: {
        label: "Planned",
        variant: "secondary" as const,
      },
      [PaymentStatus.INVOICED]: {
        label: "Invoiced",
        variant: "outline" as const,
      },
      [PaymentStatus.PAID]: {
        label: "Paid",
        variant: "default" as const,
        className: "bg-green-600 hover:bg-green-700 text-white",
      },
      [PaymentStatus.REFUNDED]: {
        label: "Refunded",
        variant: "destructive" as const,
      },
    };

    const config = configs[status as keyof typeof PaymentStatus];
    if (!config) return null;

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  }

  return null;
}
