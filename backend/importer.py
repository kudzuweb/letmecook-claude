import asyncio
import ipaddress
import logging
import socket
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx

import db
from url_utils import (
    normalize_url, is_youtube_video, is_youtube_short,
    is_youtube_live, extract_video_id,
)
from youtube import (
    fetch_video_page, extract_description_text,
    extract_video_metadata, get_thumbnail_url, get_transcript,
)
from claude_extract import (
    identify_recipe_url, extract_recipe_from_page,
    extract_recipe_from_transcript, extract_og_image,
)

logger = logging.getLogger(__name__)

BLOCKED_NETWORKS = [
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16'),
    ipaddress.ip_network('169.254.0.0/16'),
    ipaddress.ip_network('127.0.0.0/8'),
    ipaddress.ip_network('::1/128'),
    ipaddress.ip_network('fc00::/7'),
]


def _is_private_ip(ip_str: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip_str)
        return any(addr in net for net in BLOCKED_NETWORKS)
    except ValueError:
        return True


async def safe_fetch(url: str) -> httpx.Response:
    parsed = urlparse(url)
    if parsed.scheme not in ('http', 'https'):
        raise ValueError(f'Unsupported scheme: {parsed.scheme}')

    hostname = parsed.hostname
    if not hostname:
        raise ValueError('No hostname in URL')

    try:
        results = socket.getaddrinfo(hostname, None)
        for _, _, _, _, addr in results:
            ip = addr[0]
            if _is_private_ip(ip):
                raise ValueError('URL resolves to a private/internal address')
    except socket.gaierror:
        raise ValueError(f'Could not resolve hostname: {hostname}')

    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp


async def import_youtube_video(url: str, user_id: str = None) -> dict:
    if is_youtube_short(url):
        raise ValueError("YouTube Shorts aren't supported — try a regular video link")
    if is_youtube_live(url):
        raise ValueError("Live streams aren't supported — try a regular video link")
    if not is_youtube_video(url):
        raise ValueError('Not a valid YouTube video URL')

    canonical = normalize_url(url)
    video_id = extract_video_id(url)
    if not video_id:
        raise ValueError('Could not extract video ID')

    cached = db.get_recipe_by_canonical_url(canonical)
    if cached:
        if user_id:
            try:
                db.save_user_recipe(user_id, cached['id'])
            except Exception:
                pass
            increment_import_count_for_user(user_id)
        return {
            'recipe_id': cached['id'],
            'recipe_name': cached['recipe_name'],
            'ingredient_count': len(cached.get('ingredients', [])),
            'source': 'cache',
            'cached': True,
        }

    html = await fetch_video_page(video_id, safe_fetch_fn=safe_fetch)
    metadata = extract_video_metadata(html)
    description = extract_description_text(html)
    thumbnail = get_thumbnail_url(video_id)

    recipe_data = None
    source = None
    image_url = thumbnail
    recipe_page_url = None

    if description:
        recipe_url = identify_recipe_url(description)
        if recipe_url:
            try:
                page_resp = await safe_fetch(recipe_url)
                page_html = page_resp.text
                og_image = extract_og_image(page_html)
                if og_image:
                    image_url = og_image
                recipe_data = extract_recipe_from_page(page_html, source_url=recipe_url)
                if recipe_data:
                    source = 'recipe_link'
                    recipe_page_url = recipe_url
            except Exception as e:
                logger.warning(f'Failed to fetch recipe page {recipe_url}: {e}')

    if not recipe_data:
        transcript = get_transcript(video_id)
        if transcript:
            recipe_data = extract_recipe_from_transcript(
                transcript, video_title=metadata.get('title')
            )
            if recipe_data:
                source = 'transcript'

    if not recipe_data:
        raise ImportError("Couldn't find a recipe in this video")

    db_recipe = db.upsert_recipe({
        'canonical_url': canonical,
        'source_type': 'youtube',
        'youtube_video_id': video_id,
        'youtube_url': f'https://www.youtube.com/watch?v={video_id}',
        'recipe_url': recipe_page_url,
        'recipe_name': recipe_data['recipe_name'],
        'servings': recipe_data.get('servings'),
        'prep_time': recipe_data.get('prep_time'),
        'cook_time': recipe_data.get('cook_time'),
        'ingredients': recipe_data['ingredients'],
        'instructions': recipe_data.get('instructions', []),
        'equipment': recipe_data.get('equipment', []),
        'channel_id': metadata.get('channel_id'),
        'channel_name': metadata.get('channel_name'),
        'image_url': image_url,
    })

    if user_id:
        try:
            db.save_user_recipe(user_id, db_recipe['id'])
        except Exception:
            pass
        increment_import_count_for_user(user_id)

    return {
        'recipe_id': db_recipe['id'],
        'recipe_name': db_recipe['recipe_name'],
        'ingredient_count': len(recipe_data['ingredients']),
        'source': source,
        'cached': False,
    }


async def import_recipe_url(url: str, user_id: str = None) -> dict:
    canonical = normalize_url(url)

    cached = db.get_recipe_by_canonical_url(canonical)
    if cached:
        if user_id:
            try:
                db.save_user_recipe(user_id, cached['id'])
            except Exception:
                pass
            increment_import_count_for_user(user_id)
        return {
            'recipe_id': cached['id'],
            'recipe_name': cached['recipe_name'],
            'ingredient_count': len(cached.get('ingredients', [])),
            'source': 'cache',
            'cached': True,
        }

    page_resp = await safe_fetch(url)
    page_html = page_resp.text
    og_image = extract_og_image(page_html)

    recipe_data = extract_recipe_from_page(page_html, source_url=url)
    if not recipe_data:
        raise ImportError("Couldn't find a recipe on this page")

    db_recipe = db.upsert_recipe({
        'canonical_url': canonical,
        'source_type': 'website',
        'recipe_url': url,
        'recipe_name': recipe_data['recipe_name'],
        'servings': recipe_data.get('servings'),
        'prep_time': recipe_data.get('prep_time'),
        'cook_time': recipe_data.get('cook_time'),
        'ingredients': recipe_data['ingredients'],
        'instructions': recipe_data.get('instructions', []),
        'equipment': recipe_data.get('equipment', []),
        'image_url': og_image,
    })

    if user_id:
        try:
            db.save_user_recipe(user_id, db_recipe['id'])
        except Exception:
            pass
        increment_import_count_for_user(user_id)

    return {
        'recipe_id': db_recipe['id'],
        'recipe_name': db_recipe['recipe_name'],
        'ingredient_count': len(recipe_data['ingredients']),
        'source': 'direct',
        'cached': False,
    }


async def run_playlist_import(job_id: str, playlist_id: str, user_id: str):
    try:
        db.update_import_job(job_id, status='processing')
        # Placeholder: in production, use YouTube Data API to get playlist videos
        # For now, this structure is correct for when we add OAuth
        video_urls = []  # await youtube.get_playlist_video_urls(playlist_id)
        db.update_import_job(job_id, total_videos=len(video_urls))

        for url in video_urls:
            try:
                await import_youtube_video(url, user_id=user_id)
                db.update_import_job(job_id, succeeded_increment=True)
            except Exception as e:
                db.update_import_job(job_id, failed_increment=True,
                                     error={'url': url, 'reason': str(e)})
            db.update_import_job(job_id, processed_increment=True)

        final = db.get_import_job(job_id)
        status = 'completed' if (final or {}).get('succeeded', 0) > 0 else 'failed'
        db.update_import_job(job_id, status=status)
    except Exception as e:
        db.update_import_job(job_id, status='failed',
                             error={'url': 'job_level', 'reason': str(e)})


async def run_channel_import(job_id: str, channel_id: str, user_id: str):
    try:
        db.update_import_job(job_id, status='processing')
        video_urls = []  # await youtube.get_channel_video_urls(channel_id)
        db.update_import_job(job_id, total_videos=len(video_urls))

        for url in video_urls:
            try:
                await import_youtube_video(url, user_id=None)
                db.update_import_job(job_id, succeeded_increment=True)
            except Exception as e:
                db.update_import_job(job_id, failed_increment=True,
                                     error={'url': url, 'reason': str(e)})
            db.update_import_job(job_id, processed_increment=True)

        final = db.get_import_job(job_id)
        status = 'completed' if (final or {}).get('succeeded', 0) > 0 else 'failed'
        db.update_import_job(job_id, status=status)
    except Exception as e:
        db.update_import_job(job_id, status='failed',
                             error={'url': 'job_level', 'reason': str(e)})


def check_import_limit(user_id: str, is_pro: bool = False) -> dict:
    if is_pro:
        return {'allowed': True, 'used': 0, 'limit': -1, 'resets': ''}
    now = datetime.now(timezone.utc)
    month = now.strftime('%Y-%m')
    used = db.get_import_count(user_id, month)
    limit = 10
    next_month = now.month + 1
    next_year = now.year
    if next_month > 12:
        next_month = 1
        next_year += 1
    resets = f'{next_year}-{next_month:02d}-01'
    return {
        'allowed': used < limit,
        'used': used,
        'limit': limit,
        'resets': resets,
        'is_pro': False,
    }


def increment_import_count_for_user(user_id: str) -> None:
    month = datetime.now(timezone.utc).strftime('%Y-%m')
    db.increment_import_count(user_id, month)
