# PantryPal

Turn saved recipes into real meals. Import recipes from YouTube videos and recipe URLs, match them against your pantry, and generate shopping lists for what you need.

## Tech Stack

- **Mobile**: React Native (Expo) with expo-router, Zustand
- **Backend**: Python FastAPI
- **Database**: Supabase (Postgres)
- **AI**: Claude Haiku (recipe extraction) + Claude Sonnet (transcript fallback, substitutions)
- **YouTube**: youtube-transcript-api, YouTube Data API v3
- **Payments**: RevenueCat SDK

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
npm install
npx expo start
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
