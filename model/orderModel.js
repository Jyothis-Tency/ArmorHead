const mongoose = require("mongoose");

const orderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    orderedItems: [
      {
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          default: () => new mongoose.Types.ObjectId(),
        },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "products",
        },
        quantity: Number,
        size: {
          type: String,
          default: "Small",
          enum: ["Small", "Medium", "Large"],
        },
        discountAvailed: Number,
        orderStat: {
          type: String,
          enum: [
            "pending",
            "confirmed",
            "shipped",
            "outForDelivery",
            "delivered",
            "cancelled",
            "return pending",
            "returned",
          ],
          default: "confirmed",
        },
      },
    ],
    address: mongoose.Schema.Types.ObjectId,
    orderDate: Date,
    coupon: {
      type: String,
      default: null,
    },
    couponAmount: Number,
    totalAmount: Number,
    totalDiscount: Number,
    paymentMethod: String,
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "shipped",
        "outForDelivery",
        "delivered",
        "cancelled",
        "return pending",
        "returned",
      ],
      default: "pending",
    },
    cancellationReason: {
      type: String,
      maxlength: 20,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = new mongoose.model("Order", orderSchema);
