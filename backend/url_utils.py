import re
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

TRACKING_PARAMS = {
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'fbclid', 'gclid', 'ref', 'source', 'si',
}

YOUTUBE_KEEP_PARAMS = {'v'}

YOUTUBE_HOSTS = {'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'}


def normalize_url(url: str) -> str:
    url = url.strip()
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url

    parsed = urlparse(url)
    host = parsed.hostname.lower() if parsed.hostname else ''

    if host.startswith('www.'):
        host = host[4:]

    path = parsed.path.rstrip('/')
    params = parse_qs(parsed.query, keep_blank_values=False)

    if host in ('youtu.be',):
        video_id = path.lstrip('/')
        return f'https://youtube.com/watch?v={video_id}'

    if host in ('youtube.com', 'm.youtube.com'):
        host = 'youtube.com'
        if '/watch' in path:
            filtered = {k: v[0] for k, v in params.items() if k in YOUTUBE_KEEP_PARAMS}
            query = urlencode(sorted(filtered.items()))
            return f'https://youtube.com/watch?{query}' if query else f'https://youtube.com/watch'
        return urlunparse(('https', host, path, '', '', ''))

    filtered = {k: v[0] for k, v in params.items() if k not in TRACKING_PARAMS}
    query = urlencode(sorted(filtered.items()))
    return urlunparse(('https', host, path, '', query, ''))


def is_youtube_video(url: str) -> bool:
    parsed = urlparse(url)
    host = (parsed.hostname or '').lower().replace('www.', '').replace('m.', '')
    if host == 'youtu.be':
        path = parsed.path.lstrip('/')
        return bool(path) and '/shorts/' not in parsed.path
    if host == 'youtube.com':
        return '/watch' in parsed.path and 'v' in parse_qs(parsed.query)
    return False


def is_youtube_short(url: str) -> bool:
    parsed = urlparse(url)
    host = (parsed.hostname or '').lower().replace('www.', '').replace('m.', '')
    if host in ('youtube.com', 'youtu.be'):
        return '/shorts/' in parsed.path
    return False


def is_youtube_live(url: str) -> bool:
    parsed = urlparse(url)
    host = (parsed.hostname or '').lower().replace('www.', '').replace('m.', '')
    if host in ('youtube.com', 'youtu.be'):
        return '/live/' in parsed.path
    return False


def is_youtube_channel(url: str) -> bool:
    parsed = urlparse(url)
    host = (parsed.hostname or '').lower().replace('www.', '').replace('m.', '')
    if host != 'youtube.com':
        return False
    path = parsed.path
    return bool(
        re.match(r'^/@[\w.-]+', path)
        or path.startswith('/channel/')
        or path.startswith('/c/')
        or path.startswith('/user/')
    )


def extract_video_id(url: str) -> str | None:
    if is_youtube_short(url) or is_youtube_live(url):
        return None
    parsed = urlparse(url)
    host = (parsed.hostname or '').lower().replace('www.', '').replace('m.', '')
    if host == 'youtu.be':
        vid = parsed.path.lstrip('/')
        return vid if vid else None
    if host == 'youtube.com':
        params = parse_qs(parsed.query)
        v = params.get('v')
        return v[0] if v else None
    return None
