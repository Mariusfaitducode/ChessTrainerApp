/**
 * Utilitaire pour générer des UUID
 * Utilise expo-crypto pour générer des IDs uniques
 */

import * as Crypto from "expo-crypto";

/**
 * Génère un UUID v4 compatible
 * Utilise expo-crypto pour générer un hash unique
 */
export async function generateUUID(): Promise<string> {
  // Générer un hash unique basé sur timestamp + random
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  const timestamp = Date.now().toString();
  const random = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${timestamp}-${random}`
  );

  // Formater comme UUID v4
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-${(parseInt(hash.substring(16, 17), 16) & 0x3) | 0x8}${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
}

/**
 * Génère un UUID de manière synchrone (moins sécurisé mais plus rapide)
 * Pour les cas où on a besoin d'un ID immédiatement
 */
export function generateUUIDSync(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  const random2 = Math.random().toString(36).substring(2, 15);
  
  // Format simplifié mais unique
  return `${timestamp}-${random}-${random2}`;
}

