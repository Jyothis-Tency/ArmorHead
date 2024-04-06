const User = require("../model/userModel");
const Product = require("../model/productModel");
const Address = require("../model/addressModel");
const Order = require("../model/orderModel");
const Category = require("../model/categoryModel");
const bcrypt = require("bcrypt");
const otpHelper = require("../helper/otpHelper");
const passwordHelper = require("../helper/passwordHelper");
const addressHelper = require("../helper/addressHelper");
const cartHelper = require("../helper/cartHelper");
const orderHelper = require("../helper/orderHelper");
const dateFormatHelper = require("../helper/dateFormatHelper");
const nodemailer = require("nodemailer");
const email2 = "jyothisgtency@gmail.com";
const mongoose = require("mongoose");

const renderHome = async (req, res) => {
  try {
    console.log("renderHome triggered");
    const userNow = req.session.userData;
    const products = await Product.find();
    res.render("userView/index-main", { user: userNow, products });
  } catch (err) {
    console.error(err);
  }
};

const userSignupGet = async (req, res) => {
  try {
    console.log("userSignupGet triggered");
    const message = req.flash("message");
    res.render("userView/register");
  } catch (err) {
    console.error(err);
  }
};

const userSignupPost = async (req, res) => {
  try {
    console.log("userSignupPost triggered");
    console.log(req.body);
    const { username, email, phone, password } = req.body;
    req.session.userData = { username, email, phone, password };
    // let email = req.body.email;
    const findUser = await User.findOne({ email });
    if (!findUser) {
      var otp = await otpHelper.generateOtp();
      req.session.userOtp = otp;
      console.log(otp);
      var transporter = nodemailer.createTransport({
        service: "gmail",
        secure: false,
        requireTLS: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
      console.log("1");

      const info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: [email, email2],
        subject: "Sending Email using Node.js",
        text: `Your OTP is ${otp}`,
      });

      if (info) {
        req.session.userOtp = otp;
        // req.session.userData = req.body;
        console.log("inside info");
        res.render("userView/verify-otp", { email });
        console.log("Email sent", info.messageId);
        // const newUser = await User.create(req.body);
      } else {
        res.json("email-error");
      }
    } else {
      res.redirect("/login");
      console.log("User already exist");
    }
  } catch (error) {
    console.log(error);
  }
};

const otpVerifyGet = async (req, res) => {
  try {
    console.log("otpVerifyGet triggered");
    res.render("userView/verify-otp");
  } catch (err) {
    console.error(err);
    //  res.status(500).render("error", { err, layout: false });
  }
};

const otpVerifyPost = async (req, res) => {
  try {
    console.log("otpVerifyPost triggered");
    console.log("first");
    const { otp } = req.body;
    const storedOtp = req.session.userOtp;
    const userData = req.session.userData;
    console.log(userData.password);

    console.log(`${otp}, ${storedOtp}`);
    console.log(userData);

    if (otp === storedOtp) {
      const hashedPassword = await passwordHelper.securePassword(
        userData.password
      );
      console.log(hashedPassword);
      const newUser = new User({
        username: userData.username,
        email: userData.email,
        phone: userData.phone,
        password: hashedPassword,
      });

      await newUser.save();

      console.log(`this is newUser - ${newUser}`);

      delete req.session.userOtp;
      delete req.session.userData;

      console.log("OTP verification successful");
      console.log("Data stored in database");

      res.redirect("/login");
    }
  } catch (error) {
    console.error(error);
  }
};

const userLoginGet = async (req, res) => {
  try {
    console.log("userLoginGet triggered");
    res.render("userView/login");
  } catch (err) {
    console.error(err);
  }
};

const userLoginPost = async (req, res) => {
  try {
    console.log("userLoginPost triggered");

    console.log(req.body);

    let curEmail = req.body.email;
    let curPassword = req.body.password;

    console.log(curEmail, curPassword);

    const checkUser = await User.findOne({ email: curEmail });
    console.log(checkUser);
    req.session.userData = checkUser;
    if (checkUser) {
      const passwordTrue = await bcrypt.compare(
        curPassword,
        checkUser.password
      );

      console.log(passwordTrue);

      if (passwordTrue) {
        req.session.userData = checkUser;
        console.log("Authentication successful");
        console.log("user logged in");
        res.redirect("/");
      } else {
        console.log("password incorrect");
        res.redirect("/login");
      }
    } else {
      console.log("user not found");
      res.redirect("/login");
    }
  } catch (error) {
    console.error(error);
  }
};

const userProfile = async (req, res) => {
  try {
    console.log("userProfile triggered");
    let userId = req.session.userData._id;
    console.log(userId);
    let userAddress = await addressHelper.findAnAddress(userId);
    console.log(userAddress);
    let userOrders = await orderHelper.getOrderDetails(userId);
    console.log(userOrders);
    // let userOrders = await Order.find({ user: userId });
    // cartCount = await cartHelper.getCartCount(userId);
    // wishListCount = await wishlistHelper.getWishListCount(userId)
    // let walletDetails = await walletHelper.getWalletAmount(userId)
    let allAddress = await addressHelper.findAllAddress(userId);
    res.render("userView/profile", {
      loginStatus: req.session.userData,
      allAddress: allAddress,
      userAddress: userAddress,
      userOrders: userOrders,
      formatDate: dateFormatHelper.formatDate,
    });
  } catch (error) {
    console.error(error);
    // res.status(500).render('user/404');
  }
};

const addAddress = async (req, res) => {
  try {
    // console.log('1');
    // console.log(req.body);
    addressHelper.addAddress(req.body, req.session.userData).then((result) => {
      res.status(202).json({ message: "address added successfully" });
    });
    // console.log('4');
  } catch (error) {
    res.status(500).render("user/404");
  }
};

const getForgotPassPage = async (req, res) => {
  try {
    console.log("getForgotPassPage triggered");
    res.render("userView/forgot-password");
  } catch (error) {
    console.log(error.message);
  }
};

const postVerifyEmail = async (req, res) => {
  try {
    console.log("postVerifyEmail triggered");
    const { email } = req.body;

    // Check if the email is provided
    if (!email) {
      return res
        .status(400)
        .render("userView/forgot-password", { message: "Email is required" });
    }

    // Check if a user with the provided email exists
    const findUser = await User.findOne({ email });

    if (!findUser) {
      return res.status(404).render("userView/forgot-password", {
        message: "User with this email does not exist",
      });
    }

    // Generate OTP
    const otp = await otpHelper.generateOtp();
    console.log(otp);

    // Send OTP via email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: [email, email2],
      subject: "Verify Your Account ✔",
      text: `Your OTP is ${otp}`,
      html: `<b><h4>Your OTP: ${otp}</h4><br><a href="">Click here to verify</a></b>`,
    });

    if (!info) {
      throw new Error("Failed to send OTP email");
    }

    // Store OTP and user email in session
    req.session.userOtp = otp;
    req.session.email = email;

    // Render OTP verification page
    res.render("userView/forgotPass-otp");

    console.log("Email sent successfully", info.messageId);
  } catch (error) {
    console.error("Error in forgotEmailValid:", error.message);
    res.status(500).render("userView/forgot-password", {
      message: "An error occurred while processing your request",
    });
  }
};

const verifyForgotPassOtp = async (req, res) => {
  try {
    console.log("verifyForgotPassOtp triggered");
    console.log(req.body.otp);
    const enteredOtp = req.body.otp;
    if (enteredOtp === req.session.userOtp) {
      res.render("userView/reset-password.ejs");
    } else {
      console.log("password not reset");
      res.json({ status: false });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const postNewPassword = async (req, res) => {
  try {
    console.log("postNewPassword triggered");
    const { newPass } = req.body;
    const email = req.session.email;
    console.log(email);
    console.log(newPass);
    if (newPass) {
      console.log("1");
      const passwordHash = await passwordHelper.securePassword(newPass);
      await User.updateOne(
        { email: email },
        {
          $set: {
            password: passwordHash,
          },
        }
      ).then((data) => console.log(data));
      res.redirect("/login");
    } else {
      console.log("Password not match");
      res.render("/user/reset-password", { message: "Password not matching" });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const resendOtp = async (req, res) => {
  try {
    console.log("resendOtp triggered");
    if (req.session.userData.email) {
      const email = req.session.userData.email;
      console.log(email);
      var newOtp = await otpHelper.generateOtp();
      console.log(newOtp);

      const transporter = nodemailer.createTransport({
        service: "gmail",
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      const info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: [email, email2],
        subject: "Resend OTP ✔",
        text: `Your new OTP is ${newOtp}`,
        html: `<b><h4>Your new OTP is ${newOtp}</h4><br><a href="">Click here</a></b>`,
      });

      if (info) {
        req.session.userOtp = newOtp;
        res.json({ success: true, message: "OTP resent successfully" });
        console.log("Email resent", info.messageId);
      } else {
        res.json({ success: false, message: "Failed to resend OTP" });
      }
    } else {
      res.json({
        success: false,
        message: "User data is undefined or missing email",
      });
    }
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: "Error in resending OTP" });
  }
};

const cancelOrder = async (req, res) => {
  try {
    console.log("inside cancel order");
    const { orderId } = req.body;
    console.log("Order ID:", orderId);
    console.log("Is Order ID valid?", mongoose.Types.ObjectId.isValid(orderId));

    // Find the order where any orderedItem has the specified orderId
    const order = await Order.findOne({
      "orderedItems.orderId": new mongoose.Types.ObjectId(orderId),
    });

    if (!order) {
      return res
        .status(404)
        .json({ error: "No order found with the specified orderId" });
    }

    // Find the index of the ordered item with the specified orderId
    const orderedItemIndex = order.orderedItems.findIndex((item) =>
      item.orderId.equals(orderId)
    );

    // Check if the ordered item exists and its order status is "confirmed"
    if (
      orderedItemIndex !== -1 &&
      order.orderedItems[orderedItemIndex].orderStat === "confirmed"
    ) {
      // Update the order status to "cancelled"
      order.orderedItems[orderedItemIndex].orderStat = "cancelled";

      // Save the updated order
      await order.save();

      // Send success message to front end AJAX
      return res
        .status(200)
        .json({ message: "Order cancelled successfully", order });
    } else {
      return res.status(400).json({ error: "Order cannot be cancelled" });
    }
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const returnOrder = async (req, res) => {
  try {
    console.log("returnOrder triggered");
    const { orderId } = req.body;
    const order = await Order.findOne({
      "orderedItems.orderId": new mongoose.Types.ObjectId(orderId),
    });
    console.log(order);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderedItemIndex = order.orderedItems.findIndex((item) =>
      item.orderId.equals(orderId)
    );

    console.log(orderedItemIndex);

    // Check if the ordered item exists and its order status is "confirmed"
    if (
      orderedItemIndex !== -1 &&
      order.orderedItems[orderedItemIndex].orderStat === "delivered"
    ) {
      // Update the order status to "cancelled"
      order.orderedItems[orderedItemIndex].orderStat = "returned";

      // Save the updated order
      await order.save();

      // Iterate through ordered items and update product quantities
      for (const item of order.orderedItems) {
        const product = await Product.findById(item.product);
        if (!product) {
          console.error(`Product not found for item: ${item}`);
          continue;
        }
        if (!product.productSizes || !Array.isArray(product.productSizes)) {
          console.error(
            `Product sizes not defined or not an array for product: ${product}`
          );
          continue;
        }
        const sizeIndex = product.productSizes.findIndex(
          (size) => size.size === item.size
        );
        if (sizeIndex !== -1) {
          // Increase product quantity by the returned item quantity
          product.productSizes[sizeIndex].quantity += item.quantity;
          product.totalQuantity += item.quantity; // Update total quantity
          await product.save();
        } else {
          console.error(`Size ${item.size} not found for product: ${product}`);
        }
      }

      return res.status(200).json({ message: "Order returned successfully" });
    } else {
      return res.status(400).json({ error: "Order cannot be returned" });
    }
  } catch (error) {
    console.error("Error returning order:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const editAddressPage = async (req, res) => {
  try {
    console.log("editAddressPage triggered");
    const userId = req.session.userData._id;
    const addressId = req.params.addressId; // Get addressId from req.body

    console.log(addressId);
    // Define and execute the findAnAddress function to fetch the user's address details
    const {
      firstName,
      lastName,
      house,
      locality,
      city,
      state,
      pincode,
      country,
      email,
      phone,
    } = await Address.findOne({ _id: addressId }); // Use _id for matching

    console.log(firstName); // Check if destructuring worked

    res.render("userView/editAddress-page", {
      // Pass the destructured variables as an object to the render function
      firstName,
      lastName,
      house,
      locality,
      city,
      state,
      pincode,
      country,
      email,
      phone,
    });
  } catch (error) {
    console.error(error);
    res.status(500).render("user/404");
  }
};

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.addressId; // Get addressId from request params

    // Delete the address using MongoDB's deleteOne method
    await Address.deleteOne({ _id: addressId });

    // Send a success response if the deletion was successful
    console.log("address deleted successfully");
  } catch (error) {
    // Handle errors if any
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



module.exports = {
  renderHome,
  userSignupGet,
  userSignupPost,
  otpVerifyGet,
  otpVerifyPost,
  userLoginGet,
  userLoginPost,
  userProfile,
  addAddress,
  getForgotPassPage,
  postVerifyEmail,
  verifyForgotPassOtp,
  postNewPassword,
  resendOtp,
  cancelOrder,
  returnOrder,
  editAddressPage,
  deleteAddress,
};
