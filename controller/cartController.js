const User = require("../model/userModel")
const Cart = require("../model/cartModel")
const Product = require("../model/productModel")
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
    let cartCount = await cartHelper.getCartCount(user._id);
    // wishListCount = await wishlistHelper.getWishListCount(user._id);
    let totalAndSubTotal = await cartHelper.totalSubtotal(
      user._id,
      allCartItems 
    );

    totalAndSubTotal = currencyFormatter(totalAndSubTotal);

    res.render("userView/cart-page", {
      loginStatus: req.session.userData,
      allCartItems,
      cartCount,
      //wishListCount,6666666666
      totalAmount: totalAndSubTotal,
    });
  } catch (error) {
    // res.status(500).render("error", { error, layout: false });
    console.error(`these are errors = ${error}`);
  }
};

const addToCart = async (req, res) => {
  try {
    // console.log('inside add to cart');
    const { prodId, quantity, size } = req.params;
    const addedQuantity = parseInt(quantity);
    console.log(req.params);
    let user = req.session.user;
    // console.log(user);
    let response = await cartHelper.addToUserCart(
      user._id,
      prodId,
      addedQuantity,
      size
    );
    // console.log('1');
    if (response) {
      // console.log('2');
      cartCount = await cartHelper.getCartCount(user._id);
      res
        .status(202)
        .json({ status: "true", message: "product added to cart" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).render("user/404");
  }
};

module.exports = {
  userCart,
  addToCart,
};
