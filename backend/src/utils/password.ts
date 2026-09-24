import argon2 from 'argon2';

/**
 * Password hashing utility using Argon2id for Owner OS custom authentication.
 */
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1
  });
}

/**
 * Verifies a plaintext password against an Argon2id hash.
 * NOTE: There are intentionally NO demo/fallback passwords.
 * Every account must have a real stored hash to authenticate.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;

  if (hash.startsWith('$argon2id$') || hash.startsWith('$argon2i$') || hash.startsWith('$argon2d$')) {
    try {
      return await argon2.verify(hash, password);
    } catch (err) {
      return false;
    }
  }

  return false;
}
