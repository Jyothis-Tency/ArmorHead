const Razorpay = require("razorpay")

var razorpay = new Razorpay({
  key_id: process.env.KEY_ID,
  key_secret: process.env.KEY_SECRET,
});

const createOrder = async (req, res) => {
  try {
    console.log("inside create order");
    console.log(req.body.totalPrice);
    const amount = parseInt(req.body.totalPrice);
    console.log(amount);
    const orderDetails = await razorpay.orders.create({
      amount: `${amount * 100}`,
      currency: "INR",
      receipt: String(req.session.userData),
      payment_capture: 1,
    });
    console.log(orderDetails);
    res.json({ orderId: orderDetails, totalPrice: req.body.totalPrice });
  } catch (error) {
    console.log(error);
    throw error;
  }
};

module.exports = {
  createOrder,
};