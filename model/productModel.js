const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      unique: true,
    },
    productDescription: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    regularPrice: {
      type: Number,
      required: true,
    },
    createdOn: {
      type: Date,
      required: true,
    },
    productSizes: [
      {
        size: {
          type: String,
          enum: ["Small", "Medium", "Large"],
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],
    salePrice: {
      type: Number,
      required: true,
    },
    oldSalePrice: {
      type: Number,
    },
    totalQuantity: {
      type: Number,
      default: 0,
      // default: function () {
      //   return this.productSizes.reduce(
      //     (total, size) => total + size.quantity,
      //     0
      //   );
      // },
    },
    productImage: [
      {
        type: String,
      },
    ],
    isBlocked: {
      type: Boolean,
      default: false,
    },
    createdOn: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);
