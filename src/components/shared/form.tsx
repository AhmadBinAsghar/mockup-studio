import type { ReactNode } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function Notice({ children, tone = "warn" }: { children: ReactNode; tone?: "warn" | "info" }) {
  const colors =
    tone === "warn"
      ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100"
      : "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-500/40 dark:bg-sky-950/40 dark:text-sky-100";
  return (
    <Alert className={colors}>
      <AlertDescription className="text-xs text-current">{children}</AlertDescription>
    </Alert>
  );
}

export interface Option {
  value: string;
  label: string;
}

export function SelectField({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder,
  className,
}: {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <Select value={value} items={options} onValueChange={(v) => v !== null && onChange(v)}>
      <SelectTrigger aria-label={ariaLabel} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ColorInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <input
      type="color"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-12 cursor-pointer rounded-lg border border-input bg-card p-0.5"
    />
  );
}
