const express = require("express");
const userRoute = express();
const userController = require("../controller/userController");
const productController = require("../controller/productController");
const cartController = require("../controller/cartController");
const orderController = require("../controller/orderController");
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
userRoute.get("/profile", isLoggedIn, userController.userProfile);
userRoute.get("/forgotPassword", userController.getForgotPassPage);
userRoute.post("/forgotPassword", userController.postVerifyEmail);
userRoute.post("/verifyPassOtp", userController.verifyForgotPassOtp);
userRoute.post("/resetPassword", userController.postNewPassword);

// Profile Routes
userRoute.get("/user-profile", isLoggedIn, userController.userProfile);
userRoute.post("/add-address", isLoggedIn, userController.addAddress);
userRoute.post("/cancel-order", isLoggedIn, userController.cancelOrder);
userRoute.post("/return-order", isLoggedIn, userController.returnOrder);
userRoute.get("/edit-address/:addressId", isLoggedIn, userController.editAddressPage);
userRoute.delete("/delete-address/:addressId", isLoggedIn, userController.deleteAddress);

// Products Routes
userRoute.get("/productDetails/:id", productController.getProductDetailsPage);
userRoute.get("/shopPage/:sortValue", productController.getShopPage);

// Cart Routes
userRoute.get("/cart", isLoggedIn, cartController.userCart);
userRoute.post("/addToCart", isLoggedIn, cartController.addToCart);
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
userRoute.get("/order-details", isLoggedIn, orderController.orderDetailsPage);

module.exports = userRoute;
