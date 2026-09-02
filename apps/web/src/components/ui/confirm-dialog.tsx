"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onConfirm: () => void;
  confirmText?: string;
  variant?: "destructive" | "default";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = "بله، حذف شود",
  variant = "destructive",
  loading,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${variant === "destructive" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-1">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="flex gap-2 justify-start mt-4">
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            disabled={loading}
          >
            {loading ? "..." : confirmText}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
