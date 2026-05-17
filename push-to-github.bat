@echo off
echo ========================================
echo  BizzAuto 2.0 - Push to GitHub
echo ========================================
echo.
echo Step 1: Login to GitHub
echo.
"C:\Program Files\GitHub CLI\gh.exe" auth login --web

echo.
echo Step 2: Create GitHub repository
echo.
set /p REPO_NAME="Enter repository name (e.g. bizzauto-2): "

cd "C:\Users\HP\Desktop\Project 2.0"

echo.
echo Step 3: Creating repository...
"C:\Program Files\GitHub CLI\gh.exe" repo create %REPO_NAME% --public --source=. --remote=origin --push

echo.
echo ========================================
echo  Pushed to GitHub!
echo ========================================
echo  URL: https://github.com/YOUR_USERNAME/%REPO_NAME%
echo ========================================
pause
