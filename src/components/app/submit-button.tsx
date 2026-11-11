"use client";

import { Loader2Icon } from "lucide-react";
import { startTransition, type ComponentProps, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

/** Botão de envio com spinner enquanto a action roda. */
export function SubmitButton({
  pending,
  children,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Button>, "type"> & { pending: boolean }) {
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending || undefined} {...props}>
      {pending ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
      {children}
    </Button>
  );
}

/**
 * `onSubmit` que dispara a action do `useActionState` sem o reset automático que o
 * React 19 aplica em `<form action>`: se der erro, o que a pessoa digitou continua lá.
 * Em caso de sucesso, quem chama decide se limpa (ex.: `formRef.current?.reset()`).
 */
export function submitKeepingValues(action: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => action(formData));
  };
}
