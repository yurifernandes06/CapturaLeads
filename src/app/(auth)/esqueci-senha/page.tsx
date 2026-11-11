import type { Metadata } from "next";
import { AuthCard } from "../auth-card";
import { ForgotPasswordForm } from "./password-forms";

export const metadata: Metadata = { title: "Esqueci a senha", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      eyebrow="Recuperar acesso"
      title="Esqueceu a senha?"
      description="Informe seu e-mail. Enviamos um link para criar uma nova senha no WhatsApp cadastrado."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
