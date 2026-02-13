-- PantryPal Supabase Schema

-- Shared recipe cache
CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  canonical_url TEXT UNIQUE NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('youtube', 'website', 'manual')),
  youtube_video_id TEXT,
  youtube_url TEXT,
  recipe_url TEXT,
  recipe_name TEXT NOT NULL,
  servings TEXT,
  prep_time TEXT,
  cook_time TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]',
  instructions JSONB NOT NULL DEFAULT '[]',
  equipment JSONB NOT NULL DEFAULT '[]',
  source_urls JSONB NOT NULL DEFAULT '[]',
  channel_id TEXT,
  channel_name TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_recipes_canonical_url ON recipes(canonical_url);
CREATE INDEX idx_recipes_youtube_video_id ON recipes(youtube_video_id);
CREATE INDEX idx_recipes_channel_id ON recipes(channel_id);

-- Personal recipe library
CREATE TABLE user_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

CREATE INDEX idx_user_recipes_user ON user_recipes(user_id);

-- Collections (playlist model)
CREATE TABLE collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_collections_user ON collections(user_id);

CREATE TABLE recipe_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_recipe_id UUID NOT NULL REFERENCES user_recipes(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(collection_id, user_recipe_id)
);

CREATE INDEX idx_recipe_collections_collection ON recipe_collections(collection_id);
CREATE INDEX idx_recipe_collections_user_recipe ON recipe_collections(user_recipe_id);

-- Favorite chefs
CREATE TABLE favorite_chefs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, channel_id)
);

CREATE INDEX idx_favorite_chefs_user ON favorite_chefs(user_id);

-- Pantry
CREATE TABLE pantry_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'staple' CHECK (category IN ('staple', 'current', 'tool')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name, category)
);

CREATE INDEX idx_pantry_user ON pantry_items(user_id);

-- Import tracking
CREATE TABLE import_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('channel', 'playlist', 'batch')),
  source_id TEXT NOT NULL,
  source_name TEXT,
  total_videos INTEGER DEFAULT 0,
  processed INTEGER DEFAULT 0,
  succeeded INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  errors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Monthly import counter
CREATE TABLE import_counts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  month TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  UNIQUE(user_id, month)
);

CREATE INDEX idx_import_counts_user_month ON import_counts(user_id, month);

-- Saved shopping lists
CREATE TABLE saved_shopping_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_saved_lists_user ON saved_shopping_lists(user_id);

-- Junction: which recipes are in each saved shopping list
CREATE TABLE shopping_list_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shopping_list_id UUID NOT NULL REFERENCES saved_shopping_lists(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  UNIQUE(shopping_list_id, recipe_id)
);

CREATE INDEX idx_shopping_list_recipes_list ON shopping_list_recipes(shopping_list_id);

-- RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recipes publicly readable" ON recipes FOR SELECT USING (true);
CREATE POLICY "No anon inserts" ON recipes FOR INSERT WITH CHECK (false);
CREATE POLICY "No anon updates" ON recipes FOR UPDATE USING (false);
CREATE POLICY "No anon deletes" ON recipes FOR DELETE USING (false);

ALTER TABLE user_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No anon access" ON user_recipes FOR ALL USING (false);

ALTER TABLE favorite_chefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No anon access" ON favorite_chefs FOR ALL USING (false);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No anon access" ON collections FOR ALL USING (false);

ALTER TABLE recipe_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No anon access" ON recipe_collections FOR ALL USING (false);

ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No anon access" ON pantry_items FOR ALL USING (false);

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No anon access" ON import_jobs FOR ALL USING (false);

ALTER TABLE import_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No anon access" ON import_counts FOR ALL USING (false);

ALTER TABLE saved_shopping_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No anon access" ON saved_shopping_lists FOR ALL USING (false);

ALTER TABLE shopping_list_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No anon access" ON shopping_list_recipes FOR ALL USING (false);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER recipes_updated BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER user_recipes_updated BEFORE UPDATE ON user_recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER collections_updated BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER jobs_updated BEFORE UPDATE ON import_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER lists_updated BEFORE UPDATE ON saved_shopping_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at();
