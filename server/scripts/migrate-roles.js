import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const statements = [
    `ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'`,
    `ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'FINANCE_MANAGER'`,
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log("OK:", sql);
    } catch (error) {
      console.log("SKIP:", sql, "-", error.message);
    }
  }

  try {
    const updated = await prisma.$executeRawUnsafe(
      `UPDATE "users" SET role = 'SUPER_ADMIN'::"Role" WHERE role::text = 'ADMIN'`,
    );
    console.log("Migrated ADMIN users:", updated);
  } catch (error) {
    console.log("User migrate:", error.message);
  }

  // Prefer renaming ADMIN if still present and unused.
  try {
    const remaining = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS count FROM "users" WHERE role::text = 'ADMIN'`,
    );
    console.log("Remaining ADMIN users:", remaining);
  } catch (error) {
    console.log("Count ADMIN:", error.message);
  }

  const roles = await prisma.$queryRawUnsafe(
    `SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'Role' ORDER BY enumsortorder`,
  );
  console.log("Role enum values:", roles);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
