import bcrypt from "bcryptjs";

/**
 * Cost factor. 12 is a deliberate balance: meaningfully slower than the
 * bcryptjs default of 10 for an attacker, still well inside a serverless
 * function's budget.
 */
const SALT_ROUNDS = 12;

export function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/**
 * Returns false rather than throwing on a malformed hash.
 *
 * `loginUser` compares against a dummy hash when no account matches, so the
 * response time does not reveal whether an address exists. That path must not
 * be able to raise a different error and reintroduce the very oracle it
 * removes.
 */
export async function verifyPassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(plaintext, hash);
  } catch {
    return false;
  }
}
