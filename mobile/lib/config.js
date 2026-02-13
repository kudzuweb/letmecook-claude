const DEV_BACKEND_URL = 'http://localhost:8000';

export const config = {
  backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || DEV_BACKEND_URL,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  revenueCatApiKeyIos: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '',
  revenueCatApiKeyAndroid: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '',
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
  freeImportLimit: 10,
  freeShoppingListLimit: 1,
  proShoppingListLimit: 10,
};
