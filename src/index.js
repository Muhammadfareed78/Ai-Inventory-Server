import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'dotenv/config';
import { connectDB } from './db.js';
import productRoutes from './routes/products.js';
import authRoutes from './routes/authRoutes.js';
import voiceRoutes from './routes/voice.js'; // <-- import voice routes
import adminRoutes from './routes/admin.js';

const app = express();

// Middlewares
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan('dev'));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.use('/api/products', productRoutes);
app.use("/api/voice", voiceRoutes);

app.get('/api/health', (_, res) => res.json({ ok: true }));

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('❌', err);
  res.status(500).json({ error: 'Server error', details: err.message });
});

// Start
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

connectDB(MONGODB_URI)
  .then(() => app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`)))
  .catch((e) => {
    console.error('DB connection failed', e);
    process.exit(1);
  });
