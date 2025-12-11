import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export default prisma;

// Optionally apply migrations at startup
// You can programmatically apply migrations here if needed
// import { execSync } from 'child_process';
// try {
//   execSync('npx prisma migrate deploy', { stdio: 'inherit' });
// } catch (e) {
//   console.error('Migration failed:', e);
// }

export { prisma };
