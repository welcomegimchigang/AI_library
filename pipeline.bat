@echo off
echo ===================================================
echo [AI Tool Library] Automated Data Pipeline Starting...
echo ===================================================

echo.
echo 1. Running Daily Scraper Bot (Crawler)...
python crawler/scraper.py

echo.
echo 2. Running Janitor Bot (Deduplicator & Sorter)...
python scripts/clean_db.py

echo.
echo ===================================================
echo Pipeline complete! The tools.jsonl database has been updated and cleaned.
echo You can now run 'npm run dev' or 'git commit' to publish the new tools.
echo ===================================================
pause
