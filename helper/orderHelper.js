const addressHelper = require("../helper/addressHelper");
const Order = require("../model/orderModel");
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

const forOrderPlacing = async (order, totalAmount, cartItems, userId1) => {
  try {
    console.log("forOrderPlacing triggered");
    console.log(order);
    // let couponUsed = await Coupon.findOne({ couponCode: coupon });

    let status =
      order.payment_method == "Cash on Delivery" ? "confirmed" : "pending";
    console.log(status);
    let date = orderDate();
    console.log(date);
    let userId = userId1;
    console.log(userId);
    let paymentMethod = order.payment_method;
    console.log(paymentMethod);
    let address = await addressHelper.findAnAddress(userId);
    console.log(address);
    let itemsOrdered = cartItems;
    console.log(itemsOrdered);
    console.log("2");
    let completedOrders = new Order({
      user: userId,
      address: address,
      orderDate: date,
      totalAmount: totalAmount,
      paymentMethod: paymentMethod,
      orderStatus: status,
      orderedItems: itemsOrdered,
    });

    await completedOrders.save();
    console.log("3");
    return completedOrders; // Return the saved order
  } catch (error) {
    throw error; // Propagate any errors
  }
};
const getOrderDetails = async (userId) => {
  try {
    const result = await Order.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
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

    return result;
  } catch (error) {
    console.error("Error finding order details:", error);
    throw error; // Throw the error for handling
  }
};






module.exports = {
  forOrderPlacing,
  getOrderDetails,
};
