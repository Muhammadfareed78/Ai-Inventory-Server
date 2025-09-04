import express from 'express';
import Product from '../models/Product.js';
import { parseVoiceCommand ,parseDeleteCommand } from '../utils/voiceParser.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import Sale from "../models/Sale.js";
import DeletedProduct from "../models/DeletedProduct.js";


const router = express.Router();

/**
 * GET /api/products
 * optional query: q (search name), category, page, limit, lowStock=true
 */

router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const { q, category, page = 1, limit = 100, lowStock } = req.query;
    const filter = { createdBy: req.user._id ,user: req.user._id,      }; // ab error nahi ayega

    if (q) filter.normalizedName = { $regex: q.toLowerCase(), $options: "i" };
    if (category) filter.category = category;
    if (lowStock === "true")
      filter.$expr = { $lt: ["$quantity", "$minStockLevel"] };

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit || 100);
    const items = await Product.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit || 100));
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.get("/stats", authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user._id;

    const totalProducts = await Product.countDocuments({
      $or: [{ createdBy: userId }, { user: userId }]
    });

    const totalStockAgg = await Product.aggregate([
      { $match: { $or: [{ createdBy: userId }, { user: userId }] } },
      { $group: { _id: null, total: { $sum: "$quantity" } } },
    ]);
    const totalStock = totalStockAgg[0]?.total || 0;

    const lowStock = await Product.countDocuments({
      $or: [{ createdBy: userId }, { user: userId }],
      $expr: { $lt: ["$quantity", "$minStockLevel"] }
    });

    const recent = await Product.find({
      $or: [{ createdBy: userId }, { user: userId }]
    }).sort({ createdAt: -1 }).limit(5);

    const monthlyAgg = await Product.aggregate([
      { $match: { $or: [{ createdBy: userId }, { user: userId }] } },
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
          added: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthlyData = monthlyAgg.map((m) => ({
      month: months[m._id.month - 1],
      added: m.added,
    }));

    res.json({
      totalProducts,
      totalStock,
      lowStock,
      recent: recent[0] || null,
      monthlyData,
    });
  } catch (err) {
    next(err);
  }
});



router.get('/',authMiddleware, async (req, res, next) => {
  try {
    const { q, category, page = 1, limit = 100, lowStock } = req.query;
        const filter = { createdBy: req.user._id ,user: req.user._id,      }; // 🟣 sirf current user ke products

    if (q) filter.normalizedName = { $regex: q.toLowerCase(), $options: 'i' };
    if (category) filter.category = category;
    if (lowStock === 'true') filter.$expr = { $lt: ['$quantity', '$minStockLevel'] };

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit || 100);
    const items = await Product.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(Number(limit || 100));
    res.json(items);
  } catch (e) { next(e); }
});

// Dashboard stats
router.get('/dashboard', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Total products for this user (createdBy OR user)
    const totalProducts = await Product.countDocuments({ 
      $or: [{ createdBy: userId }, { user: userId }]
    });

    const agg = await Product.aggregate([
      { $match: { $or: [{ createdBy: userId }, { user: userId }] } },
      { $group: { _id: null, totalQty: { $sum: '$quantity' } } }
    ]);
    const totalQty = agg.length ? agg[0].totalQty : 0;

    const lowStockCount = await Product.countDocuments({ 
      $or: [{ createdBy: userId }, { user: userId }],
      $expr: { $lt: ['$quantity', '$minStockLevel'] }
    });

    const recent = await Product.find({ 
      $or: [{ createdBy: userId }, { user: userId }]
    })
    .sort({ createdAt: -1 })
    .limit(5);

    res.json({ totalProducts, totalQty, lowStockCount, recent });
  } catch (e) { 
    next(e); 
  }
});


// Get single product
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (e) { next(e); }
});

// Create new product always
router.post('/',  authMiddleware,async (req, res, next) => {
  try {
    const {
      name,
      quantity = 0,
      unit = 'pcs',
      category,
      sku,
      minStockLevel = 5,
      price = 0
    } = req.body || {};

    if (!name || quantity == null) {
      return res.status(400).json({ error: 'name and quantity are required' });
    }

    // Har baar naya product banao, chahe same name ho
    const created = await Product.create({
      name,
      normalizedName: name.toLowerCase(),
      sku,
      category,
      unit,
      price,
      minStockLevel,
      quantity: Number(quantity),
      createdBy: req.user._id,
      user: req.user._id,       
    });

    return res.status(201).json({ created: true, product: created });
  } catch (e) {
    next(e);
  }
});


// Update product (edit fields)
router.put('/:id', authMiddleware,async (req, res, next) => {
  try {
    const allowed = ['name', 'sku', 'category', 'unit', 'quantity', 'isActive', 'minStockLevel', 'price'];
    const update = {};
    for (const k of allowed) if (k in req.body) update[k] = req.body[k];
    const updated = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (e) { next(e); }
});

// Adjust quantity (increase/decrease)
router.post('/:id/adjust', authMiddleware,async (req, res, next) => {
  try {
    const { delta } = req.body || {};
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    product.quantity = Math.max(0, (product.quantity || 0) + Number(delta || 0));
    await product.save();
    res.json(product);
  } catch (e) { next(e); }
});

// Delete
// Normal delete with archive
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Not found' });

    // Always archive before any change
    await DeletedProduct.create({
      ...product.toObject(),
      deletedAt: new Date(),
    });

    // Full delete from Product
    await Product.findByIdAndDelete(req.params.id);

    res.json({ ok: true, message: "Product deleted & archived" });
  } catch (e) {
    next(e);
  }
});


// Voice endpoint (accepts { command: string }) — reuses parser + upsert logic
// Voice endpoint (accepts { command: string })
router.post("/voice", async (req, res, next) => {
  try {
    console.log("🔥 Voice Route Body:", req.body); // Debugging

    const { command } = req.body || {};
    if (!command) {
      return res.status(400).json({ error: "Missing command in body" });
    }

    const parsed = parseVoiceCommand(command);
    if (!parsed || !parsed.name) {
      return res.status(400).json({ error: "Could not parse command" });
    }

    const created = await Product.create({
      ...parsed,
      minStockLevel: 5,
    });

    res.json({ upserted: true, product: created });
  } catch (e) {
    console.error("Voice route error:", e);
    next(e);
  }
});



// Category + product wise totals
router.get("/totals/summary", authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Aggregate per category + product for current user only
    const agg = await Product.aggregate([
      { $match: { createdBy: userId, user: userId } }, // ✅ only current user's products
      {
        $group: {
          _id: { category: "$category", name: "$name" },
          totalQuantity: { $sum: "$quantity" },
          totalPrice: { $sum: { $multiply: ["$quantity", "$price"] } },
          unit: { $first: "$unit" },
          price: { $first: "$price" },
        },
      },
      {
        $group: {
          _id: "$_id.category",
          products: {
            $push: {
              name: "$_id.name",
              quantity: "$totalQuantity",
              unit: "$unit",
              totalPrice: "$totalPrice",
            },
          },
          categoryStock: { $sum: "$totalQuantity" },
          categoryValue: { $sum: "$totalPrice" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Grand totals for current user only
    const grandAgg = await Product.aggregate([
      { $match: { createdBy: userId, user: userId } }, // ✅ only current user's products
      {
        $group: {
          _id: null,
          grandTotalQuantity: { $sum: "$quantity" },
          grandTotalValue: { $sum: { $multiply: ["$quantity", "$price"] } },
        },
      },
    ]);

    res.json({
      categories: agg.map((cat) => ({
        category: cat._id || "Uncategorized",
        stock: cat.categoryStock,
        value: cat.categoryValue,
        products: cat.products,
      })),
      grandTotals: grandAgg[0] || { grandTotalQuantity: 0, grandTotalValue: 0 },
    });
  } catch (err) {
    next(err);
  }
});

// Multi Delete
router.post("/multi-delete", authMiddleware, async (req, res, next) => {
  try {
    const { ids } = req.body || {};
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array required" });
    }

    // Find all products to be deleted
    const products = await Product.find({ _id: { $in: ids } });

    if (!products.length) {
      return res.status(404).json({ error: "No products found for given ids" });
    }

    // Archive all products to DeletedProduct (trash)
    const archived = products.map((p) => ({
      ...p.toObject(),
      deletedAt: new Date(),
    }));
    await DeletedProduct.insertMany(archived);

    // Delete from main Product collection
    const result = await Product.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      deletedCount: result.deletedCount,
      archivedCount: archived.length,
      message: "Products deleted & archived successfully",
    });
  } catch (err) {
    next(err);
  }
});


// Voice based Delete with archive
// Voice based Delete with partial archive
// Adjust quantity (increase/decrease)
router.post('/:id/adjust', authMiddleware, async (req, res, next) => {
  try {
    const { delta } = req.body || {};
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Not found' });

    product.quantity = Math.max(0, (product.quantity || 0) + Number(delta || 0));

    // ✅ Agr quantity 0 ho jaye to delete na karo → sirf status update karo
    if (product.quantity <= 0) {
      product.status = "out of stock";
    } else {
      product.status = "active";
    }

    await product.save();
    res.json(product);
  } catch (e) { next(e); }
});


// Voice based Delete with archive (updated)
router.post("/voice-delete", authMiddleware, async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: "Voice command required" });

    const userId = req.user._id;
    const items = await parseDeleteCommand(command);

    if (!items.length) {
      return res.json({ message: "No valid items found" });
    }

    let updated = [];
    let errors = [];

    for (const { name, qty } of items) {
      const product = await Product.findOne({
        user: userId,
        name: { $regex: new RegExp(name, "i") }
      });

      if (!product) {
        errors.push(`❌ ${name} not found`);
        continue;
      }

      if (product.quantity < qty) {
        errors.push(`⚠️ Not enough stock for ${product.name}. Available: ${product.quantity}`);
        continue;
      }

      // 🗑️ Archive sirf utni qty
      await DeletedProduct.create({
        productId: product._id,
        name: product.name,
        category: product.category,
        unit: product.unit,
        price: product.price,
        quantity: qty, // ✅ sirf delete hui qty
        minStockLevel: product.minStockLevel,
        createdBy: product.createdBy,
        user: product.user,
        deletedAt: new Date(),
      });

      // 📉 Product quantity decrease
      product.quantity -= qty;

      if (product.quantity <= 0) {
        product.quantity = 0;
        product.status = "out of stock"; // ✅ auto delete ki jagah status update
        await product.save();
        updated.push(`🚫 ${product.name} is now out of stock`);
      } else {
        product.status = "active";
        await product.save();
        updated.push(`✅ Removed ${qty} ${product.name} (Remaining: ${product.quantity})`);
      }
    }

    res.json({ success: true, updated, errors });

  } catch (err) {
    console.error("Voice delete error:", err);
    res.status(500).json({ error: "Server error" });
  }
});








router.post("/return/:id", authMiddleware, async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id).populate("product");
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    // qty wapas add
    sale.product.quantity += sale.quantity;
    await sale.product.save();

    // ek return record bhi save karo
    const ret = await Sale.create({
      product: sale.product._id,
      name: sale.product.name,
      quantity: sale.quantity,
      price: sale.price,
      total: sale.quantity * sale.price,
      createdBy: req.user._id,
      type: "return"
    });

    res.json({ success: true, message: "Product returned", return: ret });
  } catch (e) {
    next(e);
  }
});

// 🎤 Voice-based delete products


// Get deleted products
router.get("/deleted/list", authMiddleware, async (req, res, next) => {
  try {
    const items = await DeletedProduct.find({ user: req.user._id })
      .sort({ deletedAt: -1 });
    res.json(items);
  } catch (e) {
    next(e);
  }
});


// Restore deleted product
// Restore deleted product (partial qty bhi restore ho sakti hai)
router.post("/restore/:id", authMiddleware, async (req, res, next) => {
  try {
    const deleted = await DeletedProduct.findById(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Deleted product not found" });

    // Dekho product already exist karta hai ya nahi
    let product = await Product.findOne({
      user: deleted.user,
      name: deleted.name,
    });

    if (product) {
      // ✅ Agar product exist karta hai → qty add karo
      product.quantity += deleted.quantity;
      await product.save();
    } else {
      // ❌ Agar product nahi hai → naya product banao
      product = await Product.create({
        name: deleted.name,
        sku: deleted.sku,
        category: deleted.category,
        unit: deleted.unit,
        price: deleted.price,
        quantity: deleted.quantity,
        minStockLevel: deleted.minStockLevel,
        createdBy: deleted.createdBy,
        user: deleted.user,
      });
    }

    // 🗑️ DeletedProduct se remove
    await DeletedProduct.findByIdAndDelete(req.params.id);

    res.json({ success: true, restored: product });
  } catch (e) {
    next(e);
  }
});


// 🛑 Permanent delete from DeletedProduct
router.delete("/permanent/:id", authMiddleware, async (req, res, next) => {
  try {
    const deleted = await DeletedProduct.findById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Deleted product not found" });
    }

    // Permanently delete from DeletedProduct
    await DeletedProduct.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Product permanently deleted",
      id: req.params.id,
    });
  } catch (e) {
    next(e);
  }
});




export default router;
