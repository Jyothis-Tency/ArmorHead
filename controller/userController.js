const User = require("../model/userModel");
const Product = require("../model/productModel");
const Address = require("../model/addressModel");
const Order = require("../model/orderModel");
const Wallet = require("../model/walletModel");
const bcrypt = require("bcryptjs");
const otpHelper = require("../helper/otpHelper");
const passwordHelper = require("../helper/passwordHelper");
const addressHelper = require("../helper/addressHelper");
const orderHelper = require("../helper/orderHelper");
const referralHelper = require("../helper/referralHelper");
const dateFormatHelper = require("../helper/dateFormatHelper");
const nodemailer = require("nodemailer");
const email2 = "jyothisgtency@gmail.com";
const mongoose = require("mongoose");

const renderHome = async (req, res) => {
  try {
    console.log("renderHome triggered");
    const userNow = req.session.userData;
    console.log(req.session.userData);
    const products = await Product.find().sort({ createdOn: -1 }).limit(4);
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
    const { username, email, phone, password, rePassword, referral } = req.body;
    req.session.referral = referral;
    req.session.userData = { username, email, phone, password };
    console.log(req.session.userData);
    const findUser = await User.findOne({ email });
    console.log(findUser);
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
        console.log("inside info");
        res.status(200).json({ success: true, message: "Into otp-verify" });
      } else {
        res.status(500).json({ message: "Failed to send OTP" }); // Send JSON error response
      }
    } else {
      // If user already exists, send a response to the front end
      res.status(409).json({ message: "User already exists" }); // Send JSON response with 409 status code
      console.log("User already exists");
    }
  } catch (error) {
    console.log(error);
    res.render("userView/404");
  }
};

const otpVerifyGet = async (req, res) => {
  try {
    console.log("otpVerifyGet triggered");
    res.render("userView/verify-otp");
  } catch (err) {
    console.error(err);
  }
};

const otpVerifyPost = async (req, res) => {
  try {
    console.log("otpVerifyPost triggered");

    const { otp } = req.body;
    const storedOtp = req.session.userOtp;
    const userData = req.session.userData;

    console.log(`${otp}, ${storedOtp}`);
    console.log(userData);

    if (otp === storedOtp) {
      const hashedPassword = await passwordHelper.securePassword(
        userData.password
      );
      const referralCode = await referralHelper.generateRandomString();
      let newWalletCode;
      if (req.session.referral) {
        const existingUser = await User.findOne({
          referralCode: req.session.referral,
        });
        if (existingUser) {
          const wallet = await Wallet.findOne({ user: existingUser._id });
          if (wallet) {
            wallet.walletBalance += 50;
            wallet.history.push({
              date: new Date(),
              status: "credit",
              amount: 50,
            });
            await wallet.save();
          } else {
            const newWallet = new Wallet({
              user: existingUser._id,
              walletBalance: 50,
              history: {
                date: new Date(),
                status: "credit",
                amount: 50,
              },
            });
            await newWallet.save();
          }
        }
      }
      const newUser = new User({
        username: userData.username,
        email: userData.email,
        phone: userData.phone,
        password: hashedPassword,
        referralCode: referralCode,
      });

      await newUser.save();

      const existingUser = await User.findOne({
        referralCode: req.session.referral,
      });
      if (existingUser) {
        const newUserWallet = new Wallet({
          user: newUser._id,
          walletBalance: 50,
          history: {
            date: new Date(),
            status: "credit",
            amount: 50,
          },
        });
        await newUserWallet.save();
      } else {
        const newUserWallet = new Wallet({
          user: newUser._id,
          walletBalance: 0,
        });
        await newUserWallet.save();
      }
      // Clear the session data
      delete req.session.userOtp;
      delete req.session.userData;

      console.log("OTP verification successful");
      console.log("Data stored in database");

      // Send success response to frontend
      res.status(200).json({
        success: true,
        message: "OTP verified successfully. You are now registered.",
      });
    } else {
      console.log("Invalid OTP");

      // Send failure response to frontend
      res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }
  } catch (error) {
    console.error("Error in OTP verification:", error);

    // Send error response to frontend
    res.status(500).json({
      success: false,
      message:
        "An error occurred during OTP verification. Please try again later.",
    });
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

    const { email, password } = req.body; // Extract email and password from the request body
    console.log(email, password);

    const checkUser = await User.findOne({ email });
    if (checkUser) {
      const isPasswordCorrect = await bcrypt.compare(
        password,
        checkUser.password
      );

      if (isPasswordCorrect) {
        req.session.userData = checkUser; // Save user data in session
        console.log("Authentication successful");

        // Respond with success message
        return res.status(200).json({ message: "Login successful" });
      } else {
        console.log("Password incorrect");

        // Respond with error message
        return res.status(401).json({ message: "Invalid email or password" });
      }
    } else {
      console.log("User not found");

      // Respond with error message
      return res.status(401).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error during login:", error);

    // Respond with a server error message
    res.render("userView/404");
  }
};

const userLogout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log(err.message);
      }
      console.log("Logged out");
      res.redirect("/login");
    });
  } catch (error) {
    console.log(error.message);
  }
};

const userProfile = async (req, res) => {
  try {
    console.log("userProfile triggered");
    console.log(req.session.userData);
    let userId = req.session.userData._id;
    console.log(userId);
    let userAddress = await addressHelper.findAnAddress(userId);
    console.log(userAddress);
    let userOrders = await orderHelper.getOrderDetails(userId);
    console.log(userOrders);
    let allAddress = await addressHelper.findAllAddress(userId);
    console.log(allAddress);
    res.render("userView/profile", {
      loginStatus: req.session.userData,
      allAddress: allAddress,
      userAddress: userAddress,
      userOrders: userOrders,
      formatDate: dateFormatHelper.formatDate,
    });
  } catch (error) {
    console.error(error);
  }
};

const updateUser = async (req, res) => {
  try {
    console.log("updateUser triggered");
    console.log("req.session.userData:", req.session.userData);
    console.log(req.body);
    const { userId, username, email, phone } = req.body;
    await User.updateOne(
      { _id: userId },
      { $set: { username: username, email: email, phone: phone } }
    );
    req.session.userData.username = username;
    req.session.userData.email = email;
    req.session.userData.phone = phone;
    res.status(200).json({ message: "User Details Changed Successfully" });
  } catch (error) {
    res.status(400).json({ message: "User Details changing failed" });
  }
};

const addAddress = async (req, res) => {
  try {
    const result = await addressHelper.addAddress(
      req.body,
      req.session.userData
    );
    res
      .status(202)
      .json({ success: true, message: "Address added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
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
    console.log(req.body);
    const { email } = req.body;
    const findUser = await User.findOne({ email });
    if (!findUser) {
      return res.status(404).json({
        success: false,
        message: "User with this email does not exist",
      });
    }

    const id = findUser._id;
    const protocol = req.protocol;
    const host = req.get("host");

    const resetLink = `${protocol}://${host}/resetPassword?id=${id}`;
    console.log("resetLink:", resetLink);

    // const otp = await otpHelper.generateOtp();
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
    const info = {
      from: process.env.EMAIL_USER,
      to: [email, email2],
      subject: "RESET YOUR PASSWORD ✔",
      html: `
        <p>
          You requested a password reset. Click <a href="${resetLink}">here</a>
          to reset your password.
        </p>`,
    };

    req.session.email = email;
    transporter.sendMail(info, (err, info) => {
      if (err) {
        console.log("Error in sending link to the mail => ", err.message);
        return res.json({
          success: false,
          message: "Failed to send reset link",
        });
      }
      console.log("sendMail success");
      res.json({ success: true, message: "Link sent by email" });
    });

    // if (!info) {
    //   throw new Error("Failed to send OTP email");
    // }

    // res.json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    console.error("Error in forgotEmailValid:", error.message);
    res.status(500).send("Internal server error");
  }
};

// const getVerifyForgotPassOtp = async (req, res) => {
//   try {
//     console.log("getVerifyForgotPassOtp triggered");
//     res.render("userView/forgotPass-otp");
//   } catch (error) {
//     res.render("userView/404");
//   }
// };

// const verifyForgotPassOtp = async (req, res) => {
//   try {
//     console.log("verifyForgotPassOtp triggered");
//     console.log(req.body.otp);
//     const enteredOtp = req.body.otp;
//     if (enteredOtp === req.session.userOtp) {
//       res.render("userView/reset-password.ejs");
//     } else {
//       console.log("password not reset");
//       res.json({ status: false });
//     }
//   } catch (error) {
//     console.log(error.message);
//   }
// };

const renderNewPassword = async (req, res) => {
  try {
    console.log("renderNewPassword triggered");
    res.render("userView/reset-password.ejs");
  } catch (error) {
    res.render("userView/404.ejs");
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
      ).then((data) => console.log("data:", data));
      delete req.session.email;
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
    console.log("Inside cancel order");
    const { orderId } = req.body;
    console.log(orderId);
    // Check if the orderId is valid
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      console.log("!mongoose.Types.ObjectId.isValid(orderId)");
      return res.status(400).json({ error: "Invalid orderId" });
    }

    const order = await Order.findOne({
      "orderedItems.orderId": new mongoose.Types.ObjectId(orderId),
    });

    if (!order) {
      console.log("!order");
      return res
        .status(404)
        .json({ error: "No order found with the specified orderId" });
    }

    // Find the ordered item with the given orderId
    const orderedItemIndex = order.orderedItems.findIndex((item) =>
      item.orderId.equals(orderId)
    );

    let product;
    order.orderedItems.forEach((item) => {
      if (item.orderId.toString() === orderId) {
        product = item.product;
      }
    });
    const productIn = await Product.findOne({ _id: product });

    console.log(orderedItemIndex);

    if (
      (orderedItemIndex !== -1 &&
        order.orderedItems[orderedItemIndex].orderStat === "confirmed") ||
      order.orderedItems[orderedItemIndex].orderStat === "shipped" ||
      order.orderedItems[orderedItemIndex].orderStat === "outForDelivery"
    ) {
      console.log(
        "orderedItemIndex !== -1 && order.orderedItems[orderedItemIndex].orderStat === confirmed"
      );
      const orderedItem = order.orderedItems[orderedItemIndex];
      console.log(orderedItem);

      if (
        order.paymentMethod === "razorpay" ||
        order.paymentMethod === "wallet"
      ) {
        // Update the wallet with the totalAmount for this order
        let wallet = await Wallet.findOne({ user: req.session.userData._id });
        if (!wallet) {
          console.log("!wallet");
          wallet = new Wallet({ user: req.session.userData._id });
          await wallet.save();
        }

        console.log(order.totalAmount);
        wallet.walletBalance += orderedItem.quantity * productIn.salePrice;
        console.log("wallet.walletBalance : ", wallet.walletBalance);
        wallet.history.push({
          date: new Date(),
          status: "credit",
          amount: orderedItem.quantity * productIn.salePrice,
        });
        await wallet.save();
        console.log(wallet.walletBalance);
      }

      // Update the order item status to "cancelled"
      orderedItem.orderStat = "cancelled";
      console.log(orderedItem.orderStat);

      // Restore product stock for the cancelled item
      const product = await Product.findById(orderedItem.product);
      console.log("product:");
      console.log(product);
      if (product) {
        const sizeIndex = product.productSizes.findIndex(
          (size) => size.size === orderedItem.size
        );
        if (sizeIndex !== -1) {
          product.productSizes[sizeIndex].quantity += orderedItem.quantity;
          await product.save();
        }
      }

      await order.save();

      return res
        .status(200)
        .json({ message: "Order cancelled successfully", order });
    } else {
      return res.status(400).json({ error: "Order cannot be cancelled" });
    }
  } catch (error) {
    console.error("Error cancelling order:", error);
    return res
      .status(500)
      .json({ error: "Internal Server Error", message: error.message });
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

    if (
      orderedItemIndex !== -1 &&
      order.orderedItems[orderedItemIndex].orderStat === "delivered"
    ) {
      order.orderedItems[orderedItemIndex].orderStat = "returned";
      await order.save();
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
          product.productSizes[sizeIndex].quantity += item.quantity;
          product.totalQuantity += item.quantity;
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

const updateAddress = async (req, res) => {
  try {
    console.log("updateAddress triggered");

    // Extract user ID from session data
    let userId = req.session.userData._id;

    // Log the received data for debugging
    console.log("Request data:");
    console.log(req.body);

    // Update the address with the received form data
    await addressHelper.editAddress(req.body);

    // Retrieve the updated address information
    let addressId = req.body.addressId; // Assuming the address ID is provided in the form data
    let updatedAddress = await addressHelper.findAnAddress(addressId);

    console.log("updateAddress successful");

    // Send success response
    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      address: updatedAddress,
    });
  } catch (error) {
    console.error("Error updating address:", error);

    // Send failure response in case of error
    res.status(500).json({
      success: false,
      message: "Failed to update address",
    });
  }
};

const deleteAddress = async (req, res) => {
  try {
    console.log("deleteAddress triggered");
    const addressId = req.params.addressId;
    console.log(addressId);
    await Address.deleteOne({ _id: addressId });
    console.log("Address deleted successfully");
    // Send a success response
    res
      .status(200)
      .json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    console.error(error);
    // Send an error response
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const filterPrice = async (req, res) => {
  try {
    const { minPrice, maxPrice } = req.body; // Retrieve values from req.body
    const filteredProducts = await Product.find({
      salePrice: { $gte: minPrice, $lte: maxPrice },
    });

    res.json({ success: true, products: filteredProducts }); // Corrected the key to 'products'
  } catch (error) {
    console.error("Error filtering products:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updatePassword = async (req, res) => {
  try {
    console.log("updatePassword triggered");
    const { currentPassword, newPassword } = req.body;
    console.log(currentPassword);
    console.log(newPassword);
    if (currentPassword === newPassword) {
      return res
        .status(400)
        .json({ error: "Your new password is already in use" });
    }

    // Retrieve the user from the database
    const user = await User.findById(req.session.userData._id); // Assuming you have implemented authentication middleware to set req.user

    // Verify if the current password matches the one stored in the database
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid current password" });
    }

    const hashedPassword = await passwordHelper.securePassword(newPassword);

    // Update the user's password in the database
    user.password = hashedPassword;
    await user.save();
    console.log("2");
    // Send a success response
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const changePasswordPage = async (req, res) => {
  try {
    console.log("changePasswordPage triggered");
    res.render("userView/changePassword");
  } catch (error) {
    console.log(error);
  }
};

const addressPage = async (req, res) => {
  try {
    console.log("addressPage triggered");
    let userId = req.session.userData._id;
    let userAddress = await addressHelper.findAnAddress(userId);
    console.log("userAddress : ", userAddress);
    let allAddress = await addressHelper.findAllAddress(userId);
    console.log("allAddress : ", allAddress);
    res.render("userView/address", { allAddress, userAddress });
  } catch (error) {
    console.log(error);
    res.render("userView/404");
  }
};

const conformReturnMessage = async (req, res) => {
  try {
    console.log("conformReturnMessage triggered");

    const orderId = req.body.orderId;
    const returnReason = req.body.returnReason;
    const additionalReason = req.body.additionalReason;
    console.log(orderId, returnReason, additionalReason);

    const findOrder = await Order.find({
      "orderedItems.orderId": new mongoose.Types.ObjectId(orderId),
    });

    console.log(findOrder);

    const returnConfirm = await Order.updateMany(
      { "orderedItems.orderId": new mongoose.Types.ObjectId(orderId) }, // Match order by orderedItems.orderId
      {
        $set: {
          "returnProducts.status": true, // Update at the top level
          "returnProducts.returnReason": returnReason,
          "returnProducts.returnMessage": additionalReason,
          "orderedItems.$[elem].returnPro.status": true,
          "orderedItems.$[elem].returnPro.returnReason": returnReason,
          "orderedItems.$[elem].returnPro.returnMessage": additionalReason,
        },
      },
      {
        arrayFilters: [
          { "elem.orderId": new mongoose.Types.ObjectId(orderId) },
        ],
      }
    );

    // Check if any documents were modified
    if (returnConfirm.modifiedCount === 0) {
      console.log("returnConfirm.modifiedCount === 0");
      return res.status(404).json({
        success: false,
        message: "Order not found or no changes made",
      });
    }

    res.status(200).json({
      success: true,
      message: "Wait for the confirmation",
    });
  } catch (error) {
    console.log("eroor");
    res.status(500).json({
      success: false,
      message: "Failed to send return confirmation",
    });
  }
};

module.exports = { filterPrice }; // Export the function

module.exports = {
  renderHome,
  userSignupGet,
  userSignupPost,
  otpVerifyGet,
  otpVerifyPost,
  userLoginGet,
  userLoginPost,
  userLogout,
  userProfile,
  updateUser,
  addAddress,
  getForgotPassPage,
  postVerifyEmail,
  renderNewPassword,
  postNewPassword,
  resendOtp,
  cancelOrder,
  returnOrder,
  updateAddress,
  deleteAddress,
  filterPrice,
  updatePassword,
  changePasswordPage,
  addressPage,
  conformReturnMessage,
};
