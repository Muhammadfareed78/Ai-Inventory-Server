import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = express.Router();

// ✅ Sirf ADMIN hi naya user create kar sake
router.post("/users", auth, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role = "buyer" } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "User already exists" });

    // ❌ yaha hash mat karo (model hook karega automatically)
    const user = new User({ name, email, password, role });
    await user.save();

    res.json({
      message: "User created by admin",
      user: { id: user._id, name, email, role },
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


export default router;
