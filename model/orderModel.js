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
        returnPro: {
          status: {
            type: Boolean,
            default: false,
          },
          returnReason: {
            type: String,
            default: null,
          },
          returnMessage: {
            type: String,
            default: null,
          },
        },
      },
    ],
    address: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      house: { type: String, required: true },
      locality: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: Number, required: true },
      country: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: Number, required: true },
    },
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
    returnProducts: {
      status: {
        type: Boolean,
        default: false,
      },
      returnReason: {
        type: String,
        default: null,
      },
      returnMessage: {
        type: String,
        default: null,
      },
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "success"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = new mongoose.model("Order", orderSchema);
