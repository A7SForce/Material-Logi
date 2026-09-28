"""
config.py — paths, timezone, and nothing else. Data-first: the schedule itself
lives in scheduler.py's TOUCHPOINTS table where it can be read as data.
"""
from pathlib import Path

TIMEZONE = "Asia/Kuala_Lumpur"  # KL = UTC+8, no DST — fixed offset all year

# dailybot/data/ — topics, projects, items, daily, reports all live under here.
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
TOPICS_FILE = DATA_DIR / "topics.json"
PROJECTS_FILE = DATA_DIR / "projects.json"
ITEMS_DIR = DATA_DIR / "items"
DAILY_DIR = DATA_DIR / "daily"
REPORTS_DIR = DATA_DIR / "reports"
