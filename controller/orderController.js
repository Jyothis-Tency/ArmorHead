const Order = require("../model/orderModel");
const Product = require("../model/productModel");
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
const { error } = require("node:console");

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
    // let couponAppliedd = req.session.coupon || "";
    let couponAppliedd = "";
    console.log("couponApplied : ", couponAppliedd);
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
    let wallet = await Wallet.find({ user: user._id });
    console.log("wallet:", wallet);

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
      couponApplied: couponAppliedd,
      walletDetails: wallet,
    });
  } catch (error) {
    console.log(error);
    res.status(500).render("user/404");
  }
};

const orderDetailsList = async (req, res) => {
  try {
    console.log("orderDetailsPage triggered");
    const userId = req.session.userData._id;

    // Extract the current page from the request query, defaulting to 1 if not provided
    const page = parseInt(req.query.page, 10) || 1;

    // Define the limit for the number of orders to display per page
    const limit = 6;

    // Get the order details for the specified page and limit
    const orderDetails = await orderHelper.getOrderDetails(userId, page, limit);
    console.log(orderDetails);
    // Fetch the total number of orders for the user to calculate total pages
    const totalOrders = await Order.countDocuments({ user: userId });

    // Calculate the total number of pages needed
    const totalPages = Math.ceil(totalOrders / limit);

    res.render("userView/orderDetails-list", {
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

const orderDetailsUser = async (req, res) => {
  try {
    console.log("orderDetailsUser triggered");
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);
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
        $project: {
          orderedItems: 1,
          orderedItemId: "$orderedItems.orderId",
          productDetails: 1,
          userDetails: 1,
          address: 1,
          orderStatus: "$orderedItems.orderStat",
          paymentStatus: 1,
          totalAmount: 1,
          "returnProducts.status": 1,
          "returnProducts.returnReason": 1,
          "returnProducts.returnMessage": 1,
          coupon: 1,
        },
      },
    ]);
    const coupons = await Coupon.find();
    console.log("coupons:", coupons);
    console.log("orderDetails : ", orderDetails);
    // Pass the order details, returnMessage, and specificReturnData to the view
    res.render("userView/orderDetails-page", {
      orderDetails,
      coupons,
    });
  } catch (error) {
    res.render("userView/404");
  }
};

const getOrderListAdmin = async (req, res) => {
  try {
    console.log("getOrderListAdmin triggered");
    const { page = 1, limit = 5 } = req.query;
    const parsedPage = parseInt(page); // Ensure it's a number
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    const allOrderDetails = await Order.aggregate([
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
          userDetails: { $arrayElemAt: ["$userDetails", 0] },
          productName: { $arrayElemAt: ["$productDetails.productName", 0] },
          productImage: { $arrayElemAt: ["$productDetails.productImage", 0] },
          orderDate: "$orderDate",
          totalAmount: "$totalAmount",
          paymentMethod: "$paymentMethod",
          orderStatus: "$orderStatus",
        },
      },
      { $sort: { orderDate: -1 } },
      { $skip: skip },
      { $limit: parsedLimit },
    ]);

    const totalOrders = await Order.countDocuments();

    if (req.xhr) {
      // If the request is an AJAX request, respond with JSON
      res.json({
        allOrderDetails,
        currentPage: parsedPage,
        totalPages: Math.ceil(totalOrders / parsedLimit),
      });
    } else {
      // If not an AJAX request, render the template
      res.render("adminView/order-list", {
        allOrderDetails,
        currentPage: parsedPage,
        totalPages: Math.ceil(totalOrders / parsedLimit),
      });
    }
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getOrderDetailsAdmin = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    // Retrieve the order details with the provided order ID
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
        $project: {
          orderedItems: 1,
          productDetails: 1,
          userDetails: 1,
          address: 1,
          orderStatus: "$orderedItems.orderStat",
          totalAmount: 1,
          paymentMethod: 1,
          paymentStatus: 1,
          "returnProduct.status": 1,
          "returnProduct.returnReason": 1,
          "returnProduct.returnMessage": 1,
          returnProStatus: "$orderedItems.returnPro.status",
          returnProReason: "$orderedItems.returnPro.returnReason",
          returnProMessage: "$orderedItems.returnPro.returnMessage",
          coupon: 1,
        },
      },
    ]);
    console.log("orderDetails : ", orderDetails);
    const coupons = await Coupon.find();
    // Pass the order details, returnMessage, and specificReturnData to the view
    res.render("adminView/order-details", {
      orderDetails,
      coupons,
    });
  } catch (error) {
    console.error("Error in getOrderDetailsAdmin:", error);
    res.status(500).send("Internal Server Error");
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { newStatus } = req.body;
    console.log("newStatus : ", newStatus);

    const order = await Order.findOne({ "orderedItems.orderId": orderId });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    let appliedCoupon;
    if (order.coupon) {
      console.log("order.coupon", order.coupon);
      appliedCoupon = await Coupon.findOne({ couponCode: order.coupon });
    }
    console.log("appliedCoupon:", appliedCoupon);

    order.orderedItems.forEach((item) => {
      if (item.orderId.toString() === orderId) {
        item.orderStat = newStatus;
      }
    });

    let product;
    order.orderedItems.forEach((item) => {
      if (item.orderId.toString() === orderId) {
        product = item.product;
      }
    });

    const productIn = await Product.findOne({ _id: product });
    const wallet = await Wallet.findOne({ user: order.user });
    order.orderedItems.forEach((items) => {
      console.log("order", order);
      console.log("items", items);
      if (items.orderId.toString() === orderId) {
        if (newStatus === "returned") {
          console.log("productIn.totalQuantity", productIn.totalQuantity);
          productIn.productSizes.forEach((products) => {
            if (products.size === items.size) {
              products.quantity += items.quantity;
            }
          });
          productIn.totalQuantity += items.quantity;
          productIn.save();
          if (wallet) {
            if (order.coupon) {
              console.log("order.coupon");
              console.log("productIn.salePrice", productIn.salePrice);
              console.log("order.totalAmount", order.totalAmount);
              console.log("appliedCoupon.discount", appliedCoupon.discount);
              const couponAddPricePer =
                (productIn.salePrice / order.totalAmount) *
                appliedCoupon.discount;
              console.log("couponAddPrice", couponAddPricePer);
              const couponAddPrice = parseInt(
                productIn.salePrice - couponAddPricePer
              );
              console.log("couponProduct", couponAddPrice);
              wallet.walletBalance += items.quantity * couponAddPrice;
              wallet.history.push({
                date: new Date(),
                status: "credit",
                amount: items.quantity * couponAddPrice,
                action: "product return",
              });
            } else {
              wallet.walletBalance += items.quantity * productIn.salePrice;
              wallet.history.push({
                date: new Date(),
                status: "credit",
                amount: items.quantity * productIn.salePrice,
                action: "product return",
              });
            }
          }
        }
      }
    });
    await wallet.save();
    console.log("updated wallet", wallet);
    console.log("3");
    if (order.orderedItems.length === 1) {
      // If there is only one ordered item, set the orderStatus to the same value as the orderStat
      order.orderStatus = newStatus;
    } else {
      // If there are multiple ordered items, set the orderStatus based on the individual item statuses
      const hasDeliveredItem = order.orderedItems.some(
        (item) => item.orderStat === "delivered"
      );
      const allItemsDelivered = order.orderedItems.every(
        (item) => item.orderStat === "delivered"
      );
      const allItemsCancelled = order.orderedItems.every(
        (item) => item.orderStat === "cancelled"
      );
      const allItemsReturned = order.orderedItems.every(
        (item) => item.orderStat === "returned"
      );

      if (allItemsDelivered) {
        order.orderStatus = "delivered";
      } else if (hasDeliveredItem) {
        order.orderStatus = "delivered";
      } else if (allItemsCancelled) {
        order.orderStatus = "cancelled";
      } else if (allItemsReturned) {
        order.orderStatus = "returned";
      } else {
        // If there is a mix of different statuses, set the orderStatus to a suitable value
        order.orderStatus = "pending";
      }
    }

    if (newStatus === "returned") {
      const returnConfirm = await Order.updateOne(
        { "orderedItems.orderId": new mongoose.Types.ObjectId(orderId) }, // Match order by orderedItems.orderId
        {
          $set: {
            "returnProducts.status": false, // Update at the top level
            "returnProducts.returnReason": "",
            "returnProducts.returnMessage": "",
            "orderedItems.$[elem].returnPro.status": false,
            "orderedItems.$[elem].returnPro.returnReason": "",
            "orderedItems.$[elem].returnPro.returnMessage": "",
          },
        },
        {
          arrayFilters: [
            { "elem.orderId": new mongoose.Types.ObjectId(orderId) },
          ],
        }
      );
    }

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

    // (Skipping unrelated setup code for brevity)

    // Ensure the necessary data is present
    if (!req.body.selectAddress) {
      throw new Error("Please Select any Address before checkout");
    }
    if (!req.body.payment_method) {
      throw new Error("Please Select any Payment Method before checkout");
    }

    const userId = req.session.userData._id;
    const selectedAddressId = req.body.selectAddress;
    // const addressData = await Address.findById(selectedAddressId);
    const addressData = await Address.findOne({ _id: selectedAddressId });
    console.log("testAddress", addressData);
    const coupon = req.session.coupon;
    const paymentMethod = req.body.payment_method.trim().toLowerCase();
    const cartItems = await cartHelper.getAllCartItems(userId);

    if (!cartItems || cartItems.length === 0) {
      throw new Error("Please add items to cart before checkout");
    }

    const totalAmount =
      req.session.couponTotal ?? (await cartHelper.totalAmount(userId));
    const orderedDate = orderDate();

    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = new Wallet({ user: userId });
      await wallet.save();
    }
    req.session.tempOrderDetails = {
      paymentMethod,
      totalAmount,
      cartItems,
      orderedDate,
      coupon,
    };
    if (paymentMethod === "cash on delivery") {
      if (totalAmount < 1000) {
        throw new Error(
          "Total amount must be at least ₹1000 or above for Cash on Delivery."
        );
      }

      const orderDetails = await orderHelper.forOrderPlacing(
        req.body,
        totalAmount,
        cartItems,
        userId,
        req.session.coupon,
        addressData
      );

      await Order.findOneAndUpdate(
        { _id: orderDetails._id },
        { paymentStatus: "success" },
        { new: true }
      );

      // Attempt to decrease stock and handle any errors
      await productHelper.stockDecrease(cartItems);

      // Clear the cart if stock reduction was successful
      await cartHelper.clearTheCart(userId);

      res.status(202).json({
        paymentMethod: "Cash on Delivery",
        message: "Purchase Done",
        totalAmount: totalAmount,
      });
    } else if (paymentMethod === "razorpay") {
      try {
        const orderDetails = await orderHelper.forOrderPlacing(
          req.body,
          totalAmount,
          cartItems,
          userId,
          req.session.coupon,
          addressData
        );

        await Order.findOneAndUpdate(
          { _id: orderDetails._id },
          { paymentStatus: "success" },
          { new: true }
        );

        // Attempt to decrease stock and handle any errors
        await productHelper.stockDecrease(cartItems);

        await cartHelper.clearTheCart(userId);

        res.json({ paymentMethod: "razorpay", orderDetails });
      } catch (error) {
        console.error("Error processing Razorpay payment:", error);
        res.status(500).json({ error: true, message: error.message });
      }
    } else if (paymentMethod === "wallet") {
      try {
        console.log("else if wallet");
        let isPaymentDone = await walletHelper.payUsingWallet(
          userId,
          totalAmount
        );
        if (isPaymentDone) {
          console.log("if isPaymentDone");
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
            "confirmed",
            req.body.payment_method
          );
          const updatedOrder = await Order.findOneAndUpdate(
            { _id: orderDetails._id },
            { paymentStatus: "success" },
            { new: true }
          );
          // await productHelper.stockDecrease(cartItems);
          for (let i = 0; i < cartItems.length; i++) {
            const { productId: productId, size, quantity } = cartItems[i];
            const product = await Product.findById(productId);
            if (!product) {
              console.log("!product");
              return res.json({
                error: true,
                message: `Product with ID ${productId} not found`,
              });
            }
            const sizeIndex = product.productSizes.findIndex(
              (s) => s.size === size
            );
            if (sizeIndex === -1) {
              console.log("sizeIndex === -1");
              return res.json({
                error: true,
                message: `Size ${size} not found for product ${product.productName}`,
              });
            }
            const availableQuantity =
              product.productSizes[sizeIndex].quantity - quantity;
            console.log("availableQuantity:", availableQuantity);
            if (availableQuantity >= 0) {
              console.log("if availableQuantity >= 0");
              product.productSizes[sizeIndex].quantity = availableQuantity;
            } else {
              console.log("else availableQuantity >= 0");
              return res.json({
                error: true,
                message: `Insufficient stock for product ${product.productName} in size ${size}`,
              });
            }
            await product.save();
            console.log("product saved");
          }

          console.log("cartItems:", cartItems);
          const productIds = cartItems.map((item) => item.productId);
          console.log("productIds:", productIds);
          const products = await Product.find({ _id: { $in: productIds } });
          console.log("products:", products);
          for (const product of products) {
            let totalQuantity = 0;
            for (const size of product.productSizes) {
              totalQuantity += size.quantity;
            }
            product.totalQuantity = totalQuantity;
            await product.save();
          }
          await cartHelper.clearTheCart(userId);
          req.session.coupon = null;
          console.log("wallet over success");
          res.status(202).json({
            paymentMethod: "wallet",
            message: "Purchase Done",
            totalAmount: totalAmount,
          });
        } else {
          console.log("else isPaymentDone");
          res.status(200).json({
            paymentMethod: "wallet",
            error: true,
            message: "Insufficient Balance in Wallet",
          });
        }
      } catch (error) {
        console.error("Error processing wallet payment:", error);
        res.status(500).json({ error: true, message: error.message });
      }
    }
    console.log("before delete coupon session :", req.session.coupon);
    console.log("delete session coupon");
    req.session.coupon = "";
    console.log("after delete coupon session:", req.session.coupon);
  } catch (error) {
    console.error("Error during order placement:", error);
    res.status(400).json({ error: true, message: error.message });
  }
};

const orderSuccess = async (req, res) => {
  try {
    console.log("orderSuccess triggered");
    const { paymentMethod, totalAmount, cartItems, orderedDate, coupon } =
      req.session.tempOrderDetails;
    req.session.coupon = "";
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
    console.log("req.session.coupon:", req.session.coupon);
    req.session.coupon = "";
    console.log("req.session.coupon:", req.session.coupon);
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
    res.status(500).render("userView/404");
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
      res.status(500).render("userView/404", { loggedIn });
    });
};

module.exports = {
  checkoutRender,
  placeOrder,
  orderDetailsList,
  orderDetailsUser,
  getOrderListAdmin,
  getOrderDetailsAdmin,
  updateOrderStatus,
  orderSuccess,
  paymentSuccess,
  failedRazorpay,
  secondTry,
  verifyPayment,
};
