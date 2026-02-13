import json
import re
import httpx
from youtube_transcript_api import YouTubeTranscriptApi
from url_utils import extract_video_id


async def fetch_video_page(video_id: str, safe_fetch_fn=None) -> str:
    url = f'https://www.youtube.com/watch?v={video_id}'
    if safe_fetch_fn:
        resp = await safe_fetch_fn(url)
    else:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, follow_redirects=True)
    resp.raise_for_status()
    return resp.text


def extract_description_text(html: str) -> str | None:
    match = re.search(r'var ytInitialData\s*=\s*({.*?});\s*</script>', html, re.DOTALL)
    if not match:
        match = re.search(r'ytInitialData\s*=\s*({.*?});\s*', html, re.DOTALL)
    if not match:
        return None
    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError:
        return None

    def find_description(obj):
        if isinstance(obj, dict):
            if 'attributedDescription' in obj:
                ad = obj['attributedDescription']
                if isinstance(ad, dict) and 'content' in ad:
                    return ad['content']
            if 'description' in obj and isinstance(obj['description'], dict):
                desc = obj['description']
                if 'simpleText' in desc:
                    return desc['simpleText']
                if 'runs' in desc:
                    return ''.join(r.get('text', '') for r in desc['runs'])
            for v in obj.values():
                result = find_description(v)
                if result:
                    return result
        elif isinstance(obj, list):
            for item in obj:
                result = find_description(item)
                if result:
                    return result
        return None

    return find_description(data)


def extract_video_metadata(html: str) -> dict:
    metadata = {
        'title': None,
        'channel_name': None,
        'channel_id': None,
        'thumbnail_url': None,
    }

    title_match = re.search(r'"title"\s*:\s*"([^"]*)"', html)
    if title_match:
        metadata['title'] = title_match.group(1)

    channel_match = re.search(r'"ownerChannelName"\s*:\s*"([^"]*)"', html)
    if not channel_match:
        channel_match = re.search(r'"author"\s*:\s*"([^"]*)"', html)
    if channel_match:
        metadata['channel_name'] = channel_match.group(1)

    cid_match = re.search(r'"channelId"\s*:\s*"([^"]*)"', html)
    if not cid_match:
        cid_match = re.search(r'"externalChannelId"\s*:\s*"([^"]*)"', html)
    if cid_match:
        metadata['channel_id'] = cid_match.group(1)

    return metadata


def get_thumbnail_url(video_id: str) -> str:
    return f'https://img.youtube.com/vi/{video_id}/hqdefault.jpg'


def get_transcript(video_id: str) -> str | None:
    try:
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(video_id)
        parts = [entry.text for entry in transcript.snippets]
        return ' '.join(parts)
    except Exception:
        return None


def extract_channel_id_from_url(url: str) -> str | None:
    match = re.search(r'/channel/(UC[\w-]+)', url)
    if match:
        return match.group(1)
    match = re.search(r'/@([\w.-]+)', url)
    if match:
        return match.group(1)
    match = re.search(r'/c/([\w.-]+)', url)
    if match:
        return match.group(1)
    match = re.search(r'/user/([\w.-]+)', url)
    if match:
        return match.group(1)
    return None
