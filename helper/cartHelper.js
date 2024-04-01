const Cart = require("../model/cartModel");
// Removed unnecessary import of Product model
// const Product = require("../model/productModel");
const mongoose = require("mongoose");
const ObjectId = require("mongoose").Types.ObjectId;

const getAllCartItems = async (userId) => {
  try {
    const userCartItems = await Cart.aggregate([
      {
        $match: { user: new mongoose.Types.ObjectId(userId) },
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

const addToUserCart = async (userId, productId, quantity, size = "Small") => {
  try {
    const maxUser = 5;
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      const product = await Product.findOne({ _id: productId });

      if (!product || product.isBlocked) {
        throw new Error("Product Not Found or Blocked");
      }

      const productSize = product.productSizes.find(
        (sizeObj) => sizeObj.size === size
      );

      if (quantity > productSize.quantity) {
        throw new Error("Requested quantity exceeds available quantity");
      }
      const totalPrice = product.salePrice * quantity;
      cart = new Cart({ user: userId, items: [] });
      cart.items.push({
        productId: productId,
        quantity: quantity,
        size: size,
        total: totalPrice, // Default size if not specified
      });
    } else {
      let existingItem = cart.items.find(
        (item) =>
          String(item.productId) === String(productId) && item.size === size
      );

      if (existingItem) {
        const newQuantity = quantity + existingItem.quantity;

        if (newQuantity > maxUser) {
          throw new Error("Requested quantity exceeds available quantity");
        }

        const product = await Product.findOne({ _id: productId });

        if (!product || product.isBlocked) {
          throw new Error("Product Not Found or Blocked");
        }

        const productSize = product.productSizes.find(
          (sizeObj) => sizeObj.size === size
        );

        if (newQuantity > productSize.quantity) {
          throw new Error("Requested quantity exceeds available quantity");
        }

        existingItem.quantity = newQuantity;
        existingItem.total = product.salePrice * newQuantity;
      } else {
        const product = await Product.findOne({ _id: productId });

        if (!product || product.isBlocked) {
          throw new Error("Product Not Found or Blocked");
        }

        const productSize = product.productSizes.find(
          (sizeObj) => sizeObj.size === size
        );
        if (quantity > productSize.quantity) {
          throw new Error("Requested quantity exceeds available quantity");
        }
        const totalPrice = product.salePrice * quantity;
        cart.items.push({
          productId: productId,
          quantity: quantity,
          size: size,
          total: totalPrice, // Default size if not specified
        });
      }
    }
    cart.totalPrice = cart.items.reduce((acc, curr) => acc + curr.total, 0);
    await cart.save();
    return cart;
  } catch (error) {
    console.log("addcart error:", error);
    throw error;
  }
};

module.exports = {
  getAllCartItems,
  addToUserCart,
  getCartCount,
  totalSubtotal,
};
