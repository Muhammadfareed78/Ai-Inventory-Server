// models/Sale.js
import mongoose from "mongoose";

const saleSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: String,
  quantity: { type: Number, required: true },
  price: Number,
  total: Number,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, default: Date.now },
  type: { type: String, enum: ["sale", "return"], default: "sale" } // ✅ sale ya return
});

export default mongoose.model("Sale", saleSchema);
