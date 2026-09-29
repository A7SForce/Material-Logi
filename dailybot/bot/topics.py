"""
topics.py — load topics.json (ported as-is from Lane 6a). Read-only access.
"""

import json

from bot import config


def load_topics():
    """Return {topic_id: topic_dict}. Raises loudly if the file is missing/broken."""
    with config.TOPICS_FILE.open("r", encoding="utf-8") as f:
        data = json.load(f)
    topics = {}
    for t in data.get("topics", []):
        topics[t["id"]] = t
    return topics


def first_topic_for_chunk(topics, chunk_topic_ids, now):
    """
    First topic of a chunk applicable today: skips weekday-restricted topics
    (e.g. weekly_meeting is Mondays-only via its `weekdays: [1]` rule).
    """
    for tid in chunk_topic_ids:
        t = topics.get(tid)
        if t is None:
            raise ValueError(f"topics.json is missing topic {tid!r} — data file drifted from chunks.py")
        wd = t.get("weekdays")
        if not wd or now.weekday() in wd:
            return t
    return None
