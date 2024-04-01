const User = require("../model/userModel");
// const Coupon = require("../model/couponSchema");
const bcrypt = require("bcrypt");
// const Order = require("../models/orderSchema");

const PDFDocument = require("pdfkit");

const renderAdmin = async (req, res) => {
  try {
    console.log("renderAdmin triggered");
    res.render("adminView/admin-index");
  } catch (error) {
    console.error(error);
  }
};

const getLoginPage = async (req, res) => {
  try {
    console.log("getLoginPage triggered");
    res.render("adminView/admin-login");
  } catch (error) {
    console.log(error.message);
  }
};

const verifyLogin = async (req, res) => {
  try {
    console.log("verifyLogin triggered");
    const { email, password } = req.body;
    console.log(email);

    const findAdmin = await User.findOne({ email, isAdmin: "1" });
    // console.log("admin data : ", findAdmin);

    if (findAdmin) {
      const passwordMatch = await bcrypt.compare(password, findAdmin.password);
      if (passwordMatch) {
        req.session.admin = true;
        console.log("Admin Logged In");
        res.redirect("/admin");
      } else {
        console.log("Password is not correct");
        res.redirect("/admin/login");
      }
    } else {
      console.log("He's not an admin");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const getLogout = async (req, res) => {
  try {
    console.log("getLogout triggered");
    req.session.admin = null;
    res.redirect("/admin/login");
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  renderAdmin,
  verifyLogin,
  getLoginPage,
  getLogout,
};