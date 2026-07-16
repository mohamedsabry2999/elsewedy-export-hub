import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  children?: ReactNode;
  compact?: boolean;
};

export function EmptyState({ icon: Icon = Inbox, title, description, action, children, compact }: Props) {
  return (
    <div className={`text-center ${compact ? "py-8" : "py-16"}`}>
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-muted/50 text-muted-foreground">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {(action || children) && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {action && (
            <Button onClick={action.onClick} size="sm">
              {action.icon && <action.icon className="h-4 w-4" />} {action.label}
            </Button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
