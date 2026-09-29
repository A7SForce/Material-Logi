"""
chunks.py — which topics belong to which scheduled chunk (Architecture Section 3).

Data-first: a plain table. Slice 3's conversation engine walks this; the weekly
compile reads chunk keys back out of daily/{date}.json. Chunk keys match the
Architecture Section 6.2 example shape (midday / lateAfternoon).

Midday:     Weekly Meeting (Mon only, per topics.json weekdays), Project briefing,
            Discussion, Deal Supplier, Production.
Late-after: Logistic, Lalamove, Item on site, Point learned, Halangan/isu.
"""

CHUNKS = {
    "midday": ["weekly_meeting", "project_briefing", "discussion", "deal_supplier", "production"],
    "lateAfternoon": ["logistic", "lalamove", "item_on_site", "point_learned", "obstacles"],
}


def topics_for_chunk(chunk_id):
    """Ordered topic ids for a chunk. Raises loudly on a typo — data bugs must be loud."""
    if chunk_id not in CHUNKS:
        raise ValueError(f"Unknown chunk id: {chunk_id!r} (have: {sorted(CHUNKS)})")
    return CHUNKS[chunk_id]
