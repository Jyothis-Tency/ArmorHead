const User = require("../model/userModel");
const Order = require("../model/orderModel");
const orderHelper = require("../helper/orderHelper");
const bcrypt = require("bcrypt");
const PDFDocument = require("pdfkit");
function currencyFormat(amount) {
  return Number(amount).toLocaleString("en-in", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  });
}
function dateFormat(date) {
  return date.toISOString().slice(0, 10);
}

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

const salesReportPage = async (req, res) => {
  try {
    // console.log('salesreportpage');
    const sales = await orderHelper.getAllDeliveredOrders();
    console.log(sales);
    // const deliveredOrders = await Order.find({ orderStatus: "delivered" });
    const count = sales.length;
    console.log(count);
    let totalOrderAmount = 0;
    let totalDiscountAmount = 0;
    for (const order of sales) {
      totalOrderAmount += order.productDetails[0].salePrice;
      totalDiscountAmount += order.totalDiscount + order.couponAmount;
    }
    console.log(totalOrderAmount);
    console.log(totalDiscountAmount);
    sales.forEach((order) => {
      const orderDate = new Date(order.orderDate);
      const formattedDate = orderDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      order.orderDate = formattedDate;
    });
    res.render("adminView/salesReport", {
      sales,
      count,
      totalOrderAmount,
      totalDiscountAmount,
    });
  } catch (error) {
    throw error;
  }
};

const salesReport = async (req, res) => {
  try {
    console.log("salesReport triggered");
    let { startDate, endDate } = req.body;
    console.log(startDate);
    console.log(endDate);
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    console.log(startDate);
    console.log(endDate);
    const salesReport = await orderHelper.getAllDeliveredOrdersByDate(
      startDate,
      endDate
    );
    for (let i = 0; i < salesReport.length; i++) {
      salesReport[i].orderDate = dateFormat(salesReport[i].orderDate);
      salesReport[i].totalAmount = currencyFormat(salesReport[i].totalAmount);
    }
    console.log("salesReport");
    console.log(salesReport);
    res.status(200).json({ sales: salesReport });
  } catch (error) {
    throw error;
  }
};

module.exports = {
  renderAdmin,
  verifyLogin,
  getLoginPage,
  getLogout,
  salesReportPage,
  salesReport,
};
