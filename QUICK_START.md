# ⚡ DippChain Quick Start Guide

**Get up and running in 5 minutes**

---

## 🚀 Super Quick Setup

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:password@localhost:5432/dippchain"
PINATA_JWT="your_pinata_jwt_here"
PINATA_GATEWAY="gateway.pinata.cloud"
WALLET_PRIVATE_KEY="0xyour_private_key_here"
NEXT_PUBLIC_REOWN_PROJECT_ID="your_project_id_here"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EOF

# 3. Setup database
npm run prisma:generate
npm run prisma:push

# 4. Validate (optional)
node scripts/validate-setup.js

# 5. Start!
npm run dev
```

---

## 📋 Prerequisites Checklist

Before starting, make sure you have:

- [ ] **Node.js 18+** installed
- [ ] **PostgreSQL** running (or hosted DB ready)
- [ ] **Pinata account** with JWT token
- [ ] **Reown Project ID** from cloud.reown.com
- [ ] **Server wallet** with testnet IP tokens

---

## 🔑 Get Your Credentials

### PostgreSQL
```bash
# Local:
DATABASE_URL="postgresql://postgres:password@localhost:5432/dippchain"

# Railway.app:
1. Create project → Add PostgreSQL
2. Copy DATABASE_URL from settings

# Supabase:
1. New project → Settings → Database
2. Copy Connection String (URI)
```

### Pinata
```bash
1. Sign up at app.pinata.cloud
2. API Keys → New Key
3. Enable "pinFileToIPFS"
4. Copy JWT token
```

### Reown (WalletConnect)
```bash
1. Go to cloud.reown.com
2. Create project
3. Copy Project ID
```

### Server Wallet
```bash
# Create new wallet:
node -e "const {Wallet} = require('ethers'); const w = Wallet.createRandom(); console.log('Address:', w.address, '\nPrivate Key:', w.privateKey);"

# Fund with testnet tokens:
https://faucet.story.foundation
```

---

## 🎯 Common Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)

# Database
npm run prisma:studio    # Visual database browser
npm run prisma:push      # Apply schema changes

# Validation
node scripts/validate-setup.js  # Check configuration
```

---

## ✅ Quick Test Flow

1. **Start Server**
   ```bash
   npm run dev
   ```

2. **Connect Wallet**
   - Click "Connect Wallet"
   - Approve in MetaMask
   - See your address in header

3. **Upload Asset**
   - Dashboard → Upload
   - Select image
   - Fill title
   - Click "Upload & Process"

4. **Register On-Chain**
   - After upload, click "Register On-Chain"
   - Confirm transaction
   - Wait for confirmation

5. **View Asset**
   - Dashboard → My Assets
   - See your uploaded asset
   - Check on-chain status

---

## 🐛 Troubleshooting

### Database Connection Failed
```bash
# Test connection:
psql "postgresql://postgres:password@localhost:5432/dippchain"

# Check if PostgreSQL is running:
# macOS: brew services list
# Ubuntu: sudo service postgresql status
```

### Pinata Not Working
```bash
# Test JWT:
curl -H "Authorization: Bearer YOUR_JWT" \
  https://api.pinata.cloud/data/testAuthentication
```

### Wallet Issues
```bash
# Check private key length (should be 66 with 0x):
echo $WALLET_PRIVATE_KEY | wc -c

# Check wallet balance:
https://aeneid.storyscan.io/address/YOUR_ADDRESS
```

### Build Errors
```bash
# Clear everything:
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

---

## 📚 Next Steps

After quick start works:

1. **Read Docs** 📖
   - [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Full setup
   - [CODEBASE_AUDIT_REPORT.md](CODEBASE_AUDIT_REPORT.md) - Known issues
   - [OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md) - Improvements

2. **Implement Features** 🛠️
   - Follow [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)
   - Test each feature systematically
   - Track your progress

3. **Deploy to Production** 🚀
   - See deployment options in [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
   - Vercel, Railway, or Docker
   - Set environment variables

---

## 🆘 Need Help?

**Documentation Files:**
- `README.md` - Main documentation
- `DEPLOYMENT_GUIDE.md` - Detailed setup
- `ENV_TEMPLATE.md` - Environment variables
- `CODEBASE_AUDIT_REPORT.md` - Known issues
- `OPTIMIZATION_SUMMARY.md` - What's been fixed
- `FINAL_SUMMARY.md` - Executive summary
- `IMPLEMENTATION_CHECKLIST.md` - Step-by-step guide

**External Resources:**
- Story Protocol: https://docs.story.foundation
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- Pinata: https://docs.pinata.cloud

---

**⚡ That's it! You're ready to build with DippChain!**

Happy coding! 🎨🔗

