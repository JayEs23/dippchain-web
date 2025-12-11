# Environment Variables Template

Copy this template to `.env` file and fill in your values:

```env
# ======================
# DATABASE
# ======================
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# ======================
# PINATA (IPFS Storage)
# ======================
PINATA_JWT="your_pinata_jwt_token_here"
PINATA_GATEWAY="gateway.pinata.cloud"

# ======================
# STORY PROTOCOL
# ======================
WALLET_PRIVATE_KEY="0x1234567890abcdef..."

# ======================
# WEB3 / WALLET CONNECT
# ======================
NEXT_PUBLIC_REOWN_PROJECT_ID="your_reown_project_id_here"

# ======================
# APPLICATION SETTINGS
# ======================
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Quick Setup Commands

```bash
# 1. Copy this to .env
cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:password@localhost:5432/dippchain"
PINATA_JWT="your_pinata_jwt_here"
PINATA_GATEWAY="gateway.pinata.cloud"
WALLET_PRIVATE_KEY="0xyour_private_key_here"
NEXT_PUBLIC_REOWN_PROJECT_ID="your_project_id_here"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EOF

# 2. Install dependencies
npm install

# 3. Setup database
npm run prisma:generate
npm run prisma:push

# 4. Start development server
npm run dev
```

## Important Notes

⚠️ **NEVER commit .env to git**
⚠️ **Use a dedicated server wallet, not your personal wallet**
⚠️ **Keep all credentials secure and private**

