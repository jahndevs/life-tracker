import "server-only";
import bcrypt from "bcryptjs";

const COST = 12;

// Used for unknown emails so response time doesn't reveal which accounts exist.
const DUMMY_HASH = bcrypt.hashSync("timing-dummy", COST);

export function hashPassword(password: string) {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string | null | undefined) {
  return bcrypt.compare(password, hash ?? DUMMY_HASH);
}
