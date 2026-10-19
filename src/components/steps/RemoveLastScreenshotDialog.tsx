"use client";

import { useT } from "@/i18n/useT";
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
  const { t } = useT();
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent role="alertdialog">
        <DialogHeader>
          <DialogTitle>{t("removeLast.title")}</DialogTitle>
          <DialogDescription>{t("removeLast.description")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t("removeLast.contents")}</p>
          <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
            {contents.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t("removeLast.keep")}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t("removeLast.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
