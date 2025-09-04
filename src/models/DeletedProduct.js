// models/DeletedProduct.js
import mongoose from "mongoose";

const deletedProductSchema = new mongoose.Schema({
  name: String,
  sku: String,
  category: String,
  unit: String,
  price: Number,
  quantity: Number,
  minStockLevel: Number,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  deletedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model("DeletedProduct", deletedProductSchema);
