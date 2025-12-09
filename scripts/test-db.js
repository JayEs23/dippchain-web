// Test database connection with Prisma 7 + MariaDB adapter
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

async function testConnection() {
  console.log('🔄 Testing database connection...\n');
  
  // Create MariaDB adapter for MySQL
  const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '3306'),
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'dippchain',
    connectionLimit: 5,
  });

  const prisma = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });

  try {
    // Test 1: Basic connection
    console.log('1️⃣  Testing basic connection...');
    await prisma.$connect();
    console.log('   ✅ Connected to database!\n');

    // Test 2: Query test
    console.log('2️⃣  Testing query...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('   ✅ Query successful:', result, '\n');

    // Test 3: Check tables
    console.log('3️⃣  Checking tables...');
    const tables = await prisma.$queryRaw`SHOW TABLES`;
    console.log('   ✅ Found', tables.length, 'tables\n');

    // Test 4: Count assets
    console.log('4️⃣  Counting assets...');
    const assetCount = await prisma.asset.count();
    console.log('   ✅ Asset count:', assetCount, '\n');

    console.log('🎉 All tests passed! Database connection is working.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

