const Order = require("../model/orderModel");
const cartHelper = require("../helper/cartHelper");
const addressHelper = require("../helper/addressHelper");
const orderHelper = require("../helper/orderHelper");
const productHelper = require("../helper/productHelper");
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
    cartCount = await cartHelper.getCartCount(user._id);
    // wishListCount = await wishlistHelper.getWishListCount(user._id)
    let cartItems = await cartHelper.getAllCartItems(user._id);
    let totalAmount = await cartHelper.totalSubtotal(user._id, cartItems);
    req.session.oldTotal = totalAmount;
    // let walletBalance = await walletHelper.getWalletAmount(user._id)
    // walletBalance = currencyFormat(walletBalance);
    if (req.session.updatedTotal) {
      totalAmount = req.session.updatedTotal;
    }
    // const coupons = await couponHelper.findAllCoupons();
    const userAddress = await addressHelper.findAnAddress(user._id);
    let allAddress = await addressHelper.findAllAddress(user._id);
    res.render("userView/checkout-page", {
      loginStatus: req.session.userData,
      user,
      cartItems,
      totalAmount: totalAmount,
      address: userAddress,
      allAddress:allAddress,
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
    console.log("placeOrder triggered");
    let userId = req.session.userData._id;
    paymentMethod = req.body.payment_method.trim().toLowerCase();
    console.log("paymentMethod" + paymentMethod);
    const address = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      house: req.body.house,
      locality: req.body.locality,
      city: req.body.city,
      state: req.body.state,
      pincode: req.body.pincode,
    };
    console.log(address);

    let cartItems = await cartHelper.getAllCartItems(userId);
    console.log(cartItems, "cartitemsssssssssssssssssss");

    if (!cartItems.length) {
      console.log("No cartItems.length");
      return res.json({
        error: true,
        message: "Please add items to cart before checkout",
      });
    } else {
      console.log("there is cartItems.length");
    }

    if (address === undefined) {
      console.log("is address === undefined");
      return res.json({
        error: true,
        message: "Please Select any Address before checkout",
      });
    } else {
      console.log("not address === undefined");
    }

    if (req.body.payment_method === undefined) {
      console.log("is payment_methods===undefined");
      return res.json({
        error: true,
        message: "Please Select any Payment Method before checkout",
      });
    } else {
      console.log("no payment_methods === undefined");
    }

    const totalAmount = await cartHelper.totalAmount(userId);
    console.log("totalAmount : " + totalAmount);

    const orderedDate = orderDate();
    console.log("orderedDate : " + orderedDate);

    if (paymentMethod === "cash on delivery") {
      console.log("payment_method === cash on delivery");
      console.log(
        `req.body: ${req.body}, totalAmount: ${totalAmount}, cartItems: ${cartItems}, userId: ${userId}`
      );
      await orderHelper
        .forOrderPlacing(req.body, totalAmount, cartItems, userId)
        .then(async (response) => {
          console.log("inside placeorder");
          await productHelper.stockDecrease(cartItems);
          console.log("stockDecrease over");
          await cartHelper.clearTheCart(userId);
          console.log("clearTheCart over");

          // Render a view
          res.render("userView/orderSuccess-page", {
            cartItems,
            orderedDate: orderedDate,
          });
        });
    }

    // else if (req.body.payment_method === "razorpay") {
    //   await orderHelper
    //     .forOrderPlacing(req.body, totalAmount, cartItems, userId)
    //     .then(async (orderDetails) => {
    //       await razorpay
    //         .razorpayOrderCreate(orderDetails._id, orderDetails.totalAmount)
    //         .then(async (razorpayOrderDetails) => {
    //           await orderHelper.changeOrderStatus(
    //             orderDetails._id,
    //             "confirmed",
    //             req.body.payment_method
    //           );
    //           await productHelper.stockDecrease(cartItems);
    //           await cartHelper.clearTheCart(userId);
    //           res.json({
    //             paymentMethod: "razorpay",
    //             orderDetails,
    //             razorpayOrderDetails,
    //             razorpaykeyId: process.env.razorpay_key_id,
    //           });
    //         });
    //     });
    // }
    // else if (req.body.payment_method === "wallet") {
    //   let isPaymentDone = await walletHelper.payUsingWallet(
    //     userId,
    //     totalAmount
    //   );
    //   if (isPaymentDone) {
    //     await orderHelper
    //       .forOrderPlacing(req.body, totalAmount, cartItems, userId, coupon)
    //       .then(async (orderDetails) => {
    //         await orderHelper.changeOrderStatus(
    //           orderDetails._id,
    //           "confirmed",
    //           req.body.payment_method
    //         );
    //         await productHelper.stockDecrease(cartItems);
    //         await cartHelper.clearTheCart(userId);
    //         res
    //           .status(202)
    //           .json({ paymentMethod: "wallet", message: "Purchase Done" });
    //       });
    //   }
    //   else {
    //     res
    //       .status(200)
    //       .json({
    //         paymentMethod: "wallet",
    //         message: "Balance Insufficient in Wallet",
    //       });
    //   }
    // }
  } catch (error) {
    console.log(error);
  }
};

const orderDetailsPage = async (req, res) => {
  try {
    console.log("orderDetailsPage triggered");
    const userId = req.session.userData._id; // Get the user ID from the session

    // Fetch order details using getOrderDetails function from orderHelper
    const orderDetails = await orderHelper.getOrderDetails(userId);

    console.log(orderDetails);
    res.render("userView/orderDetails-page", { orderDetails });
  } catch (error) {
    console.error("Error in orderDetails:", error);
    res.status(500).send("Internal Server Error");
  }
};

const getOrderListAdmin = async (req, res) => {
  try {
    // console.log('1');
    // Fetch all order details using aggregation
    const allOrderDetails = await Order.aggregate([
      { $unwind: "$orderedItems" }, // Unwind orderedItems array
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.product",
          foreignField: "_id",
          as: "productDetails", // Renamed to productDetails
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
          productName: { $arrayElemAt: ["$productDetails.productName", 0] }, // Extract productName from productDetails array
          productImage: { $arrayElemAt: ["$productDetails.productImage", 0] }, // Extract productImage from productDetails array
          quantity: "$orderedItems.quantity",
          size: "$orderedItems.size",
          orderDate: "$orderDate",
          totalAmount: "$totalAmount",
          paymentMethod: "$paymentMethod",
          orderStatus: "$orderStatus",
          orderStat: "$orderedItems.orderStat", // Project the orderStat field
        },
      },
    ]);

    // console.log(allOrderDetails[0].userDetails);
    // console.log(allOrderDetails);

    // Send the order details as the response
    res.render("adminView/order-list", { allOrderDetails });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getOrderDetailsAdmin = async (req, res) => {
  try {
    // console.log('1');
    const orderId = req.params.orderId;
    // console.log(orderId);

    const orderDetails = await Order.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(orderId) },
      },
      {
        $unwind: "$orderedItems",
      },
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

    console.log(orderDetails);
    res.render("adminView/order-details", { orderDetails });
  } catch (error) {
    console.error("Error in orderDetails:", error);
    res.status(500).send("Internal Server Error");
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    console.log("updateOrderStatus triggered");
    const { orderId } = req.params;
    const { newStatus } = req.body;
    console.log(orderId + " " + newStatus);

    // Find the order with matching orderId
    const order = await Order.findOne({ "orderedItems.orderId": orderId });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Update the orderStat field for the matching orderId
    order.orderedItems.forEach((item) => {
      if (item.orderId.toString() === orderId) {
        item.orderStat = newStatus;
      }
    });

    // Save the updated order
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
