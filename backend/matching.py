def _normalize_name(name: str) -> str:
    return name.lower().strip()


def _token_overlap(a: str, b: str) -> bool:
    tokens_a = set(_normalize_name(a).split())
    tokens_b = set(_normalize_name(b).split())
    return bool(tokens_a & tokens_b)


def _ingredient_matches(pantry_name: str, recipe_normalized: str) -> bool:
    pn = _normalize_name(pantry_name)
    rn = _normalize_name(recipe_normalized)
    if pn in rn or rn in pn:
        return True
    return _token_overlap(pn, rn)


def compute_match(pantry_items: list[str], user_tools: list[str], recipe: dict,
                  only_my_tools: bool = False, tool_subs: dict = None) -> dict | None:
    ingredients = recipe.get('ingredients', [])
    equipment = recipe.get('equipment', [])
    tool_subs = tool_subs or {}

    matched_count = 0
    total = len(ingredients)
    missing_ingredients = []

    pantry_lower = [_normalize_name(p) for p in pantry_items]

    for ing in ingredients:
        norm = _normalize_name(ing.get('normalized_name', ing.get('name', '')))
        found = any(_ingredient_matches(p, norm) for p in pantry_lower)
        if found:
            matched_count += 1
        else:
            missing_ingredients.append({
                'name': ing.get('name', ''),
                'normalized_name': norm,
            })

    missing_tools = []
    tools_lower = [_normalize_name(t) for t in user_tools]

    for eq in equipment:
        eq_name = _normalize_name(eq.get('name', ''))
        has_tool = any(_ingredient_matches(t, eq_name) for t in tools_lower)
        has_sub = eq_name in tool_subs
        if not has_tool and not has_sub:
            missing_tools.append({
                'name': eq.get('name', ''),
                'is_special': eq.get('is_special', False),
            })

    if only_my_tools and missing_tools:
        uncovered = [t for t in missing_tools if _normalize_name(t['name']) not in tool_subs]
        if uncovered:
            return None

    coverage = matched_count / total if total > 0 else 0

    return {
        'recipe_id': recipe.get('id', recipe.get('recipe_id', '')),
        'user_recipe_id': recipe.get('user_recipe_id', ''),
        'recipe_name': recipe.get('recipe_name', ''),
        'channel_name': recipe.get('channel_name', ''),
        'channel_id': recipe.get('channel_id', ''),
        'image_url': recipe.get('image_url', ''),
        'servings': recipe.get('servings', ''),
        'prep_time': recipe.get('prep_time', ''),
        'cook_time': recipe.get('cook_time', ''),
        'coverage': round(coverage, 4),
        'matched': matched_count,
        'total': total,
        'missing_ingredients': missing_ingredients,
        'missing_tools': missing_tools,
        'rating': recipe.get('rating'),
    }


def compute_matches(pantry_items: list[str], user_tools: list[str],
                    recipes: list[dict], only_my_tools: bool = False,
                    tool_subs: dict = None) -> list[dict]:
    matches = []
    for recipe in recipes:
        result = compute_match(pantry_items, user_tools, recipe,
                               only_my_tools=only_my_tools, tool_subs=tool_subs)
        if result is not None:
            matches.append(result)
    matches.sort(key=lambda x: x['coverage'], reverse=True)
    return matches


def generate_shopping_list(pantry_items: list[str], recipes: list[dict]) -> list[dict]:
    pantry_lower = {_normalize_name(p) for p in pantry_items}
    needed = {}

    for recipe in recipes:
        for ing in recipe.get('ingredients', []):
            norm = _normalize_name(ing.get('normalized_name', ing.get('name', '')))
            if any(_ingredient_matches(p, norm) for p in pantry_lower):
                continue
            key = norm
            if key not in needed:
                needed[key] = {
                    'name': ing.get('name', ''),
                    'quantity': ing.get('quantity', ''),
                    'unit': ing.get('unit', ''),
                    'category': ing.get('category', 'other'),
                    'recipe_names': [],
                }
            needed[key]['recipe_names'].append(recipe.get('recipe_name', ''))

    categories = {}
    for item in needed.values():
        cat = item['category']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(item)

    return [
        {'category': cat, 'ingredients': items}
        for cat, items in sorted(categories.items())
    ]
