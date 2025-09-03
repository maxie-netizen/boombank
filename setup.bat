@echo off
echo ========================================
echo    BoomBank Setup Script
echo ========================================
echo.

echo Installing dependencies...
npm install

echo.
echo Creating environment file...
if not exist .env (
    copy env.example .env
    echo Environment file created from template
    echo Please edit .env with your configuration
) else (
    echo Environment file already exists
)

echo.
echo Setting up database...
echo Please ensure MongoDB is running on localhost:27017

echo.
echo Starting development servers...
echo Frontend will be available at: http://localhost:3000
echo Backend will be available at: http://localhost:5000
echo Admin panel: http://localhost:5000/api/admin
echo.

echo Starting servers...
npm run dev

pause
