import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as api from './api';
import { initPurchases, checkSubscription } from './purchases';

const DEFAULT_STAPLES = ['salt', 'pepper', 'olive oil', 'butter', 'garlic', 'onion', 'sugar', 'flour', 'eggs'];
const DEFAULT_TOOLS = ['oven', 'stovetop', 'knife', 'cutting board', 'whisk', 'mixing bowls', 'baking sheet', 'saucepan', 'skillet'];

export const useStore = create((set, get) => ({
  userId: null,
  recipes: [],
  collections: [],
  pantry: { staples: [], current: [], tools: [] },
  favoriteChefs: [],
  userChefs: [],
  matches: [],
  substitutionCache: [],
  importLimit: { allowed: true, used: 0, limit: 10, resets: '' },
  savedLists: [],
  isPro: false,
  isJudge: false,
  loading: false,

  canAccessPro: () => {
    const { isPro, isJudge } = get();
    return isPro || isJudge;
  },

  initialize: async () => {
    let userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      userId = Crypto.randomUUID();
      await AsyncStorage.setItem('userId', userId);
    }
    const isJudge = (await AsyncStorage.getItem('isJudge')) === 'true';
    const hasInitedPantry = await AsyncStorage.getItem('pantryInited');

    set({ userId, isJudge });

    try { await initPurchases(userId); } catch {}
    try {
      const isPro = await checkSubscription();
      set({ isPro });
    } catch {}

    if (!hasInitedPantry) {
      for (const name of DEFAULT_STAPLES) {
        try { await api.addPantryItem(userId, name, 'staple'); } catch {}
      }
      for (const name of DEFAULT_TOOLS) {
        try { await api.addPantryItem(userId, name, 'tool'); } catch {}
      }
      await AsyncStorage.setItem('pantryInited', 'true');
    }

    await Promise.all([
      get().refreshRecipes(),
      get().refreshPantry(),
      get().refreshImportLimit(),
      get().refreshCollections(),
      get().refreshSavedLists(),
    ]);
  },

  setIsJudge: async (val) => {
    await AsyncStorage.setItem('isJudge', JSON.stringify(val));
    set({ isJudge: val });
  },

  refreshProStatus: async () => {
    try {
      const isPro = await checkSubscription();
      set({ isPro });
    } catch {}
  },

  refreshRecipes: async () => {
    const { userId } = get();
    if (!userId) return;
    try {
      const data = await api.getUserRecipes(userId);
      set({ recipes: data.recipes || [] });
    } catch {}
  },

  refreshCollections: async () => {
    const { userId } = get();
    if (!userId) return;
    try {
      const data = await api.getCollections(userId);
      set({ collections: data.collections || [] });
    } catch {}
  },

  refreshPantry: async () => {
    const { userId } = get();
    if (!userId) return;
    try {
      const data = await api.getPantry(userId);
      set({ pantry: data });
    } catch {}
  },

  refreshImportLimit: async () => {
    const { userId } = get();
    if (!userId) return;
    try {
      const data = await api.getImportLimit(userId);
      set({ importLimit: data });
    } catch {}
  },

  refreshChefs: async () => {
    const { userId } = get();
    if (!userId) return;
    try {
      const data = await api.getUserChefs(userId);
      set({ userChefs: data.chefs || [] });
    } catch {}
  },

  refreshMatches: async (channelId = null, onlyMyTools = false) => {
    const { userId } = get();
    if (!userId) return;
    try {
      const data = await api.getMatches(userId, channelId, onlyMyTools);
      set({ matches: data.matches || [] });
    } catch {}
  },

  refreshSavedLists: async () => {
    const { userId } = get();
    if (!userId) return;
    try {
      const data = await api.getSavedLists(userId);
      set({ savedLists: data.lists || [] });
    } catch {}
  },

  addPantryItem: async (name, category) => {
    const { userId } = get();
    try {
      await api.addPantryItem(userId, name, category);
      await get().refreshPantry();
    } catch {}
  },

  removePantryItem: async (itemId) => {
    const { userId } = get();
    try {
      await api.removePantryItem(userId, itemId);
      await get().refreshPantry();
    } catch {}
  },

  updateRecipe: async (recipeId, updates) => {
    const { userId } = get();
    try {
      await api.updateUserRecipe(userId, recipeId, updates);
      await get().refreshRecipes();
    } catch {}
  },

  addFavoriteChef: async (channelId) => {
    const { userId } = get();
    try {
      await api.addFavoriteChef(userId, channelId);
      await get().refreshChefs();
    } catch {}
  },

  removeFavoriteChef: async (channelId) => {
    const { userId } = get();
    try {
      await api.removeFavoriteChef(userId, channelId);
      await get().refreshChefs();
    } catch {}
  },
}));
