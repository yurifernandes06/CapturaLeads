import "server-only";
import bcrypt from "bcryptjs";

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

// Hash fixo para comparar quando o e-mail não existe — evita enumeração por tempo de resposta.
let dummyHash: string | undefined;
export async function verifyDummy(password: string) {
  dummyHash ??= await bcrypt.hash("dummy-password", 12);
  await bcrypt.compare(password, dummyHash);
  return false;
}
