"""
sim_scheduler.py — Slice 1 proof: fast-forward a virtual week through the
scheduler and print every touchpoint that fires, in order.

Simulates Mon 2026-09-28 00:00 to Sun 2026-10-04 23:59 KL, minute by minute
(10,080 minutes), printing only firing minutes. Expect:
  Mon-Sat: 4 chunk touchpoints each (13:15, 16:30, 16:50, 17:00)
  Mon:     + PROJECT REFRESH (IN) at 10:00
  Fri:     + PROJECT REFRESH (OUT) at 15:00
  Sun:     nothing
Total: 26 firing events.

Run:  python -m bot.sim_scheduler   (from dailybot/)
"""

from datetime import datetime, timedelta

from bot.scheduler import TOUCHPOINTS, due_touchpoints, label_for


def run():
    start = datetime(2026, 9, 28, 0, 0)  # Monday
    end = datetime(2026, 10, 4, 23, 59)  # Sunday
    now = start
    fired_count = 0
    while now <= end:
        for tp_id in due_touchpoints(now):
            day = now.strftime("%a %Y-%m-%d")
            clock = now.strftime("%H:%M")
            print(f"{day} {clock} — {label_for(tp_id)} WOULD FIRE NOW")
            fired_count += 1
        now += timedelta(minutes=1)
    print(f"\nTotal firing events in one simulated week: {fired_count} (expected 26)")


if __name__ == "__main__":
    run()
