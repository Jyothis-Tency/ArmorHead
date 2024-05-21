const Razorpay = require("razorpay")

var razorpay = new Razorpay({
  key_id: process.env.KEY_ID,
  key_secret: process.env.KEY_SECRET,
});

const createOrder = async (req, res) => {
  try {
    console.log("createOrder triggered");
    console.log(req.body.totalPrice);
    console.log("req.session.couponTotal:", req.session.couponTotal);
    let amount
    if (req.session.couponTotal) {
      amount = parseInt(req.session.couponTotal);
    } else {
      amount = parseInt(req.body.totalPrice);
    }
     
    console.log(amount);
    delete req.session.couponTotal;

    try {
      const orderDetails = await razorpay.orders.create({
        amount: `${amount * 100}`,
        currency: "INR",
        receipt: String(req.session.userData),
        payment_capture: 1,
      });
      console.log(orderDetails);
      res.json({ orderId: orderDetails, totalPrice: amount });
    } catch (error) {
      console.log(error);
      throw error; // Re-throw the error to be caught by the outer try...catch
    }
  } catch (error) {
    console.log(error);
    // Handle the error appropriately, e.g., send an error response
    res
      .status(500)
      .json({ error: "An error occurred while creating the order" });
  }
};

const razorpayOrderCreate = async (orderId, totalAmount) => {
  try {
    console.log("razorpayOrderCreate triggered");
    console.log(totalAmount);
    let parseAmount = parseFloat(totalAmount);
    let amountAsInt = Math.round(parseAmount); // Round to nearest integer
    const orderDetails = razorpay.orders.create({
      amount: `${amountAsInt * 100}`,
      currency: "INR",
      receipt: `${orderId}`,
      payment_capture: 1,
    });
    console.log("orderDetails.id : ",orderDetails.id);
    console.log("razorpay orderDetails :", orderDetails);
    return orderDetails;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const verifyPaymentSignature = async (details) => {
  try {
    console.log("inside verifypaymentsignature");
    console.log(details, "ddddddddddderererererererereretailsssssssssss");
    const { payment } = details;

    console.log(payment.razorpay_order_id);

    let body =
      payment["razorpay_order_id"] + "|" + payment["razorpay_payment_id"];

    console.log(body, "bbbbbooooooooddddddyyyyyyyyyyy");

    const crypto = require("crypto");
    let expectedSignature = crypto
      .createHmac("sha256", `${process.env.KEY_SECRET}`)
      .update(body.toString())
      .digest("hex");

    console.log(
      expectedSignature,
      "eeeeeeeeeeeeeeeeeeeexxxxxxxxxxxxxxxxxxxxxxxxx"
    );

    console.log(
      "sigggggggg receiveddddddddddd ",
      payment["razorpay_signature"]
    );

    let response = { signatureIsValid: false };

    if (expectedSignature === payment["razorpay_signature"]) {
      response = { signatureIsValid: true };
    }

    return response;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createOrder,
  razorpayOrderCreate,
  verifyPaymentSignature,
};