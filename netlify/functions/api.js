import express from "express";
import serverless from "serverless-http";
import cors from "cors";
import morgan from "morgan";
import 'dotenv/config';
import productRoutes from "../../src/routes/products.js";
import authRoutes from "../../src/routes/authRoutes.js";
import voiceRoutes from "../../src/routes/voice.js";
import adminRoutes from "../../src/routes/admin.js";
import { connectDB } from "../../src/db.js";

const app = express();
const router = express.Router(); // <-- Router create
const PORT = process.env.PORT || 4000;

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
connectDB(MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection failed:", err));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cors({ origin: '*' }));
app.use(express.static("public"));

// Router routes
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/products", productRoutes);
router.use("/voice", voiceRoutes);

// Health check
router.get('/health', (_, res) => res.json({ ok: true }));

// Root welcome
router.get('/', (req, res) => {
  res.send("👋 Welcome to AI Inventory Server!");
});


// Use router in app
app.use("/api/", router);

// Start server (local development)
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// Wrap in serverless function for Netlify
const handler = serverless(app);
export  {handler};
