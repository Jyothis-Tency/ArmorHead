const addressHelper = require("../helper/addressHelper");
const Order = require("../model/orderModel");
const forOrderPlacing = async (
  order,
  totalAmount,
  cartItems,
  userId1,
) => {
  try {
    console.log('forOrderPlacing triggered');
    console.log(order);
    // let couponUsed = await Coupon.findOne({ couponCode: coupon });

    let status =
      order.payment_method == "Cash on Delivery" ? "confirmed" : "pending";
    // console.log(status);
    let date = orderDate();
    // console.log(date);
    let userId = userId1;
    // console.log(userId);
    let paymentMethod = order.payment_method;
    console.log(paymentMethod);
    let address = await addressHelper.findAnAddress(order.address);
    // console.log(address);
    let itemsOrdered = cartItems;
    // console.log(itemsOrdered);
    // console.log('2');
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
    // console.log('3');
    return completedOrders; // Return the saved order
  } catch (error) {
    throw error; // Propagate any errors
  }
};

module.exports = {
  forOrderPlacing,
};
