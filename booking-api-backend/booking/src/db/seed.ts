import { db } from "../config/db.js";
import { categories, users, venues, venueSections } from "./schema/index.js";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  // Seed categories
  const categoryData = [
    { name: "Movies", slug: "movies" },
    { name: "Concerts", slug: "concerts" },
    { name: "Sports", slug: "sports" },
    { name: "Theatre", slug: "theatre" },
    { name: "Comedy", slug: "comedy" },
    { name: "Kids", slug: "kids" },
    { name: "Festivals", slug: "festivals" },
  ];

  await db.insert(categories).values(categoryData).onConflictDoNothing();
  console.log("✅ Categories seeded");

  // Seed admin user
  const passwordHash = await bcrypt.hash("Admin@123", 12);
  await db
    .insert(users)
    .values({
      name: "Admin User",
      email: "admin@ticketflow.com",
      passwordHash,
      role: "admin",
      isVerified: true,
    })
    .onConflictDoNothing();
  console.log("✅ Admin user seeded (admin@ticketflow.com / Admin@123)");

  console.log("✅ Database seeded successfully!");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
