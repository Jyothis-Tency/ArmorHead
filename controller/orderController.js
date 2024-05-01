const Order = require("../model/orderModel");
const Address = require("../model/addressModel");
const Coupon = require("../model/couponModel");
const cartHelper = require("../helper/cartHelper");
const addressHelper = require("../helper/addressHelper");
const orderHelper = require("../helper/orderHelper");
const productHelper = require("../helper/productHelper");
const walletHelper = require("../helper/walletHelper");
const razorpay = require("../middleware/razorpay");
const Wallet = require("../model/walletModel");
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
    console.log("checkoutRender triggered");
    const user = req.session.userData;
    let couponApplied;
    couponApplied = req.session.coupon;
    console.log("couponApplied : ", couponApplied);
    cartCount = await cartHelper.getCartCount(user._id);
    let cartItems = await cartHelper.getAllCartItems(user._id);
    let totalAmount = await cartHelper.totalSubtotal(user._id, cartItems);
    req.session.oldTotal = totalAmount;
    if (req.session.updatedTotal) {
      totalAmount = req.session.updatedTotal;
    }
    const userAddress = await addressHelper.findAnAddress(user._id);
    let allAddress = await addressHelper.findAllAddress(user._id);
    let availableCoupons = await Coupon.find({
      expiryDate: { $gt: new Date() },
      usedBy: { $ne: user._id },
    });
    console.log("availableCoupons: ", availableCoupons);
    res.render("userView/checkout-page", {
      loginStatus: req.session.userData,
      user,
      cartItems,
      totalAmount: totalAmount,
      address: userAddress,
      allAddress: allAddress,
      cartCount,
      currencyFormat: cartHelper.currencyFormat,
      availableCoupons,
      couponApplied,
    });
  } catch (error) {
    console.log(error);
    res.status(500).render("user/404");
  }
};

const orderDetailsPage = async (req, res) => {
  try {
    const userId = req.session.userData._id;

    // Extract the current page from the request query, defaulting to 1 if not provided
    const page = parseInt(req.query.page, 10) || 1;

    // Define the limit for the number of orders to display per page
    const limit = 3;

    // Get the order details for the specified page and limit
    const orderDetails = await orderHelper.getOrderDetails(userId, page, limit);

    // Fetch the total number of orders for the user to calculate total pages
    const totalOrders = await Order.countDocuments({ user: userId });

    // Calculate the total number of pages needed
    const totalPages = Math.ceil(totalOrders / limit);

    res.render("userView/orderDetails-page", {
      orderDetails,
      page, // Current page number
      totalOrders, // Total number of orders for the user
      limit, // Limit of orders per page
      totalPages, // Total number of pages needed
    });
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

const placeOrder = async (req, res) => {
  try {
    console.log("placeOrder triggered");
    req.session.tempOrderDetails = null;
    console.log(
      "deleted req.session.tempOrderDetails : ",
      req.session.tempOrderDetails
    );
    let userId = req.session.userData._id;
    let coupon = req.session.coupon;
    console.log("coupon:", coupon);
    let selectedAddressId = req.body.selectAddress;
    console.log(selectedAddressId);

    if (!selectedAddressId || selectedAddressId === undefined) {
      console.log("!address");
      throw new Error("Please Select any Address before checkout");
    }
    const address = await Address.findById(selectedAddressId);
    let paymentMethod = req.body.payment_method.trim().toLowerCase();
    if (!paymentMethod || paymentMethod === undefined) {
      console.log("!paymentMethod");
      throw new Error("Please Select any Payment Method before checkout");
    }
    let cartItems = await cartHelper.getAllCartItems(userId);
    console.log("2");
    if (!cartItems || cartItems.length === 0) {
      console.log("!cartItems.length");
      throw new Error("Please add items to cart before checkout");
    }
    let totalAmount;
    console.log("req.session.couponTotal:", req.session.couponTotal);
    if (
      req.session.couponTotal === undefined ||
      req.session.couponTotal === null
    ) {
      totalAmount = await cartHelper.totalAmount(userId);
    } else {
      totalAmount = req.session.couponTotal;
    }
    console.log("totalAmount:", totalAmount);
    let wallet = await Wallet.findOne({ user: userId });
    // console.log(wallet);
    if (!wallet) {
      wallet = new Wallet({ user: userId });
      await wallet.save();
    }
    const orderedDate = orderDate();
    req.session.couponTotal = null;
    if (paymentMethod === "cash on delivery") {
      try {
        if (totalAmount >= 1000) {
          const placeOrder = await orderHelper.forOrderPlacing(
            req.body,
            totalAmount,
            cartItems,
            userId,
            coupon,
            address
          );
          await Order.findOneAndUpdate(
            { _id: placeOrder._id },
            { paymentStatus: "success" },
            { new: true }
          );

          await productHelper.stockDecrease(cartItems);
          await cartHelper.clearTheCart(userId);

          req.session.tempOrderDetails = {
            paymentMethod,
            totalAmount,
            cartItems,
            orderedDate,
            coupon,
          };
          console.log(
            "saved req.session.tempOrderDetails",
            req.session.tempOrderDetails
          );
        } else {
          console.log("Product below 1000");
        }
        res.status(202).json({
          paymentMethod: "Cash on Delivery",
          message: "Purchase Done",
          totalAmount: totalAmount,
        });
        // res.render("userView/orderSuccess-page", {
        //   cartItems,
        //   orderedDate: orderedDate,
        // });
      } catch (error) {
        console.error("Error processing Cash on Delivery payment:", error);
        res.status(500).json({ error: "Failed to process payment" });
      }
    } else if (req.body.payment_method === "razorpay") {
      try {
        const orderDetails = await orderHelper.forOrderPlacing(
          req.body,
          totalAmount,
          cartItems,
          userId,
          coupon,
          address
        );
        // const razorpayOrderDetails = await razorpay.razorpayOrderCreate(orderDetails._id, orderDetails.totalAmount);

        // Update order status to 'confirmed'
        await orderHelper.changeOrderStatus(
          orderDetails._id,
          "confirmed",
          "confirmed",
          req.body.payment_method
        );

        // Update payment status to 'success'

        const updatedPaymentStatus = await Order.findOneAndUpdate(
          { _id: orderDetails._id },
          { paymentStatus: "success" },
          { new: true }
        );

        console.log(
          "updatePaymentStatus : ",
          updatedPaymentStatus.paymentStatus
        );

        // Decrease product stock and clear cart
        await productHelper.stockDecrease(cartItems);
        await cartHelper.clearTheCart(userId);

        req.session.tempOrderDetails = {
          paymentMethod,
          totalAmount,
          cartItems,
          orderedDate,
          coupon,
        };

        res.json({ paymentMethod: "razorpay", orderDetails });
      } catch (error) {
        console.error("Error processing Razorpay payment:", error);
        res.status(500).json({ error: "Failed to process payment" });
      }
    } else if (paymentMethod === "wallet") {
      console.log("paymentMethod === wallet");
      let isPaymentDone = await walletHelper.payUsingWallet(
        userId,
        totalAmount
      );
      // console.log(isPaymentDone);
      if (isPaymentDone) {
        await orderHelper
          .forOrderPlacing(
            req.body,
            totalAmount,
            cartItems,
            userId,
            coupon,
            address
          )
          .then(async (orderDetails) => {
            await orderHelper.changeOrderStatus(
              orderDetails._id,
              "confirmed",
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
    res.status(400).json({ error: true, message: error.message });
  }
};

const orderSuccess = async (req, res) => {
  try {
    console.log("orderSuccess triggered");
    const { paymentMethod, totalAmount, cartItems, orderedDate, coupon } =
      req.session.tempOrderDetails;
    res.render("userView/orderSuccess-page", {
      cartItems,
      deliveryDate: orderedDate,
      totalAmount,
    });
  } catch (error) {
    console.error(error);
  }
};

const paymentSuccess = (req, res) => {
  try {
    console.log(req.body);
    const { paymentid, signature, orderId } = req.body;
    const { createHmac } = require("node:crypto");

    const hash = createHmac("sha256", process.env.KEY_SECRET)
      .update(orderId + "|" + paymentid)
      .digest("hex");

    if (hash === signature) {
      console.log("payment success");
      res.status(200).json({ success: true, message: "Payment successful" });
    } else {
      console.log("error");
      res.json({ success: false, message: "Invalid payment details" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const failedRazorpay = async (req, res) => {
  try {
    console.log("inside failedRazorpay");
    let userId = req.session.userData._id;
    let coupon = req.session.coupon;
    console.log(req.body);
    // Get the selected address ID from the request body
    let selectedAddressId = req.body.selected_address;
    console.log(selectedAddressId);
    // Fetch the address details based on the selected address ID
    const addressData = await Address.findById(selectedAddressId);
    console.log(addressData);
    let paymentStatus = "pending";
    let cartItems = await cartHelper.getAllCartItems(userId);
    console.log(cartItems, "cartitemsssssssssssssssssss");
    if (!cartItems.length) {
      return res.json({
        error: true,
        message: "Please add items to cart before checkout",
      });
    }
    const totalAmount = await cartHelper.totalAmount(userId);
    console.log(typeof totalAmount);
    let wallet = await Wallet.findOne({ user: userId });
    // console.log(wallet);
    if (!wallet) {
      wallet = new Wallet({ user: userId });
      await wallet.save();
    }
    const orderDetails = await orderHelper.forOrderPlacing(
      req.body,
      totalAmount,
      cartItems,
      userId,
      coupon,
      addressData
    );
    await orderHelper.changeOrderStatus(
      orderDetails._id,
      "confirmed",
      "pending",
      req.body.payment_method
    );
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderDetails._id },
      { paymentStatus: "pending" },
      { new: true }
    );
    await cartHelper.clearTheCart(userId);
  } catch (error) {
    console.log(error);
    res.status(500).render("user/404");
  }
};

const secondTry = async (req, res) => {
  try {
    console.log("secondTry triggered");
    delete req.session.requestOrderId;
    console.log(req.body);
    const requestOrderId = req.body.order_id;
    req.session.requestOrderId = requestOrderId;
    const order = await Order.findOne({
      "orderedItems.orderId": requestOrderId,
    });
    console.log(order);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    if (req.body.payment_method === "razorpay") {
      const razorpayOrderDetails = await razorpay.razorpayOrderCreate(
        requestOrderId,
        order.totalAmount
      );
      console.log("process.env.KEY_ID : ", process.env.KEY_ID);

      res.json({
        paymentMethod: "razorpay",
        order,
        razorpayOrderDetails,
        razorpaykeyId: process.env.KEY_ID,
      });
    }
  } catch (error) {
    console.log(error);
  }
};

const verifyPayment = async (req, res) => {
  console.log("verify payment");
  const userId = req.session.userData._id;
  const requestOrderId = req.session.requestOrderId;
  const loggedIn = userId;
  const updatedOrder = await Order.findOneAndUpdate(
    { "orderedItems.orderId": requestOrderId },
    { paymentStatus: "success" },
    { new: true }
  );
  console.log(updatedOrder);
  console.log("updatedOrder._id", updatedOrder._id);
  await razorpay
    .verifyPaymentSignature(req.body)
    .then(async (response) => {
      if (response.signatureIsValid) {
        await orderHelper.changeOrderStatus(
          updatedOrder._id,
          "confirmed",
          "confirmed"
        );
        let cartItems = await cartHelper.getAllCartItems(userId);
        await productHelper.stockDecrease(cartItems);
        await cartHelper.clearTheCart(userId);
        res.status(200).json({ status: true });
      } else {
        res.status(200).json({ status: false });
      }
    })
    .catch((error) => {
      console.log(error);
      res.status(500).render("user/404", { loggedIn });
    });
};

module.exports = {
  checkoutRender,
  placeOrder,
  orderDetailsPage,
  getOrderListAdmin,
  getOrderDetailsAdmin,
  updateOrderStatus,
  orderSuccess,
  paymentSuccess,
  failedRazorpay,
  secondTry,
  verifyPayment,
};
