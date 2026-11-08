"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyField({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-start gap-2">
        <code
          className={
            multiline
              ? "min-w-0 flex-1 overflow-x-auto rounded-lg border bg-muted/50 px-3 py-2 font-mono text-xs whitespace-pre"
              : "min-w-0 flex-1 truncate rounded-lg border bg-muted/50 px-3 py-2 font-mono text-xs"
          }
        >
          {value}
        </code>
        <Button type="button" variant="outline" size="icon" onClick={copy} aria-label={`Copiar ${label}`}>
          {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
        </Button>
      </div>
    </div>
  );
}
