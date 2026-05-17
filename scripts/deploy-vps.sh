#!/bin/bash
# BizzAuto 2.0 - Production Deploy Script
# Run this on your VPS as root

set -e

VPS_IP="87.76.169.6"
PROJECT_DIR="/opt/bizzauto-2"
APP_PORT=4000

echo "🚀 BizzAuto 2.0 Production Deploy"
echo "=================================="

# Step 1: Install dependencies
echo "📦 Installing system dependencies..."
apt-get update -y
apt-get install -y curl git build-essential

# Step 2: Install Node.js 20
echo "🟢 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node --version
npm --version

# Step 3: Install PostgreSQL
echo "🐘 Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# Step 4: Install Redis
echo "🔴 Installing Redis..."
apt-get install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# Step 5: Setup Database
echo "🗄️ Setting up database..."
su - postgres -c "psql -c \"CREATE DATABASE bizzauto2;\"" 2>/dev/null || true
su - postgres -c "psql -c \"ALTER USER postgres WITH PASSWORD 'postgres';\"" 2>/dev/null || true

# Step 6: Create app directory
echo "📁 Creating app directory..."
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# Step 7: Copy project files (uploaded via scp)
echo "📂 Project files should be in $PROJECT_DIR"

# Step 8: Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install --production

# Step 9: Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Step 10: Push database schema
echo "📊 Pushing database schema..."
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bizzauto2?schema=public"
npx prisma db push --accept-data-loss

# Step 11: Seed database
echo "🌱 Seeding database..."
npx prisma db seed 2>/dev/null || echo "No seed data"

# Step 12: Build frontend
echo "🏗️ Building frontend..."
npm run build:client

# Step 13: Create systemd service
echo "🔧 Creating systemd service..."
cat > /etc/systemd/system/bizzauto2.service << 'EOF'
[Unit]
Description=BizzAuto 2.0
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/bizzauto-2
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/server/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/bizzauto2-worker.service << 'EOF'
[Unit]
Description=BizzAuto 2.0 Worker
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/bizzauto-2
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/server/worker.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Step 14: Enable and start services
echo "🚀 Starting services..."
systemctl daemon-reload
systemctl enable bizzauto2
systemctl enable bizzauto2-worker
systemctl restart bizzauto2
systemctl restart bizzauto2-worker

# Step 15: Setup Nginx
echo "🌐 Setting up Nginx..."
apt-get install -y nginx
cat > /etc/nginx/sites-available/bizzauto2 << EOF
server {
    listen 80;
    server_name $VPS_IP;

    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/bizzauto2 /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo ""
echo "✅ Deployment Complete!"
echo "======================="
echo "🌐 App: http://$VPS_IP"
echo "🔌 API: http://$VPS_IP/api"
echo "🏥 Health: http://$VPS_IP/health"
echo ""
echo "📋 Next steps:"
echo "1. Configure .env file at $PROJECT_DIR/.env"
echo "2. Run: systemctl restart bizzauto2"
echo "3. Check logs: journalctl -u bizzauto2 -f"
