import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

// 🟣 LOGIN
// 🟣 LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("📩 Login request:", { email, password });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    console.log("✅ User found:", user.email);
    console.log("🔑 Stored hash in DB:", user.password);
    console.log("🔍 Plain password entered:", password);

    const match = await bcrypt.compare(password, user.password);
    console.log("🔍 Compare result:", match);

    if (!match) {
      console.log("❌ Password mismatch!");
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, user });
  } catch (err) {
    console.error("🔥 Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// 🟣 BUYER CHANGE PASSWORD
router.put("/change-password/:id", async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ error: "User not found" });

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(400).json({ error: "Old password is wrong" });

    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Password update failed" });
  }
});

// ✅ Logout Route
router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

export default router;
