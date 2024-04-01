const Cart = require("../model/cartModel");
// Removed unnecessary import of Product model
// const Product = require("../model/productModel");
const ObjectId = require("mongoose");

const getAllCartItems = async (userId) => {
  try {
    const userCartItems = await Cart.aggregate([
      {
        $match: { user: mongoose.Types.ObjectId(userId) },
      },
      {
        $unwind: "$items",
      },
      {
        $project: {
          productId: "$items.productId",
          quantity: "$items.quantity",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $project: {
          productId: 1,
          quantity: 1,
          product: { $arrayElemAt: ["$product", 0] },
        },
      },
    ]);

    return userCartItems;
  } catch (error) {
    console.error("Error in getAllCartItems:", error);
    throw error;
  }
};

const getCartCount = async (userId) => {
  try {
    // Removed unnecessary const count = 0;
    const cart = await Cart.findOne({ user: userId });
    // Simplified to directly return the count of cart items
    return cart ? cart.items.length : 0;
  } catch (error) {
    console.error("Error in getCartCount:", error);
    throw error;
  }
};

const totalSubtotal = async (userId, cartItems) => {
  try {
    let total = 0;
    // Refactored loop for better readability
    for (const cartItem of cartItems) {
      total += cartItem.quantity * cartItem.product.salePrice;
    }
    const cart = await Cart.findOne({ user: userId });
    if (cart) {
      cart.totalPrice = total;
      await cart.save();
    }
    console.log(total);
    return total;
  } catch (error) {
    console.error("Error in totalSubtotal:", error);
    throw error;
  }
};

module.exports = {
  getAllCartItems,
  getCartCount,
  totalSubtotal,
};
