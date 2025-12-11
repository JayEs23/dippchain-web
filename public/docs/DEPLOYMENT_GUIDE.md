# DippChain Deployment Guide
**Complete setup instructions for deploying DippChain**

---

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or hosted)
- Pinata account for IPFS storage
- Reown (WalletConnect) Project ID
- Server wallet with Story Protocol testnet IP tokens

---

## 🚀 Quick Start (Local Development)

### 1. Clone and Install Dependencies

```bash
# Navigate to project
cd dippchain

# Install dependencies
npm install
```

### 2. Set Up PostgreSQL Database

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL (if not installed)
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql
# Windows: Download from postgresql.org

# Start PostgreSQL service
# macOS: brew services start postgresql
# Ubuntu: sudo service postgresql start
# Windows: Use pgAdmin or services.msc

# Create database
createdb dippchain

# Your DATABASE_URL will be:
# postgresql://postgres:your_password@localhost:5432/dippchain
```

**Option B: Hosted PostgreSQL (Railway)**
```bash
# 1. Go to https://railway.app
# 2. Create new project
# 3. Add PostgreSQL database
# 4. Copy the DATABASE_URL from Railway
```

**Option C: Hosted PostgreSQL (Supabase)**
```bash
# 1. Go to https://supabase.com
# 2. Create new project
# 3. Go to Settings > Database
# 4. Copy the connection string (URI format)
```

### 3. Set Up Pinata (IPFS Storage)

```bash
# 1. Go to https://app.pinata.cloud
# 2. Sign up for free account
# 3. Navigate to API Keys section
# 4. Click "New Key"
# 5. Enable "pinFileToIPFS" permission
# 6. Copy the JWT token
```

### 4. Get Reown Project ID

```bash
# 1. Go to https://cloud.reown.com
# 2. Create new project
# 3. Copy your Project ID
```

### 5. Set Up Server Wallet

```bash
# ⚠️ IMPORTANT: Use a dedicated server wallet, NOT your personal wallet

# Option A: Create new wallet with ethers
node -e "const { Wallet } = require('ethers'); const w = Wallet.createRandom(); console.log('Address:', w.address); console.log('Private Key:', w.privateKey);"

# Option B: Use existing wallet
# Export private key from MetaMask (NOT RECOMMENDED for production)

# Fund your server wallet with testnet IP tokens
# 1. Go to https://faucet.story.foundation
# 2. Enter your server wallet address
# 3. Request testnet IP tokens
```

### 6. Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and fill in all values
# Make sure to replace all placeholder values!
```

Your `.env` should look like this:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/dippchain"
PINATA_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
PINATA_GATEWAY="gateway.pinata.cloud"
WALLET_PRIVATE_KEY="0x1234567890abcdef..."
NEXT_PUBLIC_REOWN_PROJECT_ID="abc123def456..."
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 7. Initialize Database

```bash
# Generate Prisma client
npm run prisma:generate

# Push schema to database (creates tables)
npm run prisma:push

# Optional: Open Prisma Studio to view database
npm run prisma:studio
```

### 8. Validate Configuration

```bash
# Test database connection
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => console.log('✅ Database connected')).catch(e => console.error('❌ Database error:', e.message));"

# Test Pinata connection
node -e "fetch('https://api.pinata.cloud/data/testAuthentication', {headers: {'Authorization': 'Bearer ' + process.env.PINATA_JWT}}).then(r => r.json()).then(d => console.log('✅ Pinata connected:', d)).catch(e => console.error('❌ Pinata error:', e.message));"
```

### 9. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000 🎉

---

## 🌐 Production Deployment

### Option 1: Vercel (Recommended)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel

# 4. Add environment variables in Vercel dashboard
# Go to: Project Settings > Environment Variables
# Add all variables from .env (except DATABASE_URL if using Vercel Postgres)

# 5. Redeploy
vercel --prod
```

**Set up Vercel Postgres:**
```bash
# 1. In Vercel dashboard, go to Storage tab
# 2. Create new Postgres database
# 3. Copy DATABASE_URL and add to environment variables
# 4. Run migrations:
npm run prisma:push
```

### Option 2: Railway

```bash
# 1. Go to https://railway.app
# 2. Create new project from GitHub repo
# 3. Add PostgreSQL database
# 4. Add environment variables
# 5. Deploy automatically on git push
```

### Option 3: Render

```bash
# 1. Go to https://render.com
# 2. Create new Web Service from GitHub
# 3. Set build command: npm install && npm run build
# 4. Set start command: npm start
# 5. Add PostgreSQL database
# 6. Add environment variables
```

### Option 4: Docker

```bash
# Build image
docker build -t dippchain .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e PINATA_JWT="..." \
  -e WALLET_PRIVATE_KEY="..." \
  -e NEXT_PUBLIC_REOWN_PROJECT_ID="..." \
  dippchain
```

---

## 📊 Database Migration

When updating the schema:

```bash
# After modifying prisma/schema.prisma

# 1. Generate new Prisma client
npm run prisma:generate

# 2. Push changes to database
npm run prisma:push

# For production with migrations:
npm run prisma:migrate dev --name your_migration_name
npm run prisma:migrate deploy
```

---

## 🔒 Security Checklist

- [ ] Never commit `.env` file
- [ ] Use dedicated server wallet, not personal wallet
- [ ] Server wallet private key is secure
- [ ] Database has strong password
- [ ] Environment variables are set in hosting platform
- [ ] Pinata JWT is kept secret
- [ ] All API endpoints have proper validation
- [ ] CORS is configured for production
- [ ] Rate limiting is enabled
- [ ] Input sanitization is active

---

## 🧪 Testing Checklist

- [ ] Database connection works
- [ ] Pinata uploads work
- [ ] Wallet connection works
- [ ] Asset upload completes successfully
- [ ] On-chain registration works
- [ ] Story Protocol registration works
- [ ] Fractionalization works
- [ ] Marketplace listings display
- [ ] Primary market purchase flow works
- [ ] All pages are responsive
- [ ] Error messages are clear

---

## 🐛 Troubleshooting

### Database Connection Failed

```bash
# Check if PostgreSQL is running
# macOS: brew services list
# Ubuntu: sudo service postgresql status

# Test connection manually
psql "your_database_url_here"

# Check DATABASE_URL format:
# postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

### Pinata Upload Failed

```bash
# Test JWT token
curl -H "Authorization: Bearer YOUR_JWT" \
  https://api.pinata.cloud/data/testAuthentication

# Check JWT format (should start with eyJ)
echo $PINATA_JWT
```

### Story Protocol Errors

```bash
# Check wallet has testnet IP tokens
# Visit: https://aeneid.storyscan.io/address/YOUR_WALLET_ADDRESS

# Request testnet tokens
# Visit: https://faucet.story.foundation

# Check private key format (66 characters with 0x)
echo $WALLET_PRIVATE_KEY | wc -c  # Should output 67 (66 + newline)
```

### Wallet Connection Not Working

```bash
# Check Reown Project ID
echo $NEXT_PUBLIC_REOWN_PROJECT_ID

# Verify it's set correctly in browser:
# Open browser console > localStorage > check for reown keys
```

### Build Errors

```bash
# Clear cache and reinstall
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

---

## 📚 Additional Resources

- **Story Protocol Docs**: https://docs.story.foundation
- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Pinata Docs**: https://docs.pinata.cloud
- **Reown Docs**: https://docs.reown.com

---

## 🆘 Support

If you encounter issues:

1. Check this guide thoroughly
2. Review the `CODEBASE_AUDIT_REPORT.md` for known issues
3. Check console logs for error messages
4. Verify all environment variables are set correctly
5. Test each integration individually

---

**🎉 Congratulations! Your DippChain platform is now deployed!**

