import json
import os
import re
import anthropic
from bs4 import BeautifulSoup

_client: anthropic.Anthropic | None = None


def get_anthropic_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY', ''))
    return _client


def _parse_json_response(text: str) -> dict | list | None:
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r'[\[{].*[\]}]', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return None
        return None


def sanitize_recipe(data: dict) -> dict | None:
    def clean(s: str, max_len: int) -> str:
        if not isinstance(s, str):
            return str(s)[:max_len] if s else ''
        s = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', s)
        return s[:max_len]

    name = clean(data.get('recipe_name', ''), 200).strip()
    if not name:
        return None

    ingredients = data.get('ingredients', [])
    if not isinstance(ingredients, list) or not ingredients:
        return None

    sanitized_ingredients = []
    for ing in ingredients:
        if isinstance(ing, dict):
            sanitized_ingredients.append({
                'name': clean(ing.get('name', ''), 100),
                'normalized_name': clean(ing.get('normalized_name', ing.get('name', '')), 100).lower(),
                'quantity': clean(ing.get('quantity', ''), 50),
                'unit': clean(ing.get('unit', ''), 50),
                'category': clean(ing.get('category', 'other'), 50),
            })

    if not sanitized_ingredients:
        return None

    instructions = []
    for inst in data.get('instructions', []):
        if isinstance(inst, str):
            instructions.append(clean(inst, 2000))

    equipment = []
    for eq in data.get('equipment', []):
        if isinstance(eq, dict):
            equipment.append({
                'name': clean(eq.get('name', ''), 100),
                'is_special': bool(eq.get('is_special', False)),
            })

    return {
        'recipe_name': name,
        'servings': clean(data.get('servings', ''), 50),
        'prep_time': clean(data.get('prep_time', ''), 50),
        'cook_time': clean(data.get('cook_time', ''), 50),
        'ingredients': sanitized_ingredients,
        'instructions': instructions,
        'equipment': equipment,
    }


def extract_og_image(html: str) -> str | None:
    try:
        soup = BeautifulSoup(html, 'html.parser')
        og = soup.find('meta', property='og:image')
        if og and og.get('content'):
            return og['content']
    except Exception:
        pass
    return None


def identify_recipe_url(description_text: str) -> str | None:
    client = get_anthropic_client()
    try:
        resp = client.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=500,
            messages=[{
                'role': 'user',
                'content': (
                    'Here is a YouTube video description. Which URL in this text links to a '
                    'recipe page (a blog post or website with the actual recipe)? '
                    'Do NOT return social media links, merch links, sponsor links, '
                    'links to other videos, or Amazon affiliate links. '
                    'Return ONLY the URL, nothing else. If there is no recipe URL, '
                    'return exactly the word "none".\n\n'
                    f'{description_text[:3000]}'
                ),
            }],
        )
        result = resp.content[0].text.strip()
        if result.lower() == 'none' or not result.startswith('http'):
            return None
        return result
    except Exception:
        return None


RECIPE_EXTRACTION_PROMPT = """Extract the recipe from this text as JSON. Return ONLY valid JSON, no markdown.

Format:
{
  "recipe_name": "string",
  "servings": "string or null",
  "prep_time": "string or null",
  "cook_time": "string or null",
  "ingredients": [
    {"name": "display name", "normalized_name": "lowercase common name for matching", "quantity": "string", "unit": "string", "category": "produce|dairy|meat|seafood|pantry|spice|frozen|bakery|other"}
  ],
  "instructions": ["step 1", "step 2"],
  "equipment": [
    {"name": "string", "is_special": false}
  ]
}

For normalized_name: use the simplest common name. "Parmigiano-Reggiano, freshly grated" -> "parmesan". "All-purpose flour, sifted" -> "flour". "Boneless skinless chicken thighs" -> "chicken thighs".

For is_special: true if the tool is NOT typically in an average home kitchen (stand mixer, food processor, sous vide, blowtorch). false for common items (oven, stovetop, knife, whisk, pot, pan, baking sheet).

Categories: produce, dairy, meat, seafood, pantry, spice, frozen, bakery, other."""


def extract_recipe_from_page(page_text: str, source_url: str = None) -> dict | None:
    client = get_anthropic_client()
    try:
        resp = client.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=4096,
            messages=[{
                'role': 'user',
                'content': f'{RECIPE_EXTRACTION_PROMPT}\n\nText:\n{page_text[:8000]}',
            }],
        )
        data = _parse_json_response(resp.content[0].text)
        if not data or not isinstance(data, dict):
            return None
        return sanitize_recipe(data)
    except Exception:
        return None


def extract_recipe_from_transcript(transcript: str, video_title: str = None) -> dict | None:
    client = get_anthropic_client()
    title_hint = f' The video is titled "{video_title}".' if video_title else ''
    try:
        resp = client.messages.create(
            model='claude-sonnet-4-5-20250929',
            max_tokens=4096,
            messages=[{
                'role': 'user',
                'content': (
                    f'{RECIPE_EXTRACTION_PROMPT}\n\n'
                    f'This is a transcript from a cooking video.{title_hint} '
                    f'Extract the recipe even if the transcript is informal.\n\n'
                    f'Transcript:\n{transcript[:12000]}'
                ),
            }],
        )
        data = _parse_json_response(resp.content[0].text)
        if not data or not isinstance(data, dict):
            return None
        return sanitize_recipe(data)
    except Exception:
        return None


def suggest_substitutions(pantry_items: list[str], user_tools: list[str],
                          missing_ingredients: list[dict],
                          missing_tools: list[dict]) -> list[dict]:
    client = get_anthropic_client()
    try:
        resp = client.messages.create(
            model='claude-sonnet-4-5-20250929',
            max_tokens=4096,
            messages=[{
                'role': 'user',
                'content': (
                    'You are a cooking substitution expert. Given what the user has available, '
                    'suggest reasonable cooking substitutions for what they are missing.\n\n'
                    f'User\'s pantry: {", ".join(pantry_items[:100])}\n'
                    f'User\'s tools: {", ".join(user_tools[:50])}\n\n'
                    f'Missing ingredients: {json.dumps(missing_ingredients[:50])}\n'
                    f'Missing tools: {json.dumps(missing_tools[:20])}\n\n'
                    'Return ONLY valid JSON array:\n'
                    '[{"missing": "item name", "type": "ingredient"|"tool", '
                    '"substitute": "what to use instead", "notes": "brief explanation"}]\n\n'
                    'Only suggest substitutions where a reasonable swap exists. '
                    'Skip items with no good substitute.'
                ),
            }],
        )
        data = _parse_json_response(resp.content[0].text)
        if not data or not isinstance(data, list):
            return []
        return data
    except Exception:
        return []
