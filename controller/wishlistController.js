const cartHelper = require("../helper/cartHelper");
const wishlistHelper = require("../helper/wishlistHelper");
const productHelper = require("../helper/productHelper");

const viewWishlist = async (req, res) => {
  try {
    console.log("viewWishList triggered");
    let userId = req.session.userData._id;
    let wishlist = await wishlistHelper.getAllWishlistProducts(userId);
    console.log(wishlist);
    cartCount = await cartHelper.getCartCount(userId);
    wishListCount = await wishlistHelper.getWishListCount(userId);

    let stocks = [];
    for (let i = 0; i < wishlist.length; i++) {
      let stock = await productHelper.stockStatus(
        wishlist[i].product._id,
        wishlist[i].size
      );
      console.log(stock);
      let isInCart = await cartHelper.isAProductInCart(
        userId,
        wishlist[i].product._id
      );
      stocks.push(stock);
      wishlist[i].isInCart = isInCart;
      console.log(isInCart);
    }

    res.render("userView/wishlist", {
      loginStatus: req.session.user,
      wishlist: wishlist,
      cartCount,
      wishListCount,
      stocks,
    });
  } catch (error) {
    console.error(error);
    res.status(500).render("user/404");
  }
};

const addToWishlist = async (req, res) => {
  try {
    console.log("addToWishlist triggered");
    let { size, quantity, prodId } = req.body;
    const userId = req.session.userData._id;
    console.log(`Size: ${size}, Quantity: ${quantity}, Product ID: ${prodId}`);
    let result = await wishlistHelper.addItemToWishlist(prodId, userId, size);
    console.log(result);
    res.json({
      status: "true",
      message: "Item added to wishlist successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "false",
      message: "Error occurred while adding item to wishlist",
    });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    console.log("removeFromWishlist triggered");
    let userId = req.session.userData._id;
    let productId = req.body.productId;
    console.log(productId);
    await wishlistHelper.removeProductFromWishlist(userId, productId);
    wishlistCount = await wishlistHelper.getWishListCount(userId);
    res
      .status(200)
      .json({ message: "item removed from the wishlist", wishlistCount });
  } catch (error) {
    console.error("Error in removeFromWishlist:", error);
    // Send error message from helper code to frontend
    res.status(500).json({ status: "false", message: error.message });
  }
};

module.exports = {
  viewWishlist,
  addToWishlist,
  removeFromWishlist,
};
