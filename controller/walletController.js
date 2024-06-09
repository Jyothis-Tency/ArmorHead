const Wallet = require("../model/walletModel");
const User = require("../model/userModel");
const walletHelper = require("../helper/walletHelper");
const Razorpay = require("razorpay");
let instance = new Razorpay({
  key_id: process.env.KEY_ID,
  key_secret: process.env.KEY_SECRET,
});

const getWallet = async (req, res) => {
  try {
    console.log("getWallet triggered");
    let userId = req.session.userData._id;
    console.log(userId);
    const loggedIn = userId;
    let user = await User.findById(userId);
    console.log(user);
    const wallet = await Wallet.findOne({ user: userId });
    console.log("wallet : ", wallet);
    let walletAmount = await walletHelper.getWalletAmount(userId);
    console.log(walletAmount);
    res.render("userView/wallet", {
      walletAmount: walletAmount,
      loggedIn,
      userDetails: user,
      walletDetails: wallet,
    });
  } catch (error) {
    console.log(error);
    res.status(500).render("user/404");
  }
};

const addMoneyToWallet = async (req, res) => {
  try {
    console.log("addMoneyToWallet triggered");
    console.log("req.body.total:", req.body.total);
    var options = {
      amount: req.body.total * 100,
      currency: "INR",
      receipt: "" + Date.now(),
    };
    console.log("options:", options);

    instance.orders.create(options, async function (err, order) {
      if (err) {
        console.log("Error while creating order : ", err);
      } else {
        const amount = order.amount / 100;
        console.log("amount : ", amount);

        // Find the user's wallet and update the walletBalance
        const wallet = await Wallet.findOneAndUpdate(
          { user: req.session.userData._id },
          {
            $inc: { walletBalance: amount },
            $push: {
              history: {
                date: Date.now(),
                status: "credit",
                amount: amount,
                action:"Add money to wallet"
              },
            },
          },
          { new: true }
        );

        if (!wallet) {
          // If the wallet doesn't exist, create a new one
          const newWallet = new Wallet({
            user: req.session.userData._id,
            walletBalance: amount,
            history: [
              {
                date: Date.now(),
                status: "credit",
                amount: amount,
                action: "Add money to wallet",
              },
            ],
          });
          await newWallet.save();
          console.log(newWallet);
        }
      }

      console.log("addWallet success");
      res.json({ order: order, razorpay: true });
    });
  } catch (error) {
    console.log(error.message);
  }
};

const verifyPayment = async (req, res) => {
  try {
    console.log("verifyPayment triggered");
    let details = req.body;
    console.log("details:", details);
    console.log(details.order.order.amount);
    let amount = parseInt(details.order.order.amount) / 100;
    console.log("amount:", amount);

    // // Find the user's wallet and update the walletBalance
    // const wallet = await Wallet.findOneAndUpdate(
    //   { user: req.session.userData._id },
    //   { $inc: { walletBalance: amount } },
    //   { new: true }
    // );

    // if (!wallet) {
    //   // If the wallet doesn't exist, create a new one
    //   const newWallet = new Wallet({
    //     user: req.session.userData._id,
    //     walletBalance: amount,
    //   });
    //   await newWallet.save();
    // }

    res.json({ success: true });
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  getWallet,
  addMoneyToWallet,
  verifyPayment,
};
