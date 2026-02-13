import pytest
from matching import compute_match, compute_matches, generate_shopping_list


RECIPE = {
    'id': 'r1',
    'user_recipe_id': 'ur1',
    'recipe_name': 'Carbonara',
    'channel_name': 'Eitan Bernath',
    'channel_id': 'UC123',
    'image_url': 'https://example.com/img.jpg',
    'servings': '4',
    'prep_time': '10 min',
    'cook_time': '20 min',
    'rating': 4,
    'ingredients': [
        {'name': 'Spaghetti', 'normalized_name': 'spaghetti', 'quantity': '1', 'unit': 'lb', 'category': 'pantry'},
        {'name': 'Guanciale', 'normalized_name': 'guanciale', 'quantity': '200', 'unit': 'g', 'category': 'meat'},
        {'name': 'Pecorino Romano', 'normalized_name': 'pecorino', 'quantity': '100', 'unit': 'g', 'category': 'dairy'},
        {'name': 'Eggs', 'normalized_name': 'eggs', 'quantity': '4', 'unit': '', 'category': 'dairy'},
        {'name': 'Black Pepper', 'normalized_name': 'black pepper', 'quantity': '', 'unit': '', 'category': 'spice'},
    ],
    'equipment': [
        {'name': 'Large pot', 'is_special': False},
        {'name': 'Food processor', 'is_special': True},
    ],
}


class TestComputeMatch:
    def test_full_match(self):
        pantry = ['spaghetti', 'guanciale', 'pecorino', 'eggs', 'black pepper']
        result = compute_match(pantry, ['large pot', 'food processor'], RECIPE)
        assert result['coverage'] == 1.0
        assert result['matched'] == 5
        assert result['total'] == 5
        assert result['missing_ingredients'] == []

    def test_partial_match(self):
        pantry = ['spaghetti', 'eggs', 'black pepper']
        result = compute_match(pantry, [], RECIPE)
        assert result['coverage'] == 0.6
        assert result['matched'] == 3
        assert len(result['missing_ingredients']) == 2

    def test_no_match(self):
        result = compute_match([], [], RECIPE)
        assert result['coverage'] == 0.0
        assert result['matched'] == 0

    def test_normalized_matching(self):
        pantry = ['parmesan cheese']
        recipe = {**RECIPE, 'ingredients': [
            {'name': 'Parmesan', 'normalized_name': 'parmesan', 'quantity': '50', 'unit': 'g', 'category': 'dairy'},
        ]}
        result = compute_match(pantry, [], recipe)
        assert result['matched'] == 1

    def test_fuzzy_token_matching(self):
        pantry = ['chicken']
        recipe = {**RECIPE, 'ingredients': [
            {'name': 'Chicken Thighs', 'normalized_name': 'chicken thighs', 'quantity': '2', 'unit': 'lb', 'category': 'meat'},
        ]}
        result = compute_match(pantry, [], recipe)
        assert result['matched'] == 1

    def test_tool_matching(self):
        pantry = ['spaghetti', 'guanciale', 'pecorino', 'eggs', 'black pepper']
        result = compute_match(pantry, ['large pot'], RECIPE)
        assert len(result['missing_tools']) == 1
        assert result['missing_tools'][0]['name'] == 'Food processor'

    def test_only_my_tools_filters(self):
        pantry = ['spaghetti', 'guanciale', 'pecorino', 'eggs', 'black pepper']
        result = compute_match(pantry, ['large pot'], RECIPE, only_my_tools=True)
        assert result is None

    def test_tool_sub_bypasses_filter(self):
        pantry = ['spaghetti', 'guanciale', 'pecorino', 'eggs', 'black pepper']
        tool_subs = {'food processor': 'box grater + knife'}
        result = compute_match(pantry, ['large pot'], RECIPE,
                               only_my_tools=True, tool_subs=tool_subs)
        assert result is not None


class TestComputeMatches:
    def test_sorted_by_coverage(self):
        r1 = {**RECIPE, 'id': 'r1', 'recipe_name': 'Full Match',
               'ingredients': [{'name': 'salt', 'normalized_name': 'salt'}]}
        r2 = {**RECIPE, 'id': 'r2', 'recipe_name': 'Partial',
               'ingredients': [{'name': 'salt', 'normalized_name': 'salt'},
                               {'name': 'truffle', 'normalized_name': 'truffle'}]}
        matches = compute_matches(['salt'], [], [r1, r2])
        assert matches[0]['recipe_name'] == 'Full Match'
        assert matches[1]['recipe_name'] == 'Partial'


class TestGenerateShoppingList:
    def test_generates_grouped_list(self):
        recipes = [{
            'recipe_name': 'Carbonara',
            'ingredients': [
                {'name': 'Guanciale', 'normalized_name': 'guanciale', 'quantity': '200', 'unit': 'g', 'category': 'meat'},
                {'name': 'Salt', 'normalized_name': 'salt', 'quantity': '', 'unit': '', 'category': 'spice'},
            ],
        }]
        result = generate_shopping_list(['salt'], recipes)
        assert len(result) == 1
        assert result[0]['category'] == 'meat'
        assert result[0]['ingredients'][0]['name'] == 'Guanciale'

    def test_deduplicates_across_recipes(self):
        r1 = {'recipe_name': 'A', 'ingredients': [
            {'name': 'Butter', 'normalized_name': 'butter', 'quantity': '2', 'unit': 'tbsp', 'category': 'dairy'},
        ]}
        r2 = {'recipe_name': 'B', 'ingredients': [
            {'name': 'Butter', 'normalized_name': 'butter', 'quantity': '1', 'unit': 'tbsp', 'category': 'dairy'},
        ]}
        result = generate_shopping_list([], [r1, r2])
        dairy = [c for c in result if c['category'] == 'dairy'][0]
        assert len(dairy['ingredients']) == 1
        assert len(dairy['ingredients'][0]['recipe_names']) == 2
