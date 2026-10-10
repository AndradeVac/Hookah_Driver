from datetime import datetime, timezone

from app.services.analytics import AnalyticsService


def test_custom_range_overrides_period_with_either_bound():
    service = AnalyticsService(None)
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    end = datetime(2026, 2, 1, tzinfo=timezone.utc)

    conditions, got_start, got_end = service._filters("all", start, end)
    assert (got_start, got_end) == (start, end)
    assert len(conditions) == 3

    conditions, got_start, got_end = service._filters("all", start, None)
    assert (got_start, got_end) == (start, None)
    assert len(conditions) == 2

    conditions, got_start, got_end = service._filters("all")
    assert (got_start, got_end) == (None, None)
    assert len(conditions) == 1
