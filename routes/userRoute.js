const express = require("express");
const userRoute = express();
const userController = require("../controller/userController");
const productController = require("../controller/productController")
const cartController = require("../controller/cartController")
const {isLoggedIn}=require("../authentication/authentify")

// User actions
userRoute.get("/", userController.renderHome);
userRoute.get("/signup", userController.userSignupGet);
userRoute.post("/signup", userController.userSignupPost);
userRoute.get("/verify-otp", userController.otpVerifyGet);
userRoute.post("/verify-otp", userController.otpVerifyPost);
userRoute.post("/resendOtp", userController.resendOtp);
userRoute.get("/login", userController.userLoginGet);
userRoute.post("/login", userController.userLoginPost);
userRoute.get("/profile", isLoggedIn,userController.userProfile);
userRoute.get("/forgotPassword",userController.getForgotPassPage)
userRoute.post("/forgotPassword", userController.postVerifyEmail);
userRoute.post("/verifyPassOtp", userController.verifyForgotPassOtp);
userRoute.post("/resetPassword", userController.postNewPassword);
// Products based routes
userRoute.get("/productDetails/:id", productController.getProductDetailsPage);
userRoute.get("/shopPage/:sortValue", productController.getShopPage);

// Cart
userRoute.get("/cart", isLoggedIn,cartController.userCart);
userRoute.post("/addToCart", isLoggedIn, cartController.addToCart);
userRoute.post('/remove-cart-item/:id', isLoggedIn, cartController.removeFromCart);
userRoute.post("/quantity-change",isLoggedIn,cartController.incDecQuantity)
userRoute.post("/clear-cart", isLoggedIn, cartController.clearCart);

module.exports = userRoute;
