// const User = require("../model/userModel")
// const Cart = require("../model/cartModel")
const cartHelper = require("../helper/cartHelper")
const currencyHelper = require("../helper/currencyHelper")

const userCart = async (req, res) => {
    try {
      console.log("userCart triggered");
    let user = req.session.userData;
    let allCartItems = await cartHelper.getAllCartItems(user._id);
    let cartCount = await cartHelper.getCartCount(user._id);
    // wishListCount = await wishlistHelper.getWishListCount(user._id);
    let totalAndSubTotal = await cartHelper.totalSubtotal(
      user._id,
      allCartItems
    );

    totalAndSubTotal = currencyHelper.currencyFormatter(totalAndSubTotal);

    res.render("userView/cart-page", {
      loginStatus: req.session.userData,
      allCartItems,
      cartCount,
    //   wishListCount,
      totalAmount: totalAndSubTotal,
    });
  } catch (error) {
      // res.status(500).render("error", { error, layout: false });
      console.error(`these are errors = ${error}`);
  }
};

module.exports = {
    userCart
}