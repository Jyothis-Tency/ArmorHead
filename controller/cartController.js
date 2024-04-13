const User = require("../model/userModel");
const Cart = require("../model/cartModel");
const Product = require("../model/productModel");
const ObjectId = require("mongoose").Types.ObjectId;
const cartHelper = require("../helper/cartHelper");
const currencyFormatter = async (amount) => {
  try {
    const formattedAmount = Number(amount).toLocaleString("en-in", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    });
    return formattedAmount;
  } catch (error) {
    throw error;
  }
};

const userCart = async (req, res) => {
  try {
    console.log("userCart triggered");
    let user = req.session.userData;
    let allCartItems = await cartHelper.getAllCartItems(user._id);
    let cartCount = await cartHelper.getCartCount(user._id);
    let totalAndSubTotal = await cartHelper.totalSubtotal(
      user._id,
      allCartItems
    );

    res.render("userView/cart-page", {
      loginStatus: req.session.userData,
      allCartItems,
      cartCount,
      totalAmount: totalAndSubTotal,
    });
  } catch (error) {
    console.error(`these are errors = ${error}`);
  }
};

const addToCart = async (req, res) => {
  try {
    const { prodId, quantity, size } = req.body;
    const addedQuantity = parseInt(quantity);
    let user = req.session.userData;
    let response = await cartHelper.addToUserCart(
      user._id,
      prodId,
      addedQuantity,
      size
    );
    if (response) {
      cartCount = await cartHelper.getCartCount(user._id);
      res
        .status(202)
        .json({ status: "true", message: "product added to cart" });
    }
  } catch (error) {
    console.log(error);
    const errorMessage = error.message || "An error occurred while adding the product to cart";
    res.status(500).json({ status: "false", message: errorMessage });
  }
};

const removeFromCart = (req, res) => {
  try {
    let cartId = req.body.cartId;
    let productId = req.params.id;
    let size = req.body.size;
    cartHelper.removeAnItemFromCart(cartId, productId, size).then((result) => {
      res.json({ message: "successfully item removed" });
    });
  } catch (error) {
    res.status(500).render("user/404");
  }
};

const clearCart = async (req, res) => {
  try {
    const userId = req.session.userData._id;
    const deletedCart = await Cart.deleteOne({ user: userId });
    if (deletedCart.deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found for this user" });
    }
    return res
      .status(200)
      .json({ success: true, message: "Cart deleted successfully" });
  } catch (error) {
    console.error("Error clearing cart:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const incDecQuantity = async (req, res) => {
  try {
    console.log("incDecQuantity triggered");
    let user = req.session.userData;
    let productId = req.body.productId;
    let quantity = req.body.quantity;
    let cartId = req.body.cartId;
    let selectedSize = req.body.selectedSize;

    let { quantity: maxQuantityAllowed, existingQuantity } =
      await cartHelper.getMaxQuantityForUser(
        user._id,
        selectedSize,
        productId,
        quantity
      );
    console.log("maxQuantityAllowed = " + maxQuantityAllowed);
    if (maxQuantityAllowed > 5) {
      throw new Error("Exceeds maximum quantity allowed");
    }

    let newQuantity = await cartHelper.incDecProductQuantity(
      user._id,
      productId,
      quantity,
      selectedSize,
      maxQuantityAllowed
    );
    console.log("newQuantity = " + newQuantity);

    const totSinglePro = await cartHelper.updateCartItemTotal(
      cartId,
      productId,
      newQuantity,
      selectedSize
    );

    let cartItems = await cartHelper.getAllCartItems(user._id);

    let totalAmount = await cartHelper.totalSubtotal(user._id, cartItems);
    totalAmount = totalAmount.toLocaleString("en-in", {
      style: "currency",
      currency: "INR",
    });

    const response = {
      quantity: newQuantity,
      totalAmount: totalAmount,
      totSinglePro: totSinglePro,
    };

    res.status(202).json(response);
  } catch (error) {
    console.log(error);
    if (error.message === "Stock exceeded for this product") {
      // Send an error response with the custom message
      res
        .status(400)
        .json({ success: false, message: "Stock exceeded for this product" });
    } else {
      // Send a generic error response
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }
};

module.exports = {
  userCart,
  addToCart,
  removeFromCart,
  clearCart,
  incDecQuantity,
};
