import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, index: true },
    sku: { type: String, trim: true, index: true, sparse: true },
    category: { type: String, trim: true },
    unit: { type: String, default: 'pcs' },
    price: { type: Number, default: 0 },
    quantity: { type: Number, default: 0, min: 0 },
    minStockLevel: { type: Number, default: 5 }, // low-stock threshold
    isActive: { type: Boolean, default: true },

    // 🟣 ye field add karni zaroori hai
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  },
  { timestamps: true }
);

// Name ko lowercase karke save karna
ProductSchema.pre('save', function (next) {
  if (this.name) this.normalizedName = this.name.toLowerCase();
  next();
});

ProductSchema.index({ normalizedName: 1 });
ProductSchema.index({ sku: 1 }, { unique: true, sparse: true });

export default mongoose.model('Product', ProductSchema);
