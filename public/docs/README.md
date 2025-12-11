# 🎨 DippChain

**End-to-end creative rights, protection, and monetization ecosystem on Story Protocol**

![DippChain](public/dippchainlogo.png)

---

## 📖 Overview

DippChain is a comprehensive platform that empowers creators with absolute control over their digital content. From creation to every point it appears online, DippChain provides:

- 🔒 **IP Protection** - Time-stamped, tamper-proof ownership records
- 🌊 **Invisible Watermarking** - Permanent content identification
- 🔍 **AI Detection** - Continuous monitoring across the internet
- 💰 **Monetization** - Licensing, fractionalization, and marketplace
- ⚖️ **Dispute Resolution** - Evidence packages and takedown tools
- 🏛️ **DAO Governance** - Community-driven decision making

Built on **Story Protocol** for programmable IP and **Next.js** for a modern, responsive experience.

---

## ✨ Features

### Core Features
- ✅ Asset upload with watermarking and metadata
- ✅ On-chain registration (DippChain + Story Protocol)
- ✅ License creation and attachment
- ✅ Fractionalization using Story Protocol royalty tokens
- ✅ Primary and secondary marketplace
- ✅ Revenue tracking and claiming
- ✅ Sentinel detection system
- ✅ DAO governance

### Technical Features
- 🚀 Next.js 16 with Pages Router
- 🎨 TailwindCSS for responsive design
- 🔗 Story Protocol SDK integration
- 💾 PostgreSQL database with Prisma ORM
- 📦 Pinata for IPFS storage
- 🔐 Reown (WalletConnect) wallet integration
- ⛓️ Ethereum smart contracts (Solidity)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Pinata account
- Reown Project ID
- Story Protocol testnet wallet

### Installation

```bash
# 1. Clone repository
git clone <your-repo-url>
cd dippchain

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp ENV_TEMPLATE.md .env
# Edit .env and fill in your values

# 4. Validate setup (optional but recommended)
node scripts/validate-setup.js

# 5. Generate Prisma client and create database tables
npm run prisma:generate
npm run prisma:push

# 6. Start development server
npm run dev
```

Visit http://localhost:3000 🎉

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** | Complete setup and deployment instructions |
| **[CODEBASE_AUDIT_REPORT.md](CODEBASE_AUDIT_REPORT.md)** | Detailed audit findings and fixes |
| **[OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md)** | All improvements and optimizations |
| **[FINAL_SUMMARY.md](FINAL_SUMMARY.md)** | Executive summary of completed work |
| **[ENV_TEMPLATE.md](ENV_TEMPLATE.md)** | Environment variables setup guide |
| **[STORY_PROTOCOL_INTEGRATION.md](STORY_PROTOCOL_INTEGRATION.md)** | Story Protocol integration details |
| **[MARKETPLACE_IMPLEMENTATION.md](MARKETPLACE_IMPLEMENTATION.md)** | Marketplace architecture and flow |

---

## 🏗️ Architecture

### Frontend (Next.js)
```
src/
├── components/       # React components
│   ├── dashboard/    # Dashboard-specific components
│   ├── landing/      # Landing page components
│   ├── ui/           # Reusable UI components
│   └── upload/       # Upload-related components
├── pages/            # Next.js pages and API routes
│   ├── api/          # Backend API endpoints
│   └── dashboard/    # Dashboard pages
├── lib/              # Utility libraries
│   ├── apiResponse.js          # Standardized API responses
│   ├── userHelpers.js          # User management utilities
│   ├── paginationHelpers.js    # Pagination utilities
│   ├── transactionHelpers.js   # Blockchain transaction helpers
│   ├── envValidation.js        # Environment validation
│   ├── storyProtocol.js        # Story Protocol integration
│   ├── storyRoyaltyTokens.js   # Royalty token management
│   ├── pinata.js               # IPFS/Pinata integration
│   └── watermark.js            # Watermarking utilities
└── styles/           # Global styles
```

### Backend (API Routes + Database)
```
prisma/
└── schema.prisma     # PostgreSQL database schema

Database Models:
- User              # User accounts and wallets
- Asset             # Uploaded creative works
- License           # Licensing terms and agreements
- Fractionalization # Token fractionalization records
- MarketplaceListing# Primary and secondary listings
- Order             # Purchase orders and fulfillment
- Revenue           # Revenue tracking and claiming
- Proposal          # DAO governance proposals
- Vote              # Governance voting records
- SentinelAlert     # Detection alerts and evidence
```

### Smart Contracts (Solidity)
```
contracts/src/
├── DippChainRegistry.sol        # ERC721 asset registry
├── RoyaltyToken.sol             # ERC20 royalty tokens
├── FractionalizationManager.sol # Token fractionalization
├── RoyaltyVault.sol             # Revenue distribution
├── DippChainGovernor.sol        # DAO governance
└── DippChainDetector.sol        # Detection evidence anchoring
```

---

## 🔧 Key Technologies

- **Next.js 16** - React framework with Pages Router
- **TailwindCSS** - Utility-first CSS framework
- **PostgreSQL** - Relational database
- **Prisma** - Type-safe database ORM
- **Story Protocol** - Programmable IP infrastructure
- **Reown (WalletConnect)** - Wallet connection
- **Pinata** - IPFS storage gateway
- **Ethers.js** - Ethereum library
- **React Hot Toast** - Toast notifications

---

## 🌊 User Flow

### 1. Asset Upload
```
Select File → Add Details → Watermark → Upload to IPFS → Save to Database
```

### 2. Registration
```
Register on DippChain (ERC721) → Register on Story Protocol (IP Asset)
```

### 3. Licensing
```
Create License → Attach to Asset → License Terms Stored
```

### 4. Fractionalization
```
Select Asset → Set Terms → Create Royalty Token Listing
```

### 5. Marketplace
```
Primary Market: Creator → Buyers
Secondary Market: Holder → Holder
```

### 6. Revenue
```
Track Earnings → Claim Revenue → Withdraw to Wallet
```

---

## 🛠️ Development Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:push      # Push schema to database
npm run prisma:studio    # Open Prisma Studio
npm run prisma:migrate   # Create migration

# Validation
node scripts/validate-setup.js  # Validate environment setup
```

---

## 📦 Environment Variables

Required variables in `.env`:

```env
DATABASE_URL="postgresql://..."           # PostgreSQL connection
PINATA_JWT="eyJ..."                       # Pinata API token
PINATA_GATEWAY="gateway.pinata.cloud"     # Pinata gateway
WALLET_PRIVATE_KEY="0x..."                # Server wallet key
NEXT_PUBLIC_REOWN_PROJECT_ID="..."        # Reown Project ID
NODE_ENV="development"                    # Environment
NEXT_PUBLIC_APP_URL="http://localhost:3000" # App URL
```

See **[ENV_TEMPLATE.md](ENV_TEMPLATE.md)** for detailed setup instructions.

---

## 🎯 Recent Optimizations

### ✅ Completed (December 2025)
- **Fixed** primary market purchase flow (was 100% broken)
- **Migrated** from MySQL to PostgreSQL for better performance
- **Standardized** all API responses for consistency
- **Created** 6 reusable utility libraries (2000+ lines)
- **Added** comprehensive error handling throughout
- **Implemented** environment validation on startup
- **Enhanced** database schema with new relations
- **Documented** complete deployment process

See **[OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md)** for details.

---

## 🧪 Testing

### Validate Setup
```bash
node scripts/validate-setup.js
```

### Manual Testing Checklist
- [ ] Wallet connection works
- [ ] Asset upload completes
- [ ] IPFS storage successful
- [ ] On-chain registration works
- [ ] Story Protocol registration works
- [ ] Fractionalization creates tokens
- [ ] Marketplace listings display
- [ ] Purchase flow completes
- [ ] Revenue tracking works

---

## 🚢 Deployment

### Vercel (Recommended)
```bash
vercel
```

### Railway
```bash
# Connect GitHub repo at railway.app
# Add PostgreSQL database
# Set environment variables
# Auto-deploys on push
```

### Docker
```bash
docker build -t dippchain .
docker run -p 3000:3000 dippchain
```

See **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** for complete instructions.

---

## 🔐 Security

- ✅ Environment validation on startup
- ✅ Input sanitization on all endpoints
- ✅ Wallet private key never exposed to frontend
- ✅ Proper CORS configuration
- ✅ PostgreSQL parameterized queries (Prisma)
- ⚠️ Add rate limiting for production
- ⚠️ Enable Sentry for error tracking
- ⚠️ Implement API key authentication

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

This project is part of the Story Protocol ecosystem.

---

## 🆘 Support

- **Documentation**: See `/docs` directory
- **Issues**: Check CODEBASE_AUDIT_REPORT.md
- **Story Protocol**: https://docs.story.foundation
- **Community**: Story Protocol Discord

---

## 🎉 Acknowledgments

- **Story Protocol** - Programmable IP infrastructure
- **Next.js** - React framework
- **Prisma** - Database ORM
- **Pinata** - IPFS gateway
- **Reown** - Wallet connection

---

## 📊 Project Status

- ✅ **Core Features**: Complete
- ✅ **Smart Contracts**: Deployed to Aeneid Testnet
- ✅ **Frontend**: Fully functional and responsive
- ✅ **Backend**: Optimized with standardized responses
- ✅ **Database**: Migrated to PostgreSQL
- ✅ **Documentation**: Comprehensive and up-to-date
- 🔄 **Testing**: Manual testing complete, automated tests pending
- 🚀 **Production**: Ready for deployment

---

**Built with ❤️ for creators everywhere**

🔗 [Story Protocol](https://story.foundation) | 📚 [Documentation](DEPLOYMENT_GUIDE.md) | 🎨 [Live Demo](#)
