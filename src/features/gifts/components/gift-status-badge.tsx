import { CheckCircle2, Gift, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GIFT_STATUS_LABEL, type GiftStatus } from "../gift-availability";

export function GiftStatusBadge({ status }: { status: GiftStatus }) {
  if (status === "AVAILABLE") {
    return (
      <Badge tone="success">
        <span className="size-2 rounded-full bg-success" aria-hidden /> {GIFT_STATUS_LABEL[status]}
      </Badge>
    );
  }
  if (status === "RESERVED") {
    return (
      <Badge tone="warning">
        <Lock className="size-3" aria-hidden /> {GIFT_STATUS_LABEL[status]}
      </Badge>
    );
  }
  if (status === "PURCHASED") {
    return (
      <Badge tone="danger">
        <CheckCircle2 className="size-3" aria-hidden /> {GIFT_STATUS_LABEL[status]}
      </Badge>
    );
  }
  return (
    <Badge tone="neutral">
      <Gift className="size-3" aria-hidden /> {GIFT_STATUS_LABEL[status]}
    </Badge>
  );
}
