@echo off
echo ========================================
echo  BizzAuto 2.0 - Coolify Deploy Script
echo ========================================
echo.

echo Step 1: Testing VPS connection...
ssh -o StrictHostKeyChecking=no root@87.76.169.6 "echo 'Connected successfully'"
if %errorlevel% neq 0 (
    echo ERROR: Cannot connect to VPS. Check your SSH credentials.
    pause
    exit /b 1
)

echo.
echo Step 2: Creating remote directory...
ssh root@87.76.169.6 "mkdir -p /opt/bizzauto-2"

echo.
echo Step 3: Uploading project files...
scp -r "C:\Users\HP\Desktop\Project 2.0\*" root@87.76.169.6:/opt/bizzauto-2/

echo.
echo Step 4: Running deployment on VPS...
ssh root@87.76.169.6 "cd /opt/bizzauto-2 && chmod +x scripts/deploy-coolify.sh && bash scripts/deploy-coolify.sh"

echo.
echo ========================================
echo  Deployment Complete!
echo ========================================
echo  App: http://87.76.169.6
echo  API: http://87.76.169.6/api
echo ========================================
pause
