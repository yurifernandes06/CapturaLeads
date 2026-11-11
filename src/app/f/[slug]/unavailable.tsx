/** Mensagem pública para formulário inexistente ou desativado (sem links para o painel). */
export function FormUnavailable() {
  return (
    <div className="text-center">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Este formulário não está mais disponível</h1>
      <p className="mt-2 text-muted-foreground">O link pode estar errado ou o formulário foi desativado.</p>
    </div>
  );
}
