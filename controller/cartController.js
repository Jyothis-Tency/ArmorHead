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
    console.log(user._id);
    let allCartItems = await cartHelper.getAllCartItems(user._id);
    console.log(allCartItems);
    let cartCount = await cartHelper.getCartCount(user._id);
    console.log(cartCount);
    // wishListCount = await wishlistHelper.getWishListCount(user._id);
    let totalAndSubTotal = await cartHelper.totalSubtotal(
      user._id,
      allCartItems
    );
    console.log(totalAndSubTotal);
    // totalAndSubTotal = currencyFormatter(totalAndSubTotal);

    res.render("userView/cart-page", {
      loginStatus: req.session.userData,
      allCartItems,
      cartCount,
      //wishListCount,
      totalAmount: totalAndSubTotal,
    });
  } catch (error) {
    // res.status(500).render("error", { error, layout: false });
    console.error(`these are errors = ${error}`);
  }
};

const addToCart = async (req, res) => {
  try {
    console.log("inside add to cart");
    console.log(req.body);
    const { prodId, quantity, size } = req.body;

    const addedQuantity = parseInt(quantity);

    let user = req.session.userData;
    console.log(user);
    let response = await cartHelper.addToUserCart(
      user._id,
      prodId,
      addedQuantity,
      size
    );
    console.log("1");
    if (response) {
      console.log("2");
      cartCount = await cartHelper.getCartCount(user._id);
      console.log(cartCount);
      res
        .status(202)
        .json({ status: "true", message: "product added to cart" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).render("user/404");
  }
};

const removeFromCart = (req, res) => {
  try {
    let cartId = req.body.cartId;
    let productId = req.params.id;
    let size = req.body.size;
    console.log(`cartId: ${cartId}`);
    console.log(`productId: ${productId}`);
    console.log(`size: ${size}`);
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
    console.log(userId);
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
    console.log("inside incDecQuantity");
    console.log(
      req.body.productId +
        " " +
        req.body.cartId +
        " " +
        req.body.quantity +
        " " +
        req.body.selectedSize
    );

    let user = req.session.userData;
    let productId = req.body.productId;
    let quantity = req.body.quantity;
    let cartId = req.body.cartId;
    let selectedSize = req.body.selectedSize;

    // Call getMaxQuantityForUser to get the updated quantity and existing quantity
    let { quantity: maxQuantityAllowed, existingQuantity } =
      await cartHelper.getMaxQuantityForUser(
        user._id,
        selectedSize,
        productId,
        quantity
      );

    console.log(maxQuantityAllowed);
    console.log(existingQuantity);
    console.log("end of maxquantity");

    // Check if the total quantity exceeds the maximum allowed
    if (maxQuantityAllowed > 5) {
      throw new Error("Exceeds maximum quantity allowed");
    }

    // Increment or decrement the product quantity
    let newQuantity = await cartHelper.incDecProductQuantity(
      user._id,
      productId,
      quantity,
      selectedSize,
      maxQuantityAllowed
    );

    // Update the cart item total
    const totSinglePro = await cartHelper.updateCartItemTotal(
      cartId,
      productId,
      newQuantity,
      selectedSize
    );

    // Retrieve all cart items
    let cartItems = await cartHelper.getAllCartItems(user._id);

    // Calculate the total subtotal
    let totalAmount = await cartHelper.totalSubtotal(user._id, cartItems);
    totalAmount = totalAmount.toLocaleString("en-in", {
      style: "currency",
      currency: "INR",
    });

    // Prepare the response object
    const response = {
      quantity: newQuantity,
      totalAmount: totalAmount,
      totSinglePro: totSinglePro,
    };

    // Send the response
    res.status(202).json(response);
  } catch (error) {
    console.log(error);
    res.status(500).render("user/404");
  }
};

module.exports = {
  userCart,
  addToCart,
  removeFromCart,
  clearCart,
  incDecQuantity,
};
