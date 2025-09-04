import nodemailer from "nodemailer";

export const sendLowStockEmail = async (toEmail, product) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail", // ya smtp server
      auth: {
        user: process.env.EMAIL_USER, // sirf bhejne wala
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,   // sender
      to: toEmail,                    // ✅ recipient dynamic (login user)
      subject: "⚠️ Low Stock Alert",
      text: `Hello ${toEmail},

The stock of product "${product.name}" is low.
Available Stock: ${product.quantity}

Please refill this product soon.

- POS System`,
    };

    await transporter.sendMail(mailOptions);
    console.log("📩 Low stock email sent to:", toEmail);
  } catch (err) {
    console.error("❌ Email error:", err);
  }
};
