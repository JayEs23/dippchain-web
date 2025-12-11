// Validate DippChain Setup Script
// Run this to verify your environment is configured correctly

const { PrismaClient } = require('@prisma/client');

async function validateSetup() {
  console.log('🔍 Validating DippChain Setup...\n');
  
  const results = {
    database: false,
    pinata: false,
    wallet: false,
    reown: false,
  };
  
  // 1. Check Environment Variables
  console.log('📋 Checking environment variables...');
  const requiredVars = [
    'DATABASE_URL',
    'PINATA_JWT',
    'WALLET_PRIVATE_KEY',
    'NEXT_PUBLIC_REOWN_PROJECT_ID',
  ];
  
  const missing = [];
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    console.log('❌ Missing environment variables:');
    missing.forEach(v => console.log(`   - ${v}`));
    console.log('\n💡 Create a .env file and add these variables.\n');
    return false;
  }
  
  console.log('✅ All required environment variables are set\n');
  
  // 2. Test Database Connection
  console.log('💾 Testing database connection...');
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    results.database = true;
    await prisma.$disconnect();
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    console.log('💡 Check your DATABASE_URL in .env file\n');
  }
  
  // 3. Test Pinata Connection
  console.log('\n📦 Testing Pinata (IPFS) connection...');
  try {
    const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PINATA_JWT}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Pinata connected:', data.message || 'Authenticated');
      results.pinata = true;
    } else {
      console.log('❌ Pinata authentication failed:', response.status, response.statusText);
      console.log('💡 Check your PINATA_JWT in .env file\n');
    }
  } catch (error) {
    console.log('❌ Pinata connection error:', error.message);
    console.log('💡 Check your internet connection\n');
  }
  
  // 4. Validate Wallet Private Key
  console.log('\n🔐 Validating wallet private key...');
  try {
    let privateKey = process.env.WALLET_PRIVATE_KEY.trim().replace(/['"]/g, '').replace(/\s/g, '');
    
    if (!privateKey.startsWith('0x')) {
      privateKey = `0x${privateKey}`;
    }
    
    if (privateKey.length !== 66) {
      console.log('❌ Invalid private key length:', privateKey.length, '(expected 66)');
      console.log('💡 Private key should be 64 hex characters with 0x prefix\n');
    } else if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
      console.log('❌ Invalid private key format');
      console.log('💡 Private key must be hexadecimal\n');
    } else {
      console.log('✅ Wallet private key is valid');
      results.wallet = true;
    }
  } catch (error) {
    console.log('❌ Wallet validation error:', error.message);
  }
  
  // 5. Check Reown Project ID
  console.log('\n🌐 Checking Reown Project ID...');
  if (process.env.NEXT_PUBLIC_REOWN_PROJECT_ID && process.env.NEXT_PUBLIC_REOWN_PROJECT_ID.length > 10) {
    console.log('✅ Reown Project ID is set');
    results.reown = true;
  } else {
    console.log('❌ Reown Project ID appears invalid');
    console.log('💡 Get your Project ID from https://cloud.reown.com\n');
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(50));
  
  const allValid = Object.values(results).every(v => v);
  
  console.log(`Database:  ${results.database ? '✅ Ready' : '❌ Failed'}`);
  console.log(`Pinata:    ${results.pinata ? '✅ Ready' : '❌ Failed'}`);
  console.log(`Wallet:    ${results.wallet ? '✅ Ready' : '❌ Failed'}`);
  console.log(`Reown:     ${results.reown ? '✅ Ready' : '❌ Failed'}`);
  
  console.log('='.repeat(50));
  
  if (allValid) {
    console.log('\n🎉 SUCCESS! Your DippChain setup is ready!\n');
    console.log('Next steps:');
    console.log('  1. npm run prisma:generate');
    console.log('  2. npm run prisma:push');
    console.log('  3. npm run dev\n');
  } else {
    console.log('\n⚠️  Some checks failed. Please fix the issues above.\n');
    console.log('For help, see:');
    console.log('  - DEPLOYMENT_GUIDE.md');
    console.log('  - ENV_TEMPLATE.md\n');
  }
  
  return allValid;
}

// Run validation
validateSetup()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('\n❌ Validation error:', error.message);
    process.exit(1);
  });

