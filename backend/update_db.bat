@echo off
echo Starting Database Update...

echo [1/2] Running database migrations...
call .\env\Scripts\alembic upgrade head
if %errorlevel% neq 0 (
    echo Migration failed! Please check the errors above.
    pause
    exit /b %errorlevel%
)

echo [2/2] Seeding admin and default permissions...
call .\env\Scripts\python seed_admin.py
if %errorlevel% neq 0 (
    echo Seeding failed! Please check the errors above.
    pause
    exit /b %errorlevel%
)

echo.
echo Database updated successfully!
pause
