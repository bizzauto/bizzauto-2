# BizzAuto 2.0 - Coolify + Self-Hosted Supabase

## Step 1: Get Supabase Connection String

1. Open your Coolify dashboard
2. Go to your Supabase resource
3. Find the **PostgreSQL connection string** (URI format)
4. It looks like: `postgresql://postgres:password@supabase-db:5432/postgres`

## Step 2: Create Coolify Resource

### Option A: Docker Compose (Recommended)

1. Coolify Dashboard → New Project → New Resource
2. Select **Docker Compose**
3. Use `docker-compose.coolify.yml` from this repo
4. Set environment variables (see below)

### Option B: Build from Git

1. Coolify Dashboard → New Project → New Resource
2. Select **Git Repository**
3. Connect: `https://github.com/bizzauto/bizzauto-2`
4. Branch: `main`
5. Build Pack: **Dockerfile**
6. Set environment variables

## Step 3: Environment Variables

Set these in Coolify's environment section:

```env
# === REQUIRED ===
NODE_ENV=production
PORT=4000

# Supabase PostgreSQL (from your self-hosted Supabase)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@supabase-db:5432/postgres

# Redis (Coolify will create this automatically)
REDIS_URL=redis://redis:6379

# JWT Secrets (generate random 32+ char strings)
JWT_SECRET=your-random-32-char-jwt-secret-here
JWT_REFRESH_SECRET=your-random-32-char-refresh-secret-here
ENCRYPTION_KEY=your-random-32-char-encryption-key

# URLs (your Coolify domain)
BASE_URL=https://your-coolify-domain.com
CORS_ORIGIN=https://your-coolify-domain.com

# === OPTIONAL (add as needed) ===

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=BizzAuto <noreply@yourdomain.com>

# AI Providers
OPENROUTER_API_KEY=sk-or-v1-xxx
OLLAMA_BASE_URL=http://localhost:11434
GROK_API_KEY=xai-xxx
REPLICATE_API_KEY=r8_xxx

# WhatsApp Business API
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_KEY=your-whatsapp-api-key

# Payments (Razorpay)
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your-razorpay-secret

# Social Media
FB_APP_ID=your-fb-app-id
FB_APP_SECRET=your-fb-app-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Logging
LOG_LEVEL=info
```

## Step 4: Database Setup

After first deployment, run in Coolify's terminal:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to Supabase
npx prisma db push --accept-data-loss

# (Optional) Seed database
npx prisma db seed
```

## Step 5: Create Super Admin

```bash
curl -X POST https://your-coolify-domain.com/api/auth/create-super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "secure-password-123",
    "name": "Admin",
    "businessName": "My Business",
    "businessType": "agency"
  }'
```

## Step 6: Verify Deployment

```bash
# Health check
curl https://your-coolify-domain.com/health

# Expected response:
# {"success":true,"status":"healthy","database":"connected","redis":"connected"}
```

## Troubleshooting

### Supabase Connection Error
- Make sure `DATABASE_URL` uses the internal Docker network URL
- For self-hosted Supabase: `postgresql://postgres:password@supabase-db:5432/postgres`
- NOT the external pooler URL

### Redis Connection Error
- Coolify creates Redis automatically in Docker Compose
- If using external Redis, update `REDIS_URL`

### Build Fails
- Check Coolify logs for TypeScript errors
- Make sure Node.js 20 is used
- Prisma generate must run before build

### CORS Error
- Set `CORS_ORIGIN` to your actual Coolify domain
- Include `https://` prefix
