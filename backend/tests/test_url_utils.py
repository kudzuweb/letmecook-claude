import pytest
from url_utils import (
    normalize_url,
    is_youtube_video,
    is_youtube_short,
    is_youtube_live,
    is_youtube_channel,
    extract_video_id,
)


class TestNormalizeUrl:
    def test_strips_tracking_params(self):
        url = 'https://example.com/recipe?utm_source=google&name=pasta'
        assert normalize_url(url) == 'https://example.com/recipe?name=pasta'

    def test_strips_www(self):
        assert normalize_url('https://www.example.com/page') == 'https://example.com/page'

    def test_forces_https(self):
        assert normalize_url('http://example.com/page') == 'https://example.com/page'

    def test_strips_fragment(self):
        assert normalize_url('https://example.com/page#section') == 'https://example.com/page'

    def test_strips_trailing_slash(self):
        assert normalize_url('https://example.com/page/') == 'https://example.com/page'

    def test_sorts_params(self):
        url = 'https://example.com/page?z=1&a=2'
        assert normalize_url(url) == 'https://example.com/page?a=2&z=1'

    def test_youtube_short_url_expanded(self):
        assert normalize_url('https://youtu.be/abc123') == 'https://youtube.com/watch?v=abc123'

    def test_youtube_strips_extra_params(self):
        url = 'https://www.youtube.com/watch?v=abc123&list=PLxyz&si=1234&t=30'
        assert normalize_url(url) == 'https://youtube.com/watch?v=abc123'

    def test_youtube_m_subdomain(self):
        url = 'https://m.youtube.com/watch?v=abc123'
        assert normalize_url(url) == 'https://youtube.com/watch?v=abc123'

    def test_adds_https_if_missing(self):
        assert normalize_url('example.com/page') == 'https://example.com/page'

    def test_strips_fbclid(self):
        url = 'https://example.com/recipe?fbclid=abc123'
        assert normalize_url(url) == 'https://example.com/recipe'


class TestIsYoutubeVideo:
    def test_standard_watch_url(self):
        assert is_youtube_video('https://www.youtube.com/watch?v=abc123')

    def test_short_url(self):
        assert is_youtube_video('https://youtu.be/abc123')

    def test_rejects_shorts(self):
        assert not is_youtube_video('https://www.youtube.com/shorts/abc123')

    def test_rejects_channel(self):
        assert not is_youtube_video('https://www.youtube.com/@eitanbernath')

    def test_rejects_non_youtube(self):
        assert not is_youtube_video('https://example.com/watch?v=abc')


class TestIsYoutubeShort:
    def test_detects_short(self):
        assert is_youtube_short('https://www.youtube.com/shorts/abc123')

    def test_rejects_video(self):
        assert not is_youtube_short('https://www.youtube.com/watch?v=abc123')


class TestIsYoutubeLive:
    def test_detects_live(self):
        assert is_youtube_live('https://www.youtube.com/live/abc123')

    def test_rejects_video(self):
        assert not is_youtube_live('https://www.youtube.com/watch?v=abc123')


class TestIsYoutubeChannel:
    def test_at_handle(self):
        assert is_youtube_channel('https://www.youtube.com/@eitanbernath')

    def test_channel_id(self):
        assert is_youtube_channel('https://www.youtube.com/channel/UCxyz')

    def test_c_url(self):
        assert is_youtube_channel('https://www.youtube.com/c/EitanBernath')

    def test_user_url(self):
        assert is_youtube_channel('https://www.youtube.com/user/EitanBernath')

    def test_rejects_video(self):
        assert not is_youtube_channel('https://www.youtube.com/watch?v=abc')

    def test_rejects_non_youtube(self):
        assert not is_youtube_channel('https://example.com/@someone')


class TestExtractVideoId:
    def test_from_watch_url(self):
        assert extract_video_id('https://www.youtube.com/watch?v=abc123') == 'abc123'

    def test_from_short_url(self):
        assert extract_video_id('https://youtu.be/abc123') == 'abc123'

    def test_returns_none_for_shorts(self):
        assert extract_video_id('https://www.youtube.com/shorts/abc123') is None

    def test_returns_none_for_live(self):
        assert extract_video_id('https://www.youtube.com/live/abc123') is None

    def test_returns_none_for_non_youtube(self):
        assert extract_video_id('https://example.com/page') is None
