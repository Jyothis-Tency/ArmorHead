const Cart = require("../model/cartModel");
const User = require("../model/userModel");
const Product = require("../model/productModel");
const mongoose = require("mongoose");
const ObjectId = require("mongoose").Types.ObjectId;

const getAllCartItems = async (userId) => {
  try {
    console.log("getAllCartItems triggered");
    const userCartItems = await Cart.aggregate([
      {
        $match: { user: new mongoose.Types.ObjectId(userId) },
      },
      {
        $unwind: "$items",
      },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $addFields: {
          product: { $arrayElemAt: ["$product", 0] },
        },
      },
      {
        $project: {
          productId: "$items.productId",
          quantity: "$items.quantity",
          size: "$items.size",
          product: {
            $mergeObjects: [
              "$product",
              { productImage: "$product.productImage" },
            ],
          },
          total: "$items.total",
        },
      },
    ]);
    console.log(userCartItems);
    return userCartItems;
  } catch (error) {
    console.error("Error in getAllCartItems:", error);
    return [];
  }
};

const getCartCount = async (userId) => {
  try {
    const cart = await Cart.findOne({ user: userId }).populate(
      "items.productId"
    );
    if (!cart) {
      return 0;
    }
    let itemCount = 0;
    cart.items.forEach((item) => {
      itemCount += item.quantity;
    });
    return itemCount;
  } catch (error) {
    console.error("Error in getCartCount:", error);
    throw error;
  }
};

const totalSubtotal = async (userId, cartItems) => {
  try {
    console.log("totalSubtotal:");
    let total = 0;
    console.log("cartItems:", cartItems);
    for (const cartItem of cartItems) {
      console.log("cartItem.quantity:", cartItem.quantity);
      console.log("cartItem.product.salePrice:", cartItem.product.salePrice);
      total += cartItem.quantity * cartItem.product.salePrice;
    }
    console.log("total:",total);
    const cart = await Cart.findOne({ user: userId });
    if (cart) {
      cart.totalPrice = total;
      await cart.save();
    }

    return total;
  } catch (error) {
    console.error("Error in totalSubtotal:", error);
    throw error;
  }
};

const addToUserCart = async (userId, productId, quantity, size = "Small") => {
  try {
    console.log("inside addToUserCart");
    console.log(quantity);
    const maxProduct = 5;
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
        throw new Error("Out of Stock");
      }
      console.log("product.salePrice:", product.salePrice);
      console.log("quantity:", quantity);
      const totalPrice = product.salePrice * quantity;
      console.log("totalPrice:", totalPrice);
      cart = new Cart({ user: userId, items: [] });
      cart.items.push({
        productId: productId,
        quantity: quantity,
        size: size,
        total: totalPrice,
      });
    } else {
      let existingItem = cart.items.find(
        (item) =>
          String(item.productId) === String(productId) && item.size === size
      );

      if (existingItem) {
        const newQuantity = quantity + existingItem.quantity;

        if (newQuantity > maxProduct) {
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
          throw new Error("No more stock to add in cart");
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
        console.log("product.salePrice:", product.salePrice);
        console.log("quantity:", quantity);
        const totalPrice = product.salePrice * quantity;
        console.log("totalPrice:", totalPrice);
        cart.items.push({
          productId: productId,
          quantity: quantity,
          size: size,
          total: totalPrice,
        });
      }
    }
    cart.totalPrice = cart.items.reduce((acc, curr) => acc + curr.total, 0);
    await cart.save();
    return cart;
  } catch (error) {
    console.log("addCart error:", error);
    throw error;
  }
};

const removeAnItemFromCart = async (cartId, productId, size) => {
  try {
    const result = await Cart.updateOne(
      { _id: cartId },
      { $pull: { items: { productId: productId, size: size } } }
    );
    return result;
  } catch (error) {
    throw error;
  }
};

const getMaxQuantityForUser = async (
  userId,
  selectedSize,
  productId,
  quantity
) => {
  try {
    console.log("inside getMaxQuantityForUser");

    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return { quantity: 5, existingQuantity: 0 };
    }

    const matchingItem = cart.items.find(
      (item) =>
        item.productId.toString() === productId && item.size === selectedSize
    );
    let existingQuantity = 0;
    if (matchingItem) {
      existingQuantity = matchingItem.quantity;
      quantity -= existingQuantity;
    }

    if (matchingItem && quantity + existingQuantity <= 5) {
      return { quantity, existingQuantity };
    } else {
      return { quantity: 0, existingQuantity };
    }
  } catch (error) {
    console.error("Error fetching maximum quantity for user:", error);
    throw new Error("Failed to fetch maximum quantity for user");
  }
};

const incDecProductQuantity = async (
  userId,
  productId,
  quantity,
  selectedSize,
  maxQuantityAllowed
) => {
  try {
    console.log("inside incdecproductquantity");
    const cart = await Cart.findOne({ user: userId });
    const item = cart.items.find(
      (item) =>
        item.productId.toString() === productId && item.size === selectedSize
    );
    console.log("item =");
    console.log(item);
    let itemQuantity = item.quantity;
    if (!item) {
      throw new Error("Product not found in cart");
    }
    const product = await Product.findById(productId);
    const sizeInfo = product.productSizes.find(
      (size) => size.size === selectedSize
    );
    console.log("sizeInfo = ");
    console.log(sizeInfo);
    if (!sizeInfo) {
      throw new Error("Size information not found for the product");
    }
    let newQuantity = parseInt(quantity);
    console.log("newQuantity = ");
    console.log(newQuantity);
    item.quantity = newQuantity;
    if (item.quantity > sizeInfo.quantity) {
      item.quantity = itemQuantity;
      console.log("stock exceeded");
      throw new Error("Stock exceeded for this product"); // Corrected
    }
    await cart.save();
    return newQuantity;
  } catch (error) {
    if (error.message === "Stock exceeded for this product") {
      throw new Error("Stock exceeded for this product");
    } else {
      throw error;
    }
  }
};

const updateCartItemTotal = async (
  cartId,
  productId,
  quantity,
  selectedSize
) => {
  try {
    const cart = await Cart.findById(cartId);

    if (!cart) {
      throw new Error("Cart not found");
    }

    const cartItem = cart.items.find(
      (item) =>
        String(item.productId) === String(productId) &&
        item.size === selectedSize
    );

    if (!cartItem) {
      throw new Error("Item not found in the cart");
    }

    const product = await Product.findById(productId);

    if (!product || product.isBlocked) {
      throw new Error("Product not found or blocked");
    }

    const totalPrice = product.salePrice * quantity;

    cartItem.total = totalPrice;

    await cart.save();

    return cart;
  } catch (error) {
    console.error("Error updating cart item total:", error);
    throw error;
  }
};

function currencyFormat(amount) {
  return Number(amount).toLocaleString("en-in", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  });
}

const totalAmount = async (userId) => {
  try {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return 0;
    }
    const totalPricePlus70 = cart.totalPrice;
    return totalPricePlus70;
  } catch (error) {
    throw error;
  }
};

const clearTheCart = async (userId) => {
  try {
    console.log("clearTheCart triggered");
    const result = await Cart.findOneAndUpdate(
      { user: userId },
      { $set: { items: [] } },
      { new: true }
    );
    return result;
  } catch (error) {
    throw error;
  }
};

const isAProductInCart = async (userId, productId) => {
  try {
    const cart = await Cart.findOne({
      user: userId,
      "items.productId": productId, // Search within the items array for productId
    });
    return !!cart; // Return true if cart is found, false otherwise
  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports = {
  getAllCartItems,
  addToUserCart,
  getCartCount,
  totalSubtotal,
  removeAnItemFromCart,
  getMaxQuantityForUser,
  incDecProductQuantity,
  updateCartItemTotal,
  currencyFormat,
  totalAmount,
  clearTheCart,
  isAProductInCart,
};
