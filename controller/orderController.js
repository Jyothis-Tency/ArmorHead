const Order = require("../model/orderModel")
const cartHelper = require("../helper/cartHelper");
const addressHelper = require("../helper/addressHelper");
const orderHelper = require("../helper/orderHelper");
const productHelper = require("../helper/productHelper");
const mongoose = require("mongoose")
function orderDate() {
  const date = new Date();
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
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

  const dayOfWeek = days[date.getDay()];
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

  return `${dayOfWeek}, ${dayOfMonth} ${month} ${year}, ${time}`;
}

const checkoutRender = async (req, res) => {
  try {
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
    res.render("userView/checkout-page", {
      loginStatus: req.session.userData,
      user,
      cartItems,
      totalAmount: totalAmount,
      address: userAddress,
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

    let cartItems = await cartHelper.getAllCartItems(userId);
    console.log(cartItems, "cartitemsssssssssssssssssss");

    if (!cartItems.length) {
      console.log("!cartItems.length");
      return res.json({
        error: true,
        message: "Please add items to cart before checkout",
      });
    }

    if (address === undefined) {
      console.log("address === undefined");
      return res.json({
        error: true,
        message: "Please Select any Address before checkout",
      });
    }

    if (req.body.payment_method === undefined) {
      console.log("payment_methods===undefined");
      return res.json({
        error: true,
        message: "Please Select any Payment Method before checkout",
      });
    }

    const totalAmount = await cartHelper.totalAmount(userId);
    console.log("totalAmount" + totalAmount);

    const orderedDate = orderDate()

    if (paymentMethod === "cash on delivery") {
      console.log("payment_method === cash on delivery");
      console.log(`req.body: ${req.body}, totalAmount: ${totalAmount}, cartItems: ${cartItems}, userId: ${userId}`);
      await orderHelper
        .forOrderPlacing(req.body, totalAmount, cartItems, userId)
        .then(async (response) => {
          console.log("inside placeorder");
          await productHelper.stockDecrease(cartItems);
          console.log("stockDecrease over");
          await cartHelper.clearTheCart(userId);
          console.log("clearTheCart over");

          // Render a view
          res.render("userView/orderSuccess-page", {cartItems, orderedDate:orderedDate});
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
    res.status(500).render("user/404");
  }
};

const orderDetailsPage = async (req, res) => {
  try {
    console.log("orderDetailsPage triggered");
    const orderId = req.session.userData._id;
    // console.log(orderId);

    const orderDetails = await Order.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(orderId) } },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.product",
          foreignField: "_id",
          as: "orderedProducts",
        },
      },
      {
        $unwind: "$orderedItems",
      },
      {
        $unwind: "$orderedProducts",
      },
      {
        $project: {
          _id: 0,
          orderId: "$_id",
          productName: "$orderedProducts.productName",
          quantity: "$orderedItems.quantity",
          size: "$orderedItems.size",
          orderDate: "$orderDate",
          totalAmount: "$totalAmount",
          paymentMethod: "$paymentMethod",
          orderStatus: "$orderStatus",
        },
      },
    ]);

    console.log(orderDetails);
    res.render("userView/orderDetails-page", { orderDetails });
  } catch (error) {
    console.error("Error in orderDetails:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  checkoutRender,
  placeOrder,
  orderDetailsPage,
};
