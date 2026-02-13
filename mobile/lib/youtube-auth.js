import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from './config';

WebBrowser.maybeCompleteAuthSession();

const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];
const TOKEN_KEY = 'youtube_tokens';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export function useYoutubeAuth() {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'pantrypal' });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: config.googleClientId,
      scopes: SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
    },
    discovery
  );

  return { request, response, promptAsync };
}

export async function getStoredTokens() {
  const raw = await AsyncStorage.getItem(TOKEN_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function storeTokens(tokens) {
  await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export async function clearTokens() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function getAccessToken() {
  const tokens = await getStoredTokens();
  if (!tokens) return null;

  const expiresAt = tokens.obtained_at + tokens.expires_in * 1000;
  if (Date.now() < expiresAt - 60000) {
    return tokens.access_token;
  }

  if (tokens.refresh_token) {
    try {
      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.googleClientId,
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh_token,
        }).toString(),
      });
      const data = await resp.json();
      if (data.access_token) {
        const updated = { ...tokens, access_token: data.access_token, obtained_at: Date.now() };
        if (data.expires_in) updated.expires_in = data.expires_in;
        await storeTokens(updated);
        return data.access_token;
      }
    } catch {}
  }
  return null;
}

async function youtubeGet(path, params = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with YouTube');
  const qs = new URLSearchParams({ ...params, key: config.youtubeApiKey || '' }).toString();
  const resp = await fetch(`https://www.googleapis.com/youtube/v3${path}?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`YouTube API error: ${resp.status}`);
  return resp.json();
}

export async function getUserPlaylists() {
  const data = await youtubeGet('/playlists', {
    part: 'snippet,contentDetails', mine: 'true', maxResults: '50',
  });
  return (data.items || []).map(pl => ({
    id: pl.id,
    title: pl.snippet.title,
    description: pl.snippet.description,
    videoCount: pl.contentDetails.itemCount,
    thumbnail: pl.snippet.thumbnails?.medium?.url,
  }));
}

export async function getPlaylistVideos(playlistId) {
  const videos = [];
  let pageToken = '';
  do {
    const params = { part: 'snippet', playlistId, maxResults: '50' };
    if (pageToken) params.pageToken = pageToken;
    const data = await youtubeGet('/playlistItems', params);
    for (const item of data.items || []) {
      const vid = item.snippet?.resourceId?.videoId;
      if (vid) videos.push(`https://www.youtube.com/watch?v=${vid}`);
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return videos;
}

export async function getUserSubscriptions() {
  const data = await youtubeGet('/subscriptions', {
    part: 'snippet', mine: 'true', maxResults: '50',
  });
  return (data.items || []).map(sub => ({
    channelId: sub.snippet.resourceId.channelId,
    title: sub.snippet.title,
    thumbnail: sub.snippet.thumbnails?.medium?.url,
  }));
}
