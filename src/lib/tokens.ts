import { randomBytes } from "crypto";

/** Opaque public token for magic links (confirm / seller portal). */
export function generatePublicToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}
