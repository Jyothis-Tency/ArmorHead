const mongoose = require("mongoose");

const cartModel = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference the User model
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product", // Reference the Product model
        },
        quantity: {
          type: Number,
          min: 1,
        },
        size: {
          type: String,
          default: "Small",
          enum: ["Small", "Medium", "Large"], // Replace with full names
        },
        total: {
          type: Number,
          default: 0, // Default value is set to 0
        },
      },
    ],
    coupon: {
      type: String,
      default: null,
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", cartModel);
