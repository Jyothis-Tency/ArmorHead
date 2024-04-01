const User = require("../model/userModel");
const Product = require("../model/productModel");
const Category = require("../model/categoryModel");
const bcrypt = require("bcrypt");
const otpHelper = require("../helper/otpHelper");
const passwordHelper = require("../helper/passwordHelper");
const nodemailer = require("nodemailer");
const email2 = "jyothisgtency@gmail.com";

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
    req.session.userData = checkUser
    if (checkUser) {
      const passwordTrue = await bcrypt.compare(
        curPassword,
        checkUser.password
      );

      console.log(passwordTrue);

      if (passwordTrue) {
        req.session.userData = checkUser
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
    res.render("userView/profile")
  } catch (error) {
    console.error(error);
  }
}

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
        .render("adminView/forgot-password", { message: "Email is required" });
    }

    // Check if a user with the provided email exists
    const findUser = await User.findOne({ email });

    if (!findUser) {
      return res.status(404).render("adminView/forgot-password", {
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
    res.status(500).render("forgot-password", {
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

module.exports = {
  renderHome,
  userSignupGet,
  userSignupPost,
  otpVerifyGet,
  otpVerifyPost,
  userLoginGet,
  userLoginPost,
  userProfile,
  getForgotPassPage,
  postVerifyEmail,
  verifyForgotPassOtp,
  postNewPassword,
  resendOtp,
};
 