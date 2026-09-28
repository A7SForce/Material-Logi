"""
scheduler.py — the touchpoint clock. One job: answer "what fires at this moment?"

No Telegram. No conversation logic. No message text (labels only). Pure and
clock-injectable: callers pass a KL datetime; the sim (and later tests)
fast-forwards a clock through due_touchpoints() to prove the timing.

Schedule (Architecture Section 3). Weekdays use Python convention: 0=Mon .. 6=Sun.
Chunk days default Mon-Sat (flagged for Naqib in the Slice 0 handoff — Sunday is
the only open assumption). "~16:50", "~10:00", "~15:00" pinned per the handoff.
"""

from datetime import datetime

# KL times, schedule-table order. Each entry: id, printable label, HH:MM, weekdays.
TOUCHPOINTS = [
    {"id": "midday",         "label": "MIDDAY CHUNK",                      "time": "13:15", "weekdays": (0, 1, 2, 3, 4, 5)},
    {"id": "late_afternoon", "label": "LATE-AFTERNOON CHUNK",              "time": "16:30", "weekdays": (0, 1, 2, 3, 4, 5)},
    {"id": "catch_up",       "label": "CATCH-UP PING",                     "time": "16:50", "weekdays": (0, 1, 2, 3, 4, 5)},
    {"id": "item_progress",  "label": "ITEM PROGRESS + DELIVERY ACTIVITY",  "time": "17:00", "weekdays": (0, 1, 2, 3, 4, 5)},
    {"id": "refresh_in",     "label": "PROJECT REFRESH (IN)",               "time": "10:00", "weekdays": (0,)},
    {"id": "refresh_out",    "label": "PROJECT REFRESH (OUT)",               "time": "15:00", "weekdays": (4,)},
]


def _parse_hhmm(text):
    """'13:15' becomes (13, 15). Raises on malformed input — schedule typos must be loud."""
    parts = text.split(":")
    if len(parts) != 2:
        raise ValueError(f"Bad touchpoint time: {text!r} (expected HH:MM)")
    hour, minute = int(parts[0]), int(parts[1])
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        raise ValueError(f"Bad touchpoint time: {text!r} (out of range)")
    return hour, minute


def due_touchpoints(now):
    """
    Return the touchpoint ids due at this KL datetime's minute, in schedule order.
    A touchpoint fires when (hour, minute) matches AND today is one of its weekdays.
    Passing `now` in any tz is the caller's choice — the math is tz-agnostic; the
    deploy layer is responsible for feeding KL wall-clock time.
    """
    fired = []
    for tp in TOUCHPOINTS:
        hour, minute = _parse_hhmm(tp["time"])
        if now.weekday() in tp["weekdays"] and (now.hour, now.minute) == (hour, minute):
            fired.append(tp["id"])
    return fired


def label_for(touchpoint_id):
    """Printable label for a touchpoint id (sim + logs)."""
    for tp in TOUCHPOINTS:
        if tp["id"] == touchpoint_id:
            return tp["label"]
    raise ValueError(f"Unknown touchpoint id: {touchpoint_id!r}")
