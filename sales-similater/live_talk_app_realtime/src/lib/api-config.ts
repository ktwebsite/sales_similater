/**
 * API configuration utility
 * Fetches API key from server instead of exposing it in client code
 */

import { auth } from './firebase-config';

let cachedApiKey: string | null = null;

/**
 * Fetch API configuration from the server
 * The server securely manages the API key
 * Requires Firebase authentication
 */
export async function getApiConfig(): Promise<{ apiKey: string }> {
  // Return cached key if available
  if (cachedApiKey) {
    return { apiKey: cachedApiKey };
  }

  try {
    // 開発中: 認証なしでAPIキーを取得
    // 本番環境では認証を有効化してください
    const user = auth.currentUser;
    
    // In production, fetch from server
    // In development, fallback to environment variable if no auth is configured
    if (process.env.NODE_ENV === 'development' && 
        process.env.REACT_APP_GEMINI_API_KEY && 
        !process.env.REACT_APP_FIREBASE_API_KEY) {
      cachedApiKey = process.env.REACT_APP_GEMINI_API_KEY;
      return { apiKey: cachedApiKey };
    }

    // Fetch from server endpoint (認証は一時的に無効)
    const headers: HeadersInit = {};
    if (user) {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/gemini/config', { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch API config: ${response.statusText}`);
    }

    const config = await response.json();
    
    if (!config.apiKey) {
      throw new Error('API key not found in server response');
    }

    cachedApiKey = config.apiKey;
    return config;
  } catch (error) {
    console.error('Error fetching API configuration:', error);
    throw error;
  }
}

/**
 * Clear cached API key (useful for testing or key rotation)
 */
export function clearApiCache(): void {
  cachedApiKey = null;
}
