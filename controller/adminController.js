const User = require("../model/userModel");
const Order = require("../model/orderModel");
const Product = require("../model/productModel");
const Category = require("../model/categoryModel");
const orderHelper = require("../helper/orderHelper");
const bcrypt = require("bcryptjs");
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
    if (req.session.admin) {
      const salesDetails = await orderHelper.getAllDeliveredOrders();
      let totalOrderAmount = 0;
      for (const order of salesDetails) {
        console.log("order.totalAmount:", order.totalAmount);
        totalOrderAmount += order.totalAmount;
      }
      console.log(totalOrderAmount);
      console.log(salesDetails);
      const products = await Product.find();
      const categories = await Category.find();
      const topSellingProducts = await Order.aggregate([
        { $unwind: "$orderedItems" },
        {
          $group: {
            _id: "$orderedItems.product",
            totalQuantity: { $sum: "$orderedItems.quantity" },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
      ]);
      const productIds = topSellingProducts.map((product) =>
        product._id.toString()
      );
      const productsData = await Product.find(
        { _id: { $in: productIds } },
        { productName: 1, productImage: 1 }
      );
      const topSellingCategories = await Order.aggregate([
        { $unwind: "$orderedItems" },
        {
          $lookup: {
            from: "products",
            localField: "orderedItems.product",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $lookup: {
            from: "categories",
            localField: "product.category",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
        {
          $group: {
            _id: "$category._id",
            categoryName: { $first: "$category.name" },
            totalQuantity: { $sum: "$orderedItems.quantity" },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
      ]);
      const categoryIds = topSellingCategories.map((category) => category._id);
      const topSellingCategoriesData = await Category.find({
        _id: { $in: categoryIds },
      });
      // Count of delivered orders
      const deliveredOrdersCount = await Order.countDocuments({
        orderStatus: "delivered",
      });
      console.log(deliveredOrdersCount);
      console.log("salesDetails", salesDetails);
      res.render("adminView/admin-index", {
        salesDetails: salesDetails,
        totalOrderAmount:totalOrderAmount,
        products: products,
        categories: categories,
        productsData: productsData,
        topSellingCategories: topSellingCategoriesData,
        topSellingProducts: topSellingProducts,
        deliveredOrdersCount: deliveredOrdersCount,
      });
    } else {
      res.render("admin/login");
    }
  } catch (error) {
    throw new Error("dashboard rendering failed");
  }
};

const showChart = async (req, res) => {
  try {
    if (req.body.msg) {
      const monthlySalesData = await Order.aggregate([
        {
          $match: { orderStatus: "delivered" },
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            totalAmount: { $sum: "$totalAmount" },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);
      const dailySalesData = await Order.aggregate([
        {
          $match: { orderStatus: "delivered" },
        },
        {
          $group: {
            _id: { $dayOfMonth: "$createdAt" },
            totalAmount: { $sum: "$totalAmount" },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);
      const yearlySalesData = await Order.aggregate([
        {
          $match: { orderStatus: "delivered" },
        },
        {
          $group: {
            _id: { $year: "$createdAt" },
            totalAmount: { $sum: "$totalAmount" },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);
      const orderStatuses = await Order.aggregate([
        {
          $unwind: "$orderedItems",
        },
        {
          $group: {
            _id: "$orderedItems.orderStat",
            count: { $sum: 1 },
          },
        },
      ]);
      const eachOrderStatusCount = {};
      orderStatuses.forEach((status) => {
        eachOrderStatusCount[status._id] = status.count;
      });
      console.log(monthlySalesData);
      console.log(yearlySalesData);
      console.log(dailySalesData);
      console.log(orderStatuses);
      console.log(eachOrderStatusCount);
      res.status(200).json({
        monthlySalesData,
        dailySalesData,
        eachOrderStatusCount,
        yearlySalesData,
      });
    }
  } catch (error) {
    console.log(error);
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
        res.status(200).send("Login successful");
      } else {
        console.log("Password is not correct");
        res.status(401).send("Incorrect password");
      }
    } else {
      console.log("He's not an admin");
      res.status(401).send("Not an admin");
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal server error");
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
    console.log("salesReportPage triggered");
    const sales = await orderHelper.getAllDeliveredOrders();
    console.log("sales : ", sales);
    // const deliveredOrders = await Order.find({ orderStatus: "delivered" });
    const count = sales.length;
    console.log(count);
    let totalOrderAmount = 0;
    let totalDiscountAmount = 0;
    for (const order of sales) {
      console.log("order.totalAmount:", order.totalAmount);
      console.log("order.couponAmount:", order.couponAmount);
      totalOrderAmount += order.totalAmount;
      if (order.couponAmount !== undefined) {
        totalDiscountAmount += order.couponAmount;
      }
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
    const sales = await orderHelper.getAllDeliveredOrdersByDate(
      startDate,
      endDate
    );
    console.log("sales : ", sales);
    // const deliveredOrders = await Order.find({ orderStatus: "delivered" });
    const count = sales.length;
    console.log(count);
    let totalOrderAmount = 0;
    let totalDiscountAmount = 0;
    for (const order of sales) {
      console.log("order.couponAmount:", order.couponAmount);
      totalOrderAmount += order.totalAmount;
      totalDiscountAmount += order.couponAmount;
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

    res.status(200).json({
      sales,
      count,
      totalOrderAmount,
      totalDiscountAmount,
    });
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
  showChart,
};
