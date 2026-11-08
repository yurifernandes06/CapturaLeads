"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { LOST_REASONS } from "@/lib/leads";

/** Pede o motivo da perda. Usado no detalhe do lead e no kanban. */
export function LostReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  leadName,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  leadName?: string;
  pending?: boolean;
}) {
  const [reason, setReason] = useState<string>(LOST_REASONS[0]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{leadName ? `Marcar ${leadName} como perdido` : "Marcar como perdido"}</DialogTitle>
          <DialogDescription>O motivo alimenta os relatórios de perda.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="lost-reason">Motivo</Label>
          <NativeSelect id="lost-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            {LOST_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </NativeSelect>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              onOpenChange(false);
              onConfirm(reason);
            }}
          >
            Confirmar perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
