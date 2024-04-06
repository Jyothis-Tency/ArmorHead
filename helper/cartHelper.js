const Cart = require("../model/cartModel");
const User = require("../model/userModel");
const Product = require("../model/productModel");
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
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $addFields: {
          product: { $arrayElemAt: ["$product", 0] }, // Get the first element of the 'product' array
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
              { productImage: "$product.productImage" }, // Include productImage field
            ],
          },
          total: "$items.total",
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
    const cart = await Cart.findOne({ user: userId }).populate(
      "items.productId"
    ); // Populate the productId field in items array
    if (!cart) {
      return 0; // Return 0 if cart is not found
    }

    let itemCount = 0; // Initialize item count

    // Loop through each item in the cart
    cart.items.forEach((item) => {
      itemCount += item.quantity; // Add quantity of each item to itemCount
    });

    return itemCount;
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
    console.log("inside addToUserCart");
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
    // Fetch the user from the database
    const user = await User.findById(userId);
    // Check if the user exists
    if (!user) {
      throw new Error("User not found");
    }
    // Retrieve the user's cart
    const cart = await Cart.findOne({ user: userId });
    // If the user doesn't have a cart yet, return the default maximum quantity
    if (!cart) {
      return { quantity: 5, existingQuantity: 0 }; // Default maximum quantity
    }
    // Find the item in the cart with the specified productId and selectedSize
    const matchingItem = cart.items.find(
      (item) =>
        item.productId.toString() === productId && item.size === selectedSize
    );
    let existingQuantity = 0;
    if (matchingItem) {
      existingQuantity = matchingItem.quantity;
      quantity -= existingQuantity;
    }

    // If the matching item is found, check if the sum of the quantity passed and the item's quantity is less than or equal to 5
    if (matchingItem && quantity + existingQuantity <= 5) {
      return { quantity, existingQuantity }; // Return the quantities if they're valid
    } else {
      return { quantity: 0, existingQuantity }; // Return 0 quantity if the condition is not met or if no matching item is found
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
    console.log(item);
    let itemQuantity = item.quantity;
    if (!item) {
      throw new Error("Product not found in cart");
    }
    const product = await Product.findById(productId);
    const sizeInfo = product.productSizes.find(
      (size) => size.size === selectedSize
    );
    console.log(sizeInfo);
    if (!sizeInfo) {
      throw new Error("Size information not found for the product");
    }
    let newQuantity = parseInt(quantity);
    console.log(newQuantity);
    item.quantity = newQuantity;
    if (item.quantity > sizeInfo.quantity) {
      item.quantity = itemQuantity;
      throw new error("stock exceeded");
    }
    await cart.save();
    return newQuantity;
  } catch (error) {
    throw error;
  }
};

const updateCartItemTotal = async (
  cartId,
  productId,
  quantity,
  selectedSize
) => {
  try {
    // Find the cart by ID
    const cart = await Cart.findById(cartId);

    if (!cart) {
      throw new Error("Cart not found");
    }

    // Find the item in the cart items array
    const cartItem = cart.items.find(
      (item) =>
        String(item.productId) === String(productId) &&
        item.size === selectedSize
    );

    if (!cartItem) {
      throw new Error("Item not found in the cart");
    }

    // Find the product by ID
    const product = await Product.findById(productId);

    if (!product || product.isBlocked) {
      throw new Error("Product not found or blocked");
    }

    // Calculate the total for the item
    const totalPrice = product.salePrice * quantity;

    // Update the total for the item in the cart
    cartItem.total = totalPrice;

    // Recalculate total price for the cart
    // cart.totalPrice = cart.items.reduce((acc, item) => acc + (item.total || 0), 0);

    // Save the updated cart
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
      return 0; // Return 0 if cart is not found
    }
    const totalPricePlus70 = cart.totalPrice + 70;
    return totalPricePlus70;
  } catch (error) {
    // Handle error if necessary
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
};
