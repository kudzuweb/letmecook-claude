# PantryPal

Turn saved recipes into real meals. Import recipes from YouTube videos and recipe URLs, match them against your pantry, get substitution suggestions, and generate shopping lists for what you need.

Built for the [RevenueCat Shipyard Hackathon](https://ship.revenuecat.com/) (February 2026).

## Features

- **Recipe Import**: Paste a YouTube or recipe URL to extract structured recipes using Claude AI
- **Pantry Matching**: See which recipes you can make with what you have, with coverage percentages
- **Smart Substitutions**: Claude suggests ingredient and tool substitutions for near-matches
- **Shopping Lists**: Generate grouped, deduplicated shopping lists from selected recipes
- **Collections**: Organize recipes into custom collections
- **Chef Favorites**: Follow your favorite cooking channels
- **YouTube Integration**: Import playlists and channel catalogs (Pro)
- **Star Ratings & Notes**: Rate recipes and save notes for next time
- **Embedded Video**: Rewatch recipe videos inline with the embedded YouTube player

## Tech Stack

- **Mobile**: React Native (Expo SDK 54) with expo-router v6, Zustand state management
- **Backend**: Python FastAPI with uvicorn
- **Database**: Supabase (Postgres) with Row Level Security
- **AI**: Claude Haiku (recipe page extraction) + Claude Sonnet (transcript extraction, substitutions)
- **YouTube**: youtube-transcript-api for transcripts, YouTube Data API v3 for OAuth
- **Payments**: RevenueCat SDK (react-native-purchases)
- **Design**: Playfair Display + DM Sans, warm cream/terracotta/sage palette

## Monetization

| Feature | Free | Pro ($4.99/mo or $29.99/yr) |
|---------|------|---------------------------|
| Recipe imports | 10/month | Unlimited |
| Bulk import (playlists/channels) | - | Yes |
| Saved shopping lists | 1 | 10 |
| Pantry matching | Yes | Yes |
| Substitution suggestions | Yes | Yes |

**Hackathon judges**: Tap "Hackathon judge? Tap here to bypass paywall" on the welcome screen to unlock all Pro features.

## Setup

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env  # fill in your keys
uvicorn main:app --reload
```

### Mobile

```bash
cd mobile
npm install --legacy-peer-deps
npx expo start
```

### Deploy Backend (Render)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

Or manually: push to GitHub, connect in Render dashboard, set environment variables, deploy.

### EAS Build

```bash
cd mobile
npx eas-cli build --platform ios --profile production
npx eas-cli build --platform android --profile production
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (backend only) |
| `YOUTUBE_API_KEY` | Google YouTube Data API v3 key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `REVENUECAT_API_KEY_IOS` | RevenueCat iOS API key |
| `REVENUECAT_API_KEY_ANDROID` | RevenueCat Android API key |

## Architecture

```
Mobile (Expo)            FastAPI Backend              Supabase
┌──────────────┐        ┌──────────────────┐        ┌──────────────┐
│ expo-router  │───────>│ Import Pipeline  │───────>│ recipes      │
│ Zustand      │  HTTP  │ URL Normalizer   │  SQL   │ user_recipes │
│ RevenueCat   │<───────│ Matching Engine  │<───────│ pantry_items │
│ YouTube Auth │        │ Claude AI Extract│        │ collections  │
└──────────────┘        └──────────────────┘        └──────────────┘
```

## Testing

```bash
cd backend
source venv/bin/activate
python -m pytest tests/ -q   # 65 tests
```

## Pre-Seeded Content

Run `python scripts/seed_eitan.py` from the backend directory to import 10 of Eitan Bernath's YouTube recipes into the shared database.
