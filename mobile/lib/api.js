import { config } from './config';

const BASE = config.backendUrl;

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

// Import
export const importYoutube = (youtube_url, user_id) =>
  request('/api/import/youtube', { method: 'POST', body: JSON.stringify({ youtube_url, user_id }) });

export const importRecipeUrl = (url, user_id) =>
  request('/api/import/recipe-url', { method: 'POST', body: JSON.stringify({ url, user_id }) });

export const importChannel = (channel_url, user_id) =>
  request('/api/import/channel', { method: 'POST', body: JSON.stringify({ channel_url, user_id }) });

export const importPlaylist = (playlist_id, user_id) =>
  request('/api/import/playlist', { method: 'POST', body: JSON.stringify({ playlist_id, user_id }) });

export const getImportJob = (job_id) =>
  request(`/api/import/job/${job_id}`);

export const getImportLimit = (user_id) =>
  request(`/api/import/limit/${user_id}`);

// Shared Recipes
export const getRecipes = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/recipes?${qs}`);
};

export const getRecipe = (id) =>
  request(`/api/recipes/${id}`);

// User Library
export const getUserRecipes = (user_id) =>
  request(`/api/user/${user_id}/recipes`);

export const addUserRecipe = (user_id, recipe_id) =>
  request(`/api/user/${user_id}/recipes`, { method: 'POST', body: JSON.stringify({ recipe_id }) });

export const removeUserRecipe = (user_id, recipe_id) =>
  request(`/api/user/${user_id}/recipes/${recipe_id}`, { method: 'DELETE' });

export const updateUserRecipe = (user_id, recipe_id, updates) =>
  request(`/api/user/${user_id}/recipes/${recipe_id}`, { method: 'PATCH', body: JSON.stringify(updates) });

// Chefs
export const getUserChefs = (user_id) =>
  request(`/api/user/${user_id}/chefs`);

export const getFavoriteChefs = (user_id) =>
  request(`/api/user/${user_id}/chefs/favorites`);

export const addFavoriteChef = (user_id, channel_id) =>
  request(`/api/user/${user_id}/chefs/favorites`, { method: 'POST', body: JSON.stringify({ channel_id }) });

export const removeFavoriteChef = (user_id, channel_id) =>
  request(`/api/user/${user_id}/chefs/favorites/${channel_id}`, { method: 'DELETE' });

// Pantry
export const getPantry = (user_id) =>
  request(`/api/user/${user_id}/pantry`);

export const addPantryItem = (user_id, name, category) =>
  request(`/api/user/${user_id}/pantry`, { method: 'POST', body: JSON.stringify({ name, category }) });

export const removePantryItem = (user_id, item_id) =>
  request(`/api/user/${user_id}/pantry/${item_id}`, { method: 'DELETE' });

// Collections
export const getCollections = (user_id) =>
  request(`/api/user/${user_id}/collections`);

export const createCollection = (user_id, name) =>
  request(`/api/user/${user_id}/collections`, { method: 'POST', body: JSON.stringify({ name }) });

export const renameCollection = (user_id, id, name) =>
  request(`/api/user/${user_id}/collections/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });

export const deleteCollection = (user_id, id) =>
  request(`/api/user/${user_id}/collections/${id}`, { method: 'DELETE' });

export const reorderCollections = (user_id, ordered_ids) =>
  request(`/api/user/${user_id}/collections/reorder`, { method: 'PUT', body: JSON.stringify({ ordered_ids }) });

export const getCollectionRecipes = (user_id, collection_id) =>
  request(`/api/user/${user_id}/collections/${collection_id}/recipes`);

export const addToCollection = (user_id, collection_id, user_recipe_id) =>
  request(`/api/user/${user_id}/collections/${collection_id}/recipes`, { method: 'POST', body: JSON.stringify({ user_recipe_id }) });

export const removeFromCollection = (user_id, collection_id, user_recipe_id) =>
  request(`/api/user/${user_id}/collections/${collection_id}/recipes/${user_recipe_id}`, { method: 'DELETE' });

// Matching
export const getMatches = (user_id, channel_id = null, only_my_tools = false) =>
  request('/api/match', { method: 'POST', body: JSON.stringify({ user_id, channel_id, only_my_tools }) });

export const getSubstitutions = (user_id, missing_ingredients, missing_tools, pantry_items, user_tools) =>
  request('/api/substitutions', { method: 'POST', body: JSON.stringify({ user_id, missing_ingredients, missing_tools, pantry_items, user_tools }) });

// Shopping Lists
export const generateShoppingList = (user_id, recipe_ids) =>
  request('/api/shopping-list/generate', { method: 'POST', body: JSON.stringify({ user_id, recipe_ids }) });

export const getSavedLists = (user_id) =>
  request(`/api/user/${user_id}/shopping-lists`);

export const saveShoppingList = (user_id, name, recipe_ids, items) =>
  request(`/api/user/${user_id}/shopping-lists`, { method: 'POST', body: JSON.stringify({ name, recipe_ids, items }) });

export const deleteShoppingList = (user_id, list_id) =>
  request(`/api/user/${user_id}/shopping-lists/${list_id}`, { method: 'DELETE' });

export const getShoppingListCount = (user_id) =>
  request(`/api/user/${user_id}/shopping-lists/count`);
