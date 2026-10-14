"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  contents: string[];
  onCancel: () => void;
  onConfirm: () => void;
}

export function RemoveLastScreenshotDialog({ open, contents, onCancel, onConfirm }: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent role="alertdialog">
        <DialogHeader>
          <DialogTitle>Remove your last screenshot?</DialogTitle>
          <DialogDescription>
            A project can&apos;t exist without screenshots. Removing the last one deletes this project&apos;s
            saved data and starts it over. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">What will be deleted:</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {contents.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Keep it
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete and start over
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
