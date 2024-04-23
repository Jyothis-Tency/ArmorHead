const Order = require("../model/orderModel");
const cartHelper = require("../helper/cartHelper");
const addressHelper = require("../helper/addressHelper");
const orderHelper = require("../helper/orderHelper");
const productHelper = require("../helper/productHelper");
const walletHelper = require("../helper/walletHelper")
const Wallet = require("../model/walletModel")
const mongoose = require("mongoose");

function orderDate() {
  const date = new Date();
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayOfMonth = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  let hours = date.getHours();
  let minutes = date.getMinutes();
  let seconds = date.getSeconds();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;
  const time = hours + ":" + minutes + ":" + seconds + " " + ampm;

  return `${dayOfMonth} ${month} ${year}, ${time}`;
}

const checkoutRender = async (req, res) => {
  try {
    const user = req.session.userData;
    cartCount = await cartHelper.getCartCount(user._id);
    let cartItems = await cartHelper.getAllCartItems(user._id);
    let totalAmount = await cartHelper.totalSubtotal(user._id, cartItems);
    req.session.oldTotal = totalAmount;
    if (req.session.updatedTotal) {
      totalAmount = req.session.updatedTotal;
    }
    const userAddress = await addressHelper.findAnAddress(user._id);
    let allAddress = await addressHelper.findAllAddress(user._id);
    res.render("userView/checkout-page", {
      loginStatus: req.session.userData,
      user,
      cartItems,
      totalAmount: totalAmount,
      address: userAddress,
      allAddress: allAddress,
      cartCount,
      currencyFormat: cartHelper.currencyFormat,
    });
  } catch (error) {
    console.log(error);
    res.status(500).render("user/404");
  }
};

const placeOrder = async (req, res) => {
  try {
    let userId = req.session.userData._id;
    paymentMethod = req.body.payment_method.trim().toLowerCase();
    const address = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      house: req.body.house,
      locality: req.body.locality,
      city: req.body.city,
      state: req.body.state,
      pincode: req.body.pincode,
    };

    let cartItems = await cartHelper.getAllCartItems(userId);

    if (!cartItems.length) {
      return res.json({
        error: true,
        message: "Please add items to cart before checkout",
      });
    }

    if (address === undefined) {
      return res.json({
        error: true,
        message: "Please Select any Address before checkout",
      });
    }

    if (req.body.payment_method === undefined) {
      return res.json({
        error: true,
        message: "Please Select any Payment Method before checkout",
      });
    }

    const totalAmount = await cartHelper.totalAmount(userId);
    let wallet = await Wallet.findOne({ user: userId });
    // console.log(wallet);
    if (!wallet) {
      wallet = new Wallet({ user: userId });
      await wallet.save();
    }
    const orderedDate = orderDate();

    if (paymentMethod === "cash on delivery") {
      await orderHelper
        .forOrderPlacing(req.body, totalAmount, cartItems, userId)
        .then(async (response) => {
          await productHelper.stockDecrease(cartItems);
          await cartHelper.clearTheCart(userId);
          res.render("userView/orderSuccess-page", {
            cartItems,
            orderedDate: orderedDate,
          });
        });
    } else if (paymentMethod === "wallet") {
      console.log('paymentMethod === wallet');
      let isPaymentDone = await walletHelper.payUsingWallet(
        userId,
        totalAmount
      );
      // console.log(isPaymentDone);
      if (isPaymentDone) {
        await orderHelper
          .forOrderPlacing(req.body, totalAmount, cartItems, userId, coupon)
          .then(async (orderDetails) => {
            await orderHelper.changeOrderStatus(
              orderDetails._id,
              "confirmed",
              req.body.payment_method
            );
            await productHelper.stockDecrease(cartItems);
            await cartHelper.clearTheCart(userId);
            // console.log('3');
            res
              .status(202)
              .json({ paymentMethod: "wallet", message: "Purchase Done" });
          });
      } else {
        res.status(200).json({
          paymentMethod: "wallet",
          message: "Balance Insufficient in Wallet",
        });
      }
    }
  } catch (error) {
    console.log(error);
  }
};

const orderDetailsPage = async (req, res) => {
  try {
    const userId = req.session.userData._id;
    const orderDetails = await orderHelper.getOrderDetails(userId);
    res.render("userView/orderDetails-page", { orderDetails });
  } catch (error) {
    console.error("Error in orderDetails:", error);
    res.status(500).send("Internal Server Error");
  }
};

const getOrderListAdmin = async (req, res) => {
  try {
    const allOrderDetails = await Order.aggregate([
      { $unwind: "$orderedItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $project: {
          _id: 0,
          orderId: "$_id",
          userDetails: 1,
          orderedItemId: "$orderedItems.orderId",
          productName: { $arrayElemAt: ["$productDetails.productName", 0] },
          productImage: { $arrayElemAt: ["$productDetails.productImage", 0] },
          quantity: "$orderedItems.quantity",
          size: "$orderedItems.size",
          orderDate: "$orderDate",
          totalAmount: "$totalAmount",
          paymentMethod: "$paymentMethod",
          orderStatus: "$orderStatus",
          orderStat: "$orderedItems.orderStat",
        },
      },
    ]);

    res.render("adminView/order-list", { allOrderDetails });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getOrderDetailsAdmin = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const orderDetails = await Order.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(orderId) } },
      { $unwind: "$orderedItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $lookup: {
          from: "addresses",
          localField: "userDetails._id",
          foreignField: "userId",
          as: "addressDetails",
        },
      },
      {
        $project: {
          orderedItems: 1,
          productDetails: 1,
          userDetails: 1,
          addressDetails: 1,
          orderStatus: "$orderedItems.orderStat",
          totalAmount: 1,
        },
      },
    ]);

    res.render("adminView/order-details", { orderDetails });
  } catch (error) {
    console.error("Error in orderDetails:", error);
    res.status(500).send("Internal Server Error");
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { newStatus } = req.body;

    const order = await Order.findOne({ "orderedItems.orderId": orderId });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.orderedItems.forEach((item) => {
      if (item.orderId.toString() === orderId) {
        item.orderStat = newStatus;
      }
    });

    const updatedOrder = await order.save();

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  checkoutRender,
  placeOrder,
  orderDetailsPage,
  getOrderListAdmin,
  getOrderDetailsAdmin,
  updateOrderStatus,
};
