"""
Seed Eitan Bernath's recipes into the shared recipes table.
Run: python scripts/seed_eitan.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from importer import import_recipe_url, import_youtube_video

EITAN_URLS = [
    'https://www.youtube.com/watch?v=5oBE1qax3yI',
    'https://www.youtube.com/watch?v=1FYDsNJ4Q_E',
    'https://www.youtube.com/watch?v=3OdKHELqf3k',
    'https://www.youtube.com/watch?v=qR04P7g2hsA',
    'https://www.youtube.com/watch?v=gBJkWb0Oi-U',
    'https://www.youtube.com/watch?v=4Kq0kCZ7E2A',
    'https://www.youtube.com/watch?v=vBJdIb0nN5U',
    'https://www.youtube.com/watch?v=xTm2K9hOryQ',
    'https://www.youtube.com/watch?v=YH38mJw1A_I',
    'https://www.youtube.com/watch?v=DJJEgQ2-5Bg',
]


async def main():
    succeeded = 0
    failed = 0

    for url in EITAN_URLS:
        try:
            result = await import_youtube_video(url, user_id=None)
            print(f"OK: {result['recipe_name']}")
            succeeded += 1
        except Exception as e:
            print(f"FAIL: {url} - {e}")
            failed += 1

    print(f"\nDone: {succeeded} succeeded, {failed} failed")


if __name__ == '__main__':
    asyncio.run(main())
