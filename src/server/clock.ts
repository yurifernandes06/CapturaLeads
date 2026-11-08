import "server-only";

/**
 * Hora da requisição para Server Components. Eles renderizam uma vez por
 * request, então ler o relógio aqui é seguro (a regra de pureza do React
 * mira componentes que re-renderizam no client). Chame só depois de um
 * acesso dinâmico (ex.: requireUser), exigência do Cache Components.
 */
export const requestNow = () => Date.now();
