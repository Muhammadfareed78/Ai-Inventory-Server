// scripts/createAdmin.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User.js"; // path apne project ke structure ke hisab se check kar lo

dotenv.config();

const MONGO = process.env.MONGODB_URI;

async function main() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("✅ MongoDB connected for seeding");

  const email = "aiadmin@gmail.com";
  const plain = "admin123";

  // Check if admin already exists
  const existing = await User.findOne({ email });
  if (existing) {
    console.log("⚠️ Admin already exists:", existing.email);
    await mongoose.disconnect();
    return process.exit(0);
  }

  // Directly store plain password (no hash)
  const user = new User({
    name: "AI Admin",
    email,
    password: plain, // ⚠️ plain text password — only for testing/dev
    role: "admin",
  });

  await user.save();
  console.log("🎉 Admin user created successfully:", email);
  console.log("👉 Login with:");
  console.log("   Email:", email);
  console.log("   Password:", plain);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
