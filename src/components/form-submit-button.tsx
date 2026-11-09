"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  children: ReactNode;
  pendingLabel: string;
  className?: string;
};

export function FormSubmitButton({ children, pendingLabel, className }: Props) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
