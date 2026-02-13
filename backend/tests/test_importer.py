import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from importer import safe_fetch, import_youtube_video, check_import_limit
from claude_extract import sanitize_recipe, _parse_json_response, extract_og_image


class TestSafeFetch:
    @pytest.mark.asyncio
    async def test_blocks_private_ip_127(self):
        with patch('importer.socket.getaddrinfo', return_value=[
            (2, 1, 6, '', ('127.0.0.1', 0))
        ]):
            with pytest.raises(ValueError, match='private/internal'):
                await safe_fetch('https://evil.com/steal')

    @pytest.mark.asyncio
    async def test_blocks_private_ip_10(self):
        with patch('importer.socket.getaddrinfo', return_value=[
            (2, 1, 6, '', ('10.0.0.1', 0))
        ]):
            with pytest.raises(ValueError, match='private/internal'):
                await safe_fetch('https://evil.com/steal')

    @pytest.mark.asyncio
    async def test_blocks_private_ip_192(self):
        with patch('importer.socket.getaddrinfo', return_value=[
            (2, 1, 6, '', ('192.168.1.1', 0))
        ]):
            with pytest.raises(ValueError, match='private/internal'):
                await safe_fetch('https://evil.com/steal')

    @pytest.mark.asyncio
    async def test_blocks_metadata_ip(self):
        with patch('importer.socket.getaddrinfo', return_value=[
            (2, 1, 6, '', ('169.254.169.254', 0))
        ]):
            with pytest.raises(ValueError, match='private/internal'):
                await safe_fetch('https://evil.com/steal')

    @pytest.mark.asyncio
    async def test_blocks_non_http_scheme(self):
        with pytest.raises(ValueError, match='Unsupported scheme'):
            await safe_fetch('ftp://example.com/file')


class TestImportYoutubeVideo:
    @pytest.mark.asyncio
    async def test_rejects_shorts(self):
        with pytest.raises(ValueError, match="Shorts aren't supported"):
            await import_youtube_video('https://www.youtube.com/shorts/abc123')

    @pytest.mark.asyncio
    async def test_rejects_live(self):
        with pytest.raises(ValueError, match="Live streams aren't supported"):
            await import_youtube_video('https://www.youtube.com/live/abc123')

    @pytest.mark.asyncio
    async def test_rejects_non_youtube(self):
        with pytest.raises(ValueError, match='Not a valid YouTube'):
            await import_youtube_video('https://example.com/page')

    @pytest.mark.asyncio
    async def test_returns_cached(self):
        cached_recipe = {
            'id': 'test-id', 'recipe_name': 'Test Recipe',
            'ingredients': [{'name': 'salt'}],
        }
        with patch('importer.db.get_recipe_by_canonical_url', return_value=cached_recipe):
            with patch('importer.db.save_user_recipe'):
                with patch('importer.db.increment_import_count'):
                    result = await import_youtube_video(
                        'https://www.youtube.com/watch?v=abc123', user_id='user1'
                    )
                    assert result['cached'] is True
                    assert result['recipe_name'] == 'Test Recipe'


class TestCheckImportLimit:
    def test_pro_unlimited(self):
        result = check_import_limit('user1', is_pro=True)
        assert result['allowed'] is True
        assert result['limit'] == -1

    def test_under_limit(self):
        with patch('importer.db.get_import_count', return_value=3):
            result = check_import_limit('user1', is_pro=False)
            assert result['allowed'] is True
            assert result['used'] == 3
            assert result['limit'] == 10

    def test_at_limit(self):
        with patch('importer.db.get_import_count', return_value=10):
            result = check_import_limit('user1', is_pro=False)
            assert result['allowed'] is False
            assert result['used'] == 10


class TestSanitizeRecipe:
    def test_valid_recipe(self):
        data = {
            'recipe_name': 'Carbonara',
            'ingredients': [{'name': 'pasta', 'normalized_name': 'pasta',
                            'quantity': '1', 'unit': 'lb', 'category': 'pantry'}],
            'instructions': ['Cook pasta'],
            'equipment': [{'name': 'Pot', 'is_special': False}],
        }
        result = sanitize_recipe(data)
        assert result is not None
        assert result['recipe_name'] == 'Carbonara'

    def test_rejects_empty_name(self):
        data = {'recipe_name': '', 'ingredients': [{'name': 'pasta'}]}
        assert sanitize_recipe(data) is None

    def test_rejects_no_ingredients(self):
        data = {'recipe_name': 'Test', 'ingredients': []}
        assert sanitize_recipe(data) is None

    def test_truncates_long_name(self):
        data = {
            'recipe_name': 'x' * 300,
            'ingredients': [{'name': 'pasta'}],
        }
        result = sanitize_recipe(data)
        assert len(result['recipe_name']) == 200

    def test_strips_control_chars(self):
        data = {
            'recipe_name': 'Test\x00Recipe\x01',
            'ingredients': [{'name': 'pasta\x02'}],
        }
        result = sanitize_recipe(data)
        assert '\x00' not in result['recipe_name']
        assert '\x01' not in result['recipe_name']


class TestParseJsonResponse:
    def test_plain_json(self):
        assert _parse_json_response('{"key": "value"}') == {'key': 'value'}

    def test_with_markdown_fences(self):
        text = '```json\n{"key": "value"}\n```'
        assert _parse_json_response(text) == {'key': 'value'}

    def test_array(self):
        assert _parse_json_response('[1, 2, 3]') == [1, 2, 3]

    def test_returns_none_for_garbage(self):
        assert _parse_json_response('not json at all') is None


class TestExtractOgImage:
    def test_finds_og_image(self):
        html = '<html><head><meta property="og:image" content="https://example.com/img.jpg"></head></html>'
        assert extract_og_image(html) == 'https://example.com/img.jpg'

    def test_returns_none_when_missing(self):
        html = '<html><head><title>Test</title></head></html>'
        assert extract_og_image(html) is None
