# BizzAuto 2.0 - Deploy to VPS
# Run this in PowerShell on your Windows machine

$VPS_IP = "87.76.169.6"
$VPS_USER = "root"
$VPS_PASS = 'DQ!HoIqdTE,x'
$PROJECT_DIR = "C:\Users\HP\Desktop\Project 2.0"
$REMOTE_DIR = "/opt/bizzauto-2"

Write-Host "🚀 BizzAuto 2.0 VPS Deploy" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

# Step 1: Create remote directory
Write-Host "`n📁 Creating remote directory..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "mkdir -p $REMOTE_DIR"

# Step 2: Upload project files
Write-Host "`n📦 Uploading project files..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no -r "$PROJECT_DIR\*" "$VPS_USER@$VPS_IP`:$REMOTE_DIR/"

# Step 3: Upload deploy script
Write-Host "`n📤 Uploading deploy script..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no "$PROJECT_DIR\scripts\deploy-vps.sh" "$VPS_USER@$VPS_IP`:/tmp/deploy.sh"

# Step 4: Run deploy script
Write-Host "`n🚀 Running deployment..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "chmod +x /tmp/deploy.sh && bash /tmp/deploy.sh"

Write-Host "`n✅ Deployment Complete!" -ForegroundColor Green
Write-Host "🌐 App: http://$VPS_IP" -ForegroundColor Green
Write-Host "🔌 API: http://$VPS_IP/api" -ForegroundColor Green
