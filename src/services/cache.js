import { ref, get, set } from 'firebase/database';
import { db } from './firebase';

export async function hashPayload(payload) {
  const text    = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const data    = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const CACHE_NAMESPACE = 'ai_cache';

/**
 * Check Firebase RTDB for a cached AI response.
 * @param {string} hash - SHA-256 hash of the request payload
 * @returns {string|null} cached content, or null if miss
 */
export async function getCache(hash) {
  try {
    const snapshot = await get(ref(db, `${CACHE_NAMESPACE}/${hash}`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data.expiresAt && Date.now() > data.expiresAt) {
        return null; 
      }
      return data.content;
    }
    return null;
  } catch (error) {
    console.warn('[Cache] Firebase read failed:', error.message);
    return null; 
  }
}

/**
 * Write an AI response to Firebase RTDB.
 * TTL: 7 days.
 * @param {string} hash
 * @param {string} content
 */
export async function setCache(hash, content) {
  try {
    const TTL_MS = 7 * 24 * 60 * 60 * 1000;
    await set(ref(db, `${CACHE_NAMESPACE}/${hash}`), {
      content,
      createdAt:  Date.now(),
      expiresAt:  Date.now() + TTL_MS,
    });
  } catch (error) {
    console.warn('[Cache] Firebase write failed:', error.message);
  }
}
