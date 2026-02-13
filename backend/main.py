import asyncio
import logging
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

import db
from importer import (
    import_youtube_video, import_recipe_url,
    run_playlist_import, run_channel_import,
    check_import_limit,
)
from matching import compute_matches, generate_shopping_list
from claude_extract import suggest_substitutions
from url_utils import is_youtube_channel
from youtube import extract_channel_id_from_url

load_dotenv()
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="PantryPal API", version="1.0.0")
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"error": "Too many requests. Please slow down."})


@app.exception_handler(Exception)
async def generic_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"error": "Something went wrong"})


# --- Request Models ---

class ImportYoutubeRequest(BaseModel):
    youtube_url: str = Field(max_length=2000)
    user_id: str = Field(max_length=100)

class ImportRecipeUrlRequest(BaseModel):
    url: str = Field(max_length=2000)
    user_id: str = Field(max_length=100)

class ImportChannelRequest(BaseModel):
    channel_url: str = Field(max_length=2000)
    user_id: str = Field(max_length=100)

class ImportPlaylistRequest(BaseModel):
    playlist_id: str = Field(max_length=200)
    user_id: str = Field(max_length=100)

class AddRecipeRequest(BaseModel):
    recipe_id: str = Field(max_length=100)

class UpdateRecipeRequest(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = Field(None, max_length=5000)

class FavoriteChefRequest(BaseModel):
    channel_id: str = Field(max_length=200)

class PantryItemRequest(BaseModel):
    name: str = Field(max_length=200)
    category: str = Field(default='staple', max_length=20)
    @field_validator('category')
    @classmethod
    def validate_category(cls, v):
        if v not in ('staple', 'current', 'tool'):
            raise ValueError('category must be staple, current, or tool')
        return v

class CreateCollectionRequest(BaseModel):
    name: str = Field(max_length=200)

class RenameCollectionRequest(BaseModel):
    name: str = Field(max_length=200)

class ReorderCollectionsRequest(BaseModel):
    ordered_ids: list[str] = Field(max_length=100)

class CollectionRecipeRequest(BaseModel):
    user_recipe_id: str = Field(max_length=100)

class MatchRequest(BaseModel):
    user_id: str = Field(max_length=100)
    channel_id: Optional[str] = None
    only_my_tools: bool = False

class SubstitutionsRequest(BaseModel):
    user_id: str = Field(max_length=100)
    missing_ingredients: list[dict] = Field(default_factory=list, max_length=50)
    missing_tools: list[dict] = Field(default_factory=list, max_length=20)
    pantry_items: list[str] = Field(default_factory=list, max_length=200)
    user_tools: list[str] = Field(default_factory=list, max_length=50)

class GenerateShoppingListRequest(BaseModel):
    user_id: str = Field(max_length=100)
    recipe_ids: list[str] = Field(max_length=50)

class SaveShoppingListRequest(BaseModel):
    name: str = Field(max_length=200)
    recipe_ids: list[str] = Field(default_factory=list, max_length=50)
    items: list[dict] = Field(default_factory=list)


# --- Health ---

@app.get("/health")
async def health():
    return {"status": "ok"}


# --- Import ---

@app.post("/api/import/youtube")
@limiter.limit("30/minute")
async def api_import_youtube(req: ImportYoutubeRequest, request: Request):
    limit = check_import_limit(req.user_id)
    if not limit['allowed']:
        return JSONResponse(status_code=403, content={
            "error": "Monthly import limit reached",
            "used": limit['used'], "limit": limit['limit'], "resets": limit['resets'],
        })
    try:
        result = await import_youtube_video(req.youtube_url, user_id=req.user_id)
        return result
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except ImportError as e:
        return JSONResponse(status_code=422, content={"error": str(e)})


@app.post("/api/import/recipe-url")
@limiter.limit("30/minute")
async def api_import_recipe_url(req: ImportRecipeUrlRequest, request: Request):
    limit = check_import_limit(req.user_id)
    if not limit['allowed']:
        return JSONResponse(status_code=403, content={
            "error": "Monthly import limit reached",
            "used": limit['used'], "limit": limit['limit'], "resets": limit['resets'],
        })
    try:
        result = await import_recipe_url(req.url, user_id=req.user_id)
        return result
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except ImportError as e:
        return JSONResponse(status_code=422, content={"error": str(e)})


@app.post("/api/import/channel")
@limiter.limit("30/minute")
async def api_import_channel(req: ImportChannelRequest, request: Request):
    if not is_youtube_channel(req.channel_url):
        return JSONResponse(status_code=400, content={"error": "Not a valid YouTube channel URL"})
    channel_id = extract_channel_id_from_url(req.channel_url)
    if not channel_id:
        return JSONResponse(status_code=400, content={"error": "Could not extract channel ID"})
    job = db.create_import_job(req.user_id, 'channel', channel_id)
    asyncio.create_task(run_channel_import(job['id'], channel_id, req.user_id))
    return JSONResponse(status_code=202, content={
        "job_id": job['id'], "channel_id": channel_id,
    })


@app.post("/api/import/playlist")
@limiter.limit("30/minute")
async def api_import_playlist(req: ImportPlaylistRequest, request: Request):
    job = db.create_import_job(req.user_id, 'playlist', req.playlist_id)
    asyncio.create_task(run_playlist_import(job['id'], req.playlist_id, req.user_id))
    return JSONResponse(status_code=202, content={
        "job_id": job['id'],
    })


@app.get("/api/import/job/{job_id}")
async def api_get_import_job(job_id: str):
    job = db.get_import_job(job_id)
    if not job:
        return JSONResponse(status_code=404, content={"error": "Job not found"})
    return job


@app.get("/api/import/limit/{user_id}")
@limiter.limit("30/minute")
async def api_get_import_limit(user_id: str, request: Request):
    return check_import_limit(user_id)


# --- Shared Recipes ---

@app.get("/api/recipes")
@limiter.limit("30/minute")
async def api_get_recipes(request: Request, channel_id: str = None,
                          search: str = None, limit: int = 50, offset: int = 0):
    recipes, total = db.search_recipes(search=search, channel_id=channel_id,
                                       limit=min(limit, 100), offset=offset)
    return {"recipes": recipes, "total": total}


@app.get("/api/recipes/{recipe_id}")
@limiter.limit("30/minute")
async def api_get_recipe(recipe_id: str, request: Request):
    recipe = db.get_recipe_by_id(recipe_id)
    if not recipe:
        return JSONResponse(status_code=404, content={"error": "Recipe not found"})
    return recipe


# --- User Library ---

@app.get("/api/user/{user_id}/recipes")
@limiter.limit("30/minute")
async def api_get_user_recipes(user_id: str, request: Request):
    return {"recipes": db.get_user_recipes(user_id)}


@app.post("/api/user/{user_id}/recipes")
@limiter.limit("30/minute")
async def api_add_user_recipe(user_id: str, req: AddRecipeRequest, request: Request):
    try:
        result = db.save_user_recipe(user_id, req.recipe_id)
        return JSONResponse(status_code=201, content={
            "user_recipe_id": result['id'], "recipe_id": req.recipe_id,
        })
    except Exception:
        return JSONResponse(status_code=409, content={"error": "Recipe already in library"})


@app.delete("/api/user/{user_id}/recipes/{recipe_id}")
@limiter.limit("30/minute")
async def api_remove_user_recipe(user_id: str, recipe_id: str, request: Request):
    db.remove_user_recipe(user_id, recipe_id)
    return JSONResponse(status_code=204, content=None)


@app.patch("/api/user/{user_id}/recipes/{recipe_id}")
@limiter.limit("30/minute")
async def api_update_user_recipe(user_id: str, recipe_id: str,
                                 req: UpdateRecipeRequest, request: Request):
    result = db.update_user_recipe(user_id, recipe_id,
                                   rating=req.rating if req.rating is not None else ...,
                                   notes=req.notes if req.notes is not None else ...)
    return result


# --- Favorite Chefs ---

@app.get("/api/user/{user_id}/chefs")
@limiter.limit("30/minute")
async def api_get_user_chefs(user_id: str, request: Request):
    return {"chefs": db.get_user_chefs(user_id)}


@app.get("/api/user/{user_id}/chefs/favorites")
@limiter.limit("30/minute")
async def api_get_favorite_chefs(user_id: str, request: Request):
    return {"chefs": db.get_favorite_chefs(user_id)}


@app.post("/api/user/{user_id}/chefs/favorites")
@limiter.limit("30/minute")
async def api_add_favorite_chef(user_id: str, req: FavoriteChefRequest, request: Request):
    db.add_favorite_chef(user_id, req.channel_id)
    return JSONResponse(status_code=201, content={"status": "ok"})


@app.delete("/api/user/{user_id}/chefs/favorites/{channel_id}")
@limiter.limit("30/minute")
async def api_remove_favorite_chef(user_id: str, channel_id: str, request: Request):
    db.remove_favorite_chef(user_id, channel_id)
    return JSONResponse(status_code=204, content=None)


# --- Pantry ---

@app.get("/api/user/{user_id}/pantry")
@limiter.limit("30/minute")
async def api_get_pantry(user_id: str, request: Request):
    return db.get_pantry(user_id)


@app.post("/api/user/{user_id}/pantry")
@limiter.limit("30/minute")
async def api_add_pantry_item(user_id: str, req: PantryItemRequest, request: Request):
    try:
        result = db.add_pantry_item(user_id, req.name, req.category)
        return JSONResponse(status_code=201, content=result)
    except Exception:
        return JSONResponse(status_code=409, content={"error": "Item already exists"})


@app.delete("/api/user/{user_id}/pantry/{item_id}")
@limiter.limit("30/minute")
async def api_remove_pantry_item(user_id: str, item_id: str, request: Request):
    db.remove_pantry_item(item_id)
    return JSONResponse(status_code=204, content=None)


# --- Collections ---

@app.get("/api/user/{user_id}/collections")
@limiter.limit("30/minute")
async def api_get_collections(user_id: str, request: Request):
    return {"collections": db.get_collections(user_id)}


@app.post("/api/user/{user_id}/collections")
@limiter.limit("30/minute")
async def api_create_collection(user_id: str, req: CreateCollectionRequest, request: Request):
    result = db.create_collection(user_id, req.name)
    return JSONResponse(status_code=201, content=result)


@app.patch("/api/user/{user_id}/collections/{collection_id}")
@limiter.limit("30/minute")
async def api_rename_collection(user_id: str, collection_id: str,
                                req: RenameCollectionRequest, request: Request):
    return db.rename_collection(collection_id, req.name)


@app.delete("/api/user/{user_id}/collections/{collection_id}")
@limiter.limit("30/minute")
async def api_delete_collection(user_id: str, collection_id: str, request: Request):
    db.delete_collection(collection_id)
    return JSONResponse(status_code=204, content=None)


@app.put("/api/user/{user_id}/collections/reorder")
@limiter.limit("30/minute")
async def api_reorder_collections(user_id: str, req: ReorderCollectionsRequest, request: Request):
    db.reorder_collections(user_id, req.ordered_ids)
    return {"status": "ok"}


@app.get("/api/user/{user_id}/collections/{collection_id}/recipes")
@limiter.limit("30/minute")
async def api_get_collection_recipes(user_id: str, collection_id: str, request: Request):
    return {"recipes": db.get_collection_recipes(collection_id, user_id)}


@app.post("/api/user/{user_id}/collections/{collection_id}/recipes")
@limiter.limit("30/minute")
async def api_add_to_collection(user_id: str, collection_id: str,
                                req: CollectionRecipeRequest, request: Request):
    db.add_recipe_to_collection(collection_id, req.user_recipe_id)
    return JSONResponse(status_code=201, content={"status": "ok"})


@app.delete("/api/user/{user_id}/collections/{collection_id}/recipes/{user_recipe_id}")
@limiter.limit("30/minute")
async def api_remove_from_collection(user_id: str, collection_id: str,
                                     user_recipe_id: str, request: Request):
    db.remove_recipe_from_collection(collection_id, user_recipe_id)
    return JSONResponse(status_code=204, content=None)


# --- Matching ---

@app.post("/api/match")
@limiter.limit("30/minute")
async def api_match(req: MatchRequest, request: Request):
    pantry = db.get_pantry(req.user_id)
    pantry_items = [i['name'] for i in pantry.get('staples', [])] + \
                   [i['name'] for i in pantry.get('current', [])]
    user_tools = [i['name'] for i in pantry.get('tools', [])]

    recipes = db.get_user_recipes(req.user_id)
    if req.channel_id:
        recipes = [r for r in recipes if r.get('channel_id') == req.channel_id]

    matches = compute_matches(pantry_items, user_tools, recipes,
                              only_my_tools=req.only_my_tools)
    return {"matches": matches}


@app.post("/api/substitutions")
@limiter.limit("30/minute")
async def api_substitutions(req: SubstitutionsRequest, request: Request):
    results = suggest_substitutions(
        req.pantry_items, req.user_tools,
        req.missing_ingredients, req.missing_tools,
    )
    return {"substitutions": results}


# --- Shopping Lists ---

@app.post("/api/shopping-list/generate")
@limiter.limit("30/minute")
async def api_generate_shopping_list(req: GenerateShoppingListRequest, request: Request):
    pantry = db.get_pantry(req.user_id)
    pantry_items = [i['name'] for i in pantry.get('staples', [])] + \
                   [i['name'] for i in pantry.get('current', [])]

    recipes = []
    for rid in req.recipe_ids:
        recipe = db.get_recipe_by_id(rid)
        if recipe:
            recipes.append(recipe)

    items = generate_shopping_list(pantry_items, recipes)
    return {"items": items}


@app.get("/api/user/{user_id}/shopping-lists")
@limiter.limit("30/minute")
async def api_get_shopping_lists(user_id: str, request: Request):
    return {"lists": db.get_saved_lists(user_id)}


@app.post("/api/user/{user_id}/shopping-lists")
@limiter.limit("30/minute")
async def api_save_shopping_list(user_id: str, req: SaveShoppingListRequest, request: Request):
    count = db.count_saved_lists(user_id)
    # TODO: check isPro for 10 limit vs 1
    if count >= 10:
        return JSONResponse(status_code=403, content={
            "error": "You've reached the maximum number of saved shopping lists.",
            "count": count, "limit": 10,
        })
    result = db.save_shopping_list(user_id, req.name, req.recipe_ids, req.items)
    return JSONResponse(status_code=201, content={"id": result['id'], "name": result['name']})


@app.delete("/api/user/{user_id}/shopping-lists/{list_id}")
@limiter.limit("30/minute")
async def api_delete_shopping_list(user_id: str, list_id: str, request: Request):
    db.delete_shopping_list(list_id)
    return JSONResponse(status_code=204, content=None)


@app.get("/api/user/{user_id}/shopping-lists/count")
@limiter.limit("30/minute")
async def api_shopping_list_count(user_id: str, request: Request):
    count = db.count_saved_lists(user_id)
    return {"count": count, "limit": 10, "is_pro": False}
