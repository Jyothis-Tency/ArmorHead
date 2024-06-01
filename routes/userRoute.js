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
const { isLoggedIn } = require("../authentication/authenticator");

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
userRoute.post("/updateUser", isLoggedIn, userController.updateUser);
userRoute.get("/changePassword", isLoggedIn, userController.changePasswordPage);
userRoute.get("/forgotPassword", userController.getForgotPassPage);
userRoute.post("/forgotPassword", userController.postVerifyEmail);
userRoute.get("/getVerifyPassOtp", userController.getVerifyForgotPassOtp);
userRoute.post("/verifyPassOtp", userController.verifyForgotPassOtp);
userRoute.post("/resetPassword", userController.postNewPassword);

// Profile Routes
userRoute.get("/user-profile", isLoggedIn, userController.userProfile);
userRoute.post("/add-address", isLoggedIn, userController.addAddress);
userRoute.post("/cancel-order", isLoggedIn, userController.cancelOrder);
userRoute.post(
  "/conformReturn",
  isLoggedIn,
  userController.conformReturnMessage
);
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
userRoute.get("/shop", productController.getShopPage);
userRoute.post("/filter-price", userController.filterPrice);

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

// Order Routes
userRoute.get("/checkoutPage", isLoggedIn, orderController.checkoutRender);
userRoute.post("/place-order", isLoggedIn, orderController.placeOrder);
userRoute.post("/createOrder", isLoggedIn, razorpay.createOrder);
userRoute.post("/paymentSuccess", isLoggedIn, orderController.paymentSuccess);
userRoute.post("/failedRazorpay", isLoggedIn, orderController.failedRazorpay);
userRoute.post("/second-try", isLoggedIn, orderController.secondTry);
userRoute.post("/verify-payment", isLoggedIn, orderController.verifyPayment);
userRoute.get("/order-details", isLoggedIn, orderController.orderDetailsList);
userRoute.get(
  "/orderDetails-page/:orderId",
  isLoggedIn,
  orderController.orderDetailsUser
);
userRoute.get("/order-success", isLoggedIn, orderController.orderSuccess);

//Coupon based routes
userRoute.post("/applyCoupon", isLoggedIn, couponController.applyCoupon);
userRoute.post("/removeCoupon", isLoggedIn, couponController.removeCoupon);

//Wallet based routes
userRoute.get("/get-wallet", isLoggedIn, walletController.getWallet);
userRoute.post("/addMoney", isLoggedIn, walletController.addMoneyToWallet);
userRoute.post("/payment-verify", isLoggedIn, walletController.verifyPayment);

module.exports = userRoute;
