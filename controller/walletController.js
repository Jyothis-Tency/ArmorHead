const walletHelper = require("../helper/walletHelper")

const getWallet = async (req, res) => {
  try {
    console.log('getWallet triggered');
    let userId = req.session.userData._id;
    let walletAmount = await walletHelper.getWalletAmount(userId);
    console.log(walletAmount);
    res.render("userView/wallet", { walletDetails: walletAmount });
  } catch (error) {
    console.log(error);
    res.status(500).render("user/404");
  }
};

module.exports = {
  getWallet,
};