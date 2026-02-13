import os
from datetime import datetime
from supabase import create_client, Client

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        url = os.environ.get('SUPABASE_URL', '')
        key = os.environ.get('SUPABASE_SERVICE_KEY', '')
        if not url or not key:
            raise RuntimeError('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set')
        _client = create_client(url, key)
    return _client


# --- Recipes ---

def get_recipe_by_canonical_url(canonical_url: str) -> dict | None:
    r = get_client().table('recipes').select('*').eq('canonical_url', canonical_url).execute()
    return r.data[0] if r.data else None


def upsert_recipe(data: dict) -> dict:
    r = get_client().table('recipes').upsert(data, on_conflict='canonical_url').execute()
    return r.data[0]


def get_recipes_by_channel(channel_id: str, limit: int = 50, offset: int = 0) -> list[dict]:
    r = (get_client().table('recipes')
         .select('*')
         .eq('channel_id', channel_id)
         .order('created_at', desc=True)
         .range(offset, offset + limit - 1)
         .execute())
    return r.data


def search_recipes(search: str = None, channel_id: str = None,
                   limit: int = 50, offset: int = 0) -> tuple[list[dict], int]:
    q = get_client().table('recipes').select('*', count='exact')
    if channel_id:
        q = q.eq('channel_id', channel_id)
    if search:
        q = q.ilike('recipe_name', f'%{search}%')
    q = q.order('created_at', desc=True).range(offset, offset + limit - 1)
    r = q.execute()
    return r.data, r.count or 0


def get_recipe_by_id(recipe_id: str) -> dict | None:
    r = get_client().table('recipes').select('*').eq('id', recipe_id).execute()
    return r.data[0] if r.data else None


# --- User Library ---

def get_user_recipes(user_id: str) -> list[dict]:
    r = (get_client().table('user_recipes')
         .select('*, recipes(*)')
         .eq('user_id', user_id)
         .order('added_at', desc=True)
         .execute())
    results = []
    for ur in r.data:
        recipe = ur.pop('recipes', {}) or {}
        results.append({
            'user_recipe_id': ur['id'],
            'recipe_id': ur['recipe_id'],
            'rating': ur.get('rating'),
            'notes': ur.get('notes'),
            'added_at': ur.get('added_at'),
            **{k: v for k, v in recipe.items() if k != 'id'},
        })
    return results


def save_user_recipe(user_id: str, recipe_id: str) -> dict:
    r = (get_client().table('user_recipes')
         .insert({'user_id': user_id, 'recipe_id': recipe_id})
         .execute())
    return r.data[0]


def remove_user_recipe(user_id: str, recipe_id: str) -> None:
    (get_client().table('user_recipes')
     .delete()
     .eq('user_id', user_id)
     .eq('recipe_id', recipe_id)
     .execute())


def update_user_recipe(user_id: str, recipe_id: str, rating: int | None = ...,
                       notes: str | None = ...) -> dict:
    updates = {}
    if rating is not ...:
        updates['rating'] = rating
    if notes is not ...:
        updates['notes'] = notes
    if not updates:
        return {}
    r = (get_client().table('user_recipes')
         .update(updates)
         .eq('user_id', user_id)
         .eq('recipe_id', recipe_id)
         .execute())
    return r.data[0] if r.data else {}


def get_user_recipe_by_id(user_recipe_id: str) -> dict | None:
    r = (get_client().table('user_recipes')
         .select('*')
         .eq('id', user_recipe_id)
         .execute())
    return r.data[0] if r.data else None


# --- Favorite Chefs ---

def get_favorite_chefs(user_id: str) -> list[dict]:
    r = (get_client().table('favorite_chefs')
         .select('*')
         .eq('user_id', user_id)
         .execute())
    return r.data


def add_favorite_chef(user_id: str, channel_id: str) -> dict:
    r = (get_client().table('favorite_chefs')
         .insert({'user_id': user_id, 'channel_id': channel_id})
         .execute())
    return r.data[0]


def remove_favorite_chef(user_id: str, channel_id: str) -> None:
    (get_client().table('favorite_chefs')
     .delete()
     .eq('user_id', user_id)
     .eq('channel_id', channel_id)
     .execute())


def get_user_chefs(user_id: str) -> list[dict]:
    """Get distinct chefs from user's library with recipe counts and favorite status."""
    recipes = get_user_recipes(user_id)
    favs = {f['channel_id'] for f in get_favorite_chefs(user_id)}
    chefs = {}
    for r in recipes:
        cid = r.get('channel_id')
        if not cid:
            continue
        if cid not in chefs:
            chefs[cid] = {
                'channel_id': cid,
                'channel_name': r.get('channel_name', ''),
                'recipe_count': 0,
                'is_favorite': cid in favs,
            }
        chefs[cid]['recipe_count'] += 1
    return list(chefs.values())


# --- Collections ---

def get_collections(user_id: str) -> list[dict]:
    r = (get_client().table('collections')
         .select('*')
         .eq('user_id', user_id)
         .order('sort_order')
         .execute())
    collections_data = []
    user_recipes = get_user_recipes(user_id)
    all_count = len(user_recipes)
    all_thumbs = [ur.get('image_url') for ur in user_recipes[:4] if ur.get('image_url')]

    # Get user_recipe_ids that are in at least one user-created collection
    in_collections = set()
    for c in r.data:
        rc = (get_client().table('recipe_collections')
              .select('user_recipe_id')
              .eq('collection_id', c['id'])
              .execute())
        for row in rc.data:
            in_collections.add(row['user_recipe_id'])

    # Loose = not in any collection
    loose = [ur for ur in user_recipes if ur['user_recipe_id'] not in in_collections]
    loose_thumbs = [ur.get('image_url') for ur in loose[:4] if ur.get('image_url')]

    collections_data.append({
        'id': 'all_recipes', 'name': 'All Recipes',
        'recipe_count': all_count, 'thumbnails': all_thumbs,
        'sort_order': 0, 'is_system': True,
    })
    collections_data.append({
        'id': 'loose_recipes', 'name': 'Loose Recipes',
        'recipe_count': len(loose), 'thumbnails': loose_thumbs,
        'sort_order': 1, 'is_system': True,
    })

    for c in r.data:
        rc = (get_client().table('recipe_collections')
              .select('user_recipe_id')
              .eq('collection_id', c['id'])
              .execute())
        count = len(rc.data)
        thumbs = []
        for row in rc.data[:4]:
            ur = get_user_recipe_by_id(row['user_recipe_id'])
            if ur:
                recipe = get_recipe_by_id(ur['recipe_id'])
                if recipe and recipe.get('image_url'):
                    thumbs.append(recipe['image_url'])
        collections_data.append({
            'id': c['id'], 'name': c['name'],
            'recipe_count': count, 'thumbnails': thumbs,
            'sort_order': c.get('sort_order', 0), 'is_system': False,
        })

    return collections_data


def create_collection(user_id: str, name: str) -> dict:
    existing = (get_client().table('collections')
                .select('sort_order')
                .eq('user_id', user_id)
                .order('sort_order', desc=True)
                .limit(1)
                .execute())
    next_order = (existing.data[0]['sort_order'] + 1) if existing.data else 2
    r = (get_client().table('collections')
         .insert({'user_id': user_id, 'name': name, 'sort_order': next_order})
         .execute())
    return r.data[0]


def rename_collection(collection_id: str, name: str) -> dict:
    r = (get_client().table('collections')
         .update({'name': name})
         .eq('id', collection_id)
         .execute())
    return r.data[0] if r.data else {}


def delete_collection(collection_id: str) -> None:
    (get_client().table('collections')
     .delete()
     .eq('id', collection_id)
     .execute())


def reorder_collections(user_id: str, ordered_ids: list[str]) -> None:
    for i, cid in enumerate(ordered_ids):
        (get_client().table('collections')
         .update({'sort_order': i + 2})
         .eq('id', cid)
         .eq('user_id', user_id)
         .execute())


def add_recipe_to_collection(collection_id: str, user_recipe_id: str) -> dict:
    r = (get_client().table('recipe_collections')
         .insert({'collection_id': collection_id, 'user_recipe_id': user_recipe_id})
         .execute())
    return r.data[0]


def remove_recipe_from_collection(collection_id: str, user_recipe_id: str) -> None:
    (get_client().table('recipe_collections')
     .delete()
     .eq('collection_id', collection_id)
     .eq('user_recipe_id', user_recipe_id)
     .execute())


def get_collection_recipes(collection_id: str, user_id: str) -> list[dict]:
    if collection_id == 'all_recipes':
        return get_user_recipes(user_id)

    if collection_id == 'loose_recipes':
        all_recipes = get_user_recipes(user_id)
        collections = (get_client().table('collections')
                       .select('id')
                       .eq('user_id', user_id)
                       .execute())
        in_collections = set()
        for c in collections.data:
            rc = (get_client().table('recipe_collections')
                  .select('user_recipe_id')
                  .eq('collection_id', c['id'])
                  .execute())
            for row in rc.data:
                in_collections.add(row['user_recipe_id'])
        return [r for r in all_recipes if r['user_recipe_id'] not in in_collections]

    rc = (get_client().table('recipe_collections')
          .select('user_recipe_id')
          .eq('collection_id', collection_id)
          .execute())
    results = []
    for row in rc.data:
        ur = get_user_recipe_by_id(row['user_recipe_id'])
        if ur:
            recipe = get_recipe_by_id(ur['recipe_id'])
            if recipe:
                results.append({
                    'user_recipe_id': ur['id'],
                    'recipe_id': ur['recipe_id'],
                    'rating': ur.get('rating'),
                    'notes': ur.get('notes'),
                    'added_at': ur.get('added_at'),
                    **{k: v for k, v in recipe.items() if k != 'id'},
                })
    return results


# --- Pantry ---

def get_pantry(user_id: str) -> dict:
    r = (get_client().table('pantry_items')
         .select('*')
         .eq('user_id', user_id)
         .order('name')
         .execute())
    result = {'staples': [], 'current': [], 'tools': []}
    for item in r.data:
        cat = item.get('category', 'staple')
        if cat in result:
            result[cat].append(item)
    return result


def add_pantry_item(user_id: str, name: str, category: str = 'staple') -> dict:
    r = (get_client().table('pantry_items')
         .insert({'user_id': user_id, 'name': name, 'category': category})
         .execute())
    return r.data[0]


def remove_pantry_item(item_id: str) -> None:
    (get_client().table('pantry_items')
     .delete()
     .eq('id', item_id)
     .execute())


# --- Import Tracking ---

def create_import_job(user_id: str, source_type: str, source_id: str,
                      source_name: str = None) -> dict:
    r = (get_client().table('import_jobs')
         .insert({
             'user_id': user_id,
             'source_type': source_type,
             'source_id': source_id,
             'source_name': source_name,
         })
         .execute())
    return r.data[0]


def update_import_job(job_id: str, **kwargs) -> dict:
    updates = {}
    if 'status' in kwargs:
        updates['status'] = kwargs['status']
    if 'total_videos' in kwargs:
        updates['total_videos'] = kwargs['total_videos']

    if kwargs.get('processed_increment'):
        job = get_import_job(job_id)
        updates['processed'] = (job.get('processed') or 0) + 1
    if kwargs.get('succeeded_increment'):
        job = job if 'job' in dir() else get_import_job(job_id)
        updates['succeeded'] = (job.get('succeeded') or 0) + 1
    if kwargs.get('failed_increment'):
        job = job if 'job' in dir() else get_import_job(job_id)
        updates['failed'] = (job.get('failed') or 0) + 1

    if kwargs.get('error'):
        job = job if 'job' in dir() else get_import_job(job_id)
        errors = job.get('errors') or []
        errors.append(kwargs['error'])
        updates['errors'] = errors

    if updates:
        r = (get_client().table('import_jobs')
             .update(updates)
             .eq('id', job_id)
             .execute())
        return r.data[0] if r.data else {}
    return {}


def get_import_job(job_id: str) -> dict | None:
    r = (get_client().table('import_jobs')
         .select('*')
         .eq('id', job_id)
         .execute())
    return r.data[0] if r.data else None


# --- Import Counts ---

def get_import_count(user_id: str, month: str = None) -> int:
    if month is None:
        month = datetime.utcnow().strftime('%Y-%m')
    r = (get_client().table('import_counts')
         .select('count')
         .eq('user_id', user_id)
         .eq('month', month)
         .execute())
    return r.data[0]['count'] if r.data else 0


def increment_import_count(user_id: str, month: str = None) -> int:
    if month is None:
        month = datetime.utcnow().strftime('%Y-%m')
    existing = (get_client().table('import_counts')
                .select('*')
                .eq('user_id', user_id)
                .eq('month', month)
                .execute())
    if existing.data:
        new_count = existing.data[0]['count'] + 1
        (get_client().table('import_counts')
         .update({'count': new_count})
         .eq('user_id', user_id)
         .eq('month', month)
         .execute())
        return new_count
    else:
        (get_client().table('import_counts')
         .insert({'user_id': user_id, 'month': month, 'count': 1})
         .execute())
        return 1


# --- Shopping Lists ---

def get_saved_lists(user_id: str) -> list[dict]:
    r = (get_client().table('saved_shopping_lists')
         .select('*')
         .eq('user_id', user_id)
         .order('created_at', desc=True)
         .execute())
    results = []
    for sl in r.data:
        rc = (get_client().table('shopping_list_recipes')
              .select('recipe_id')
              .eq('shopping_list_id', sl['id'])
              .execute())
        recipe_ids = [row['recipe_id'] for row in rc.data]
        results.append({**sl, 'recipe_ids': recipe_ids})
    return results


def save_shopping_list(user_id: str, name: str, recipe_ids: list[str],
                       items: list[dict]) -> dict:
    r = (get_client().table('saved_shopping_lists')
         .insert({'user_id': user_id, 'name': name, 'items': items})
         .execute())
    sl = r.data[0]
    for rid in recipe_ids:
        (get_client().table('shopping_list_recipes')
         .insert({'shopping_list_id': sl['id'], 'recipe_id': rid})
         .execute())
    return sl


def delete_shopping_list(list_id: str) -> None:
    (get_client().table('saved_shopping_lists')
     .delete()
     .eq('id', list_id)
     .execute())


def count_saved_lists(user_id: str) -> int:
    r = (get_client().table('saved_shopping_lists')
         .select('id', count='exact')
         .eq('user_id', user_id)
         .execute())
    return r.count or 0
