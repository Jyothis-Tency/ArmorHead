const addressHelper = require("../helper/addressHelper");
const Order = require("../model/orderModel");
const Coupon = require("../model/couponModel")
const mongoose = require("mongoose");

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

const forOrderPlacing = async (order, totalAmount, cartItems, userId1, coupon, addressData) => {
  try {
    console.log("forOrderPlacing triggered");
    console.log(order);
    let couponAmount
    if (coupon) {
      let couponUsed = await Coupon.findOne({ couponCode: coupon });
      couponAmount = couponUsed ? couponUsed.discount : 0;
    }
    let status = order.payment_method == "Cash on Delivery" ? "confirmed" : "pending";
    // console.log(status);
    let date = orderDate();
    // console.log(date);
    let userId = userId1;
    // console.log(userId);
    let paymentMethod = order.payment_method;
    // console.log(paymentMethod);
    // let address = await addressHelper.findAnAddress(userId);
    let address = addressData
    // console.log(address);
    let itemsOrdered = cartItems;
    // console.log(itemsOrdered);
    console.log("2");
    let completedOrders = new Order({
      user: userId,
      address: address,
      orderDate: date,
      totalAmount: totalAmount,
      paymentMethod: paymentMethod,
      orderStatus: status,
      orderedItems: itemsOrdered,
      coupon: coupon,
      couponAmount: couponAmount,
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
        $project: {
          _id: 0,
          orderId: "$_id",
          orderedItemId: "$orderedItems.orderId",
          productName: { $arrayElemAt: ["$productDetails.productName", 0] }, // Extract productName from productDetails array
          productImage: { $arrayElemAt: ["$productDetails.productImage", 0] }, // Extract productImage from productDetails array
          quantity: "$orderedItems.quantity",
          size: "$orderedItems.size",
          orderDate: "$orderDate",
          totalAmount: "$totalAmount",
          paymentMethod: "$paymentMethod",
          paymentStatus: "$paymentStatus",
          orderStatus: "$orderStatus",
          orderStat: "$orderedItems.orderStat", // Project the orderStat field
        },
      },
    ]);

    return result;
  } catch (error) {
    console.error("Error finding order details:", error);
    throw error;
  }
};

const getAllDeliveredOrders = async () => {
  try {
    console.log("getAllDeliveredOrders triggered");

    // Determine the start of the current month
    const currentMonthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    // Aggregation pipeline
    const result = await Order.aggregate([
      // Unwind the orderedItems to deal with them individually
      {
        $unwind: "$orderedItems",
      },
      // Match only the delivered items within orderedItems
      {
        $match: {
          "orderedItems.orderStat": "delivered",
        },
      },
      // Lookup user details for each order
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
          from: "products",
          localField: "orderedItems.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      // Match orders that are delivered and created after the start of the current month
      {
        $match: {
          createdAt: { $gte: currentMonthStart },
        },
      },
    ]);

    result.forEach((order) => {
      console.log("Product Details:", order.productDetails);
    });

    return result; // Return the results from the aggregation
  } catch (error) {
    throw error; // Catch and throw errors
  }
};

const getAllDeliveredOrdersByDate = async (startDate, endDate) => {
  try {
    console.log("getAllDeliveredOrdersByDate triggered");
    const result = await Order.aggregate([
      // Unwind the orderedItems to deal with them individually
      {
        $unwind: "$orderedItems",
      },
      // Match delivered orders within the specified date range
      {
        $match: {
          "orderedItems.orderStat": "delivered",
          orderDate: {
            $gte: startDate,
            $lt: new Date(endDate.getTime() + 86400000), // Include the end date
          },
        },
      },
    ]); // Use lean() to get plain JavaScript objects

    console.log(result);
    return result;
  } catch (error) {
    throw error; // Handle any errors
  }
};

const changeOrderStatus = async (orderId, changeStatus, newOrderStat, paymentMethod) => {
  try {
    console.log("changeOrderStatus");
    const orderStatusChange = await Order.findOneAndUpdate(
      { _id: orderId },
      {
        $set: {
          "orderedItems.$[].orderStat": newOrderStat,
          orderStatus: changeStatus,
          paymentMethod: paymentMethod,
        },
      },
      {
        new: true,
      }
    );
    console.log(orderStatusChange);
    return orderStatusChange;
  } catch (error) {
    throw new Error("Something went wrong! Failed to change status");
  }
};

module.exports = {
  forOrderPlacing,
  getOrderDetails,
  getAllDeliveredOrders,
  getAllDeliveredOrdersByDate,
  changeOrderStatus,
};
