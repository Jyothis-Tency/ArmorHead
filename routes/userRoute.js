const express = require("express");
const userRoute = express();
const userController = require("../controller/userController");
const productController = require("../controller/productController");
const cartController = require("../controller/cartController");
const orderController = require("../controller/orderController");
const wishlistController = require("../controller/wishlistController");
const couponController = require("../controller/couponController");
const walletController = require("../controller/walletController");
const razorpay = require("../middleware/razorpay");
const { isLoggedIn } = require("../authentication/authentify");

// User actions
userRoute.get("/", userController.renderHome);
userRoute.get("/signup", userController.userSignupGet);
userRoute.post("/signup", userController.userSignupPost);
userRoute.get("/verify-otp", userController.otpVerifyGet);
userRoute.post("/verify-otp", userController.otpVerifyPost);
userRoute.post("/resendOtp", userController.resendOtp);
userRoute.get("/login", userController.userLoginGet);
userRoute.post("/login", userController.userLoginPost);
userRoute.get("/logout", userController.userLogout);
userRoute.get("/profile", isLoggedIn, userController.userProfile);
userRoute.get("/changePassword", isLoggedIn, userController.changePasswordPage);
userRoute.get("/forgotPassword", userController.getForgotPassPage);
userRoute.post("/forgotPassword", userController.postVerifyEmail);
userRoute.post("/verifyPassOtp", userController.verifyForgotPassOtp);
userRoute.post("/resetPassword", userController.postNewPassword);

// Profile Routes
userRoute.get("/user-profile", isLoggedIn, userController.userProfile);
userRoute.post("/add-address", isLoggedIn, userController.addAddress);
userRoute.post("/cancel-order", isLoggedIn, userController.cancelOrder);
userRoute.post("/conformReturn",isLoggedIn,userController.conformReturnMessage);
userRoute.post("/return-order", isLoggedIn, userController.returnOrder);
userRoute.get("/address", isLoggedIn, userController.addressPage);
userRoute.post("/updateAddress", isLoggedIn, userController.updateAddress);
userRoute.delete(
  "/deleteAddress/:addressId",
  isLoggedIn,
  userController.deleteAddress
);
userRoute.post("/change-password", isLoggedIn, userController.updatePassword);

// Products Routes
userRoute.get("/productDetails/:id", productController.getProductDetailsPage);
userRoute.get("/shopPage", productController.getShopPage);
userRoute.get("/search-product", productController.searchProduct);
userRoute.post("/filter-price", userController.filterPrice);
userRoute.get("/filter", productController.filterProduct);

// WishList Route
userRoute.get("/wishlist", isLoggedIn, wishlistController.viewWishlist);
userRoute.post("/addToWishlist", wishlistController.addToWishlist);
userRoute.post(
  "/removeFromWishlist/:id",
  isLoggedIn,
  wishlistController.removeFromWishlist
);

// Cart Routes
userRoute.get("/cart", isLoggedIn, cartController.userCart);
userRoute.post("/addToCart", cartController.addToCart);
userRoute.post(
  "/remove-cart-item/:id",
  isLoggedIn,
  cartController.removeFromCart
);
userRoute.post("/quantity-change", isLoggedIn, cartController.incDecQuantity);
userRoute.post("/clear-cart", isLoggedIn, cartController.clearCart);

// Purchase Routes
userRoute.get("/checkoutPage", isLoggedIn, orderController.checkoutRender);
userRoute.post("/place-order", isLoggedIn, orderController.placeOrder);
userRoute.post("/createOrder", isLoggedIn, razorpay.createOrder);
userRoute.post("/paymentSuccess", isLoggedIn, orderController.paymentSuccess);
userRoute.post("/failedRazorpay", isLoggedIn, orderController.failedRazorpay);
userRoute.post("/second-try", isLoggedIn, orderController.secondTry);
userRoute.post("/verify-payment", isLoggedIn, orderController.verifyPayment);
userRoute.get("/order-details", isLoggedIn, orderController.orderDetailsPage);
userRoute.get("/order-success", isLoggedIn, orderController.orderSuccess);

//Coupon based routes
userRoute.post("/applyCoupon", isLoggedIn, couponController.applyCoupon);
userRoute.post("/removeCoupon", isLoggedIn, couponController.removeCoupon);

//Wallet based routes
userRoute.get("/get-wallet", isLoggedIn, walletController.getWallet);

module.exports = userRoute;
