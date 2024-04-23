const Coupon = require("../model/couponModel");
const Cart = require("../model/cartModel");
const cartHelper = require("../helper/cartHelper");
const couponHelper = require("../helper/couponHelper");
function dateFormat(date) {
  return date.toISOString().slice(0, 10);
}
// Admin side
const getCouponPage = async (req, res) => {
  try {
    let allCoupons = await couponHelper.findAllCoupons();
    for (let i = 0; i < allCoupons.length; i++) {
      if (allCoupons[i].expiryDate) {
        allCoupons[i].discount = cartHelper.currencyFormat(
          allCoupons[i].discount
        );
        allCoupons[i].expiryDate = dateFormat(allCoupons[i].expiryDate);
      }
    }
    res.render("adminView/coupon", { coupons: allCoupons });
  } catch (error) {
    console.error(error);
  }
};

const addCoupon = async (req, res) => {
  try {
    console.log(req.body);
    const coupon = await couponHelper.addCouponToDb(req.body);
    console.log(coupon);
    res.status(200).redirect("/admin/coupon");
  } catch (error) {
    console.error(error);
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const result = await couponHelper.deleteSelectedCoupon(req.params.id);
    res.json({ message: "coupon deleted successfully" });
  } catch (error) {
    console.error(error);
  }
};

//User side

const applyOrRemoveCoupon = async (req, res) => {
  try {
    console.log("applyOrRemoveCoupon triggered");
    const userId = req.session.userData._id;
    const cart = await Cart.findOne({ user: userId });
    console.log(cart);
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found for this user" });
    }
    const couponCode = req.body.couponCode;
    console.log(couponCode);

    if (!couponCode) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon code is required" });
    }

    const coupon = await Coupon.findOne({ couponCode });
    console.log(coupon);

    if (!coupon) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid coupon code" });
    }

    if (cart.coupon === couponCode) {
      console.log("cart.coupon === couponCode");
      console.log(cart.totalPrice);
      console.log(coupon.discount);
      cart.totalPrice += coupon.discount;
      console.log(cart.totalPrice);
      req.session.updatedTotal = cart.totalPrice;

      cart.coupon = null;
      req.session.coupon = null;

      await Coupon.updateOne({ couponCode }, { $pull: { usedBy: userId } });
      await cart.save();
      return res
        .status(200)
        .json({
          success: true,
          message: "Coupon removed successfully",
          cart,
          session: req.session,
        });
    } else {
      console.log("Coupon");
      if (cart.totalPrice < coupon.minimumPurchaseAmount) {
        console.log("cart.totalPrice < coupon.minimumPurchaseAmount");
        return res
          .status(400)
          .json({
            success: false,
            message: "Minimum purchase amount not met for this coupon",
          });
      }
      if (coupon.expiryDate < new Date()) {
        console.log("coupon.expiryDate < new Date()");
        return res
          .status(400)
          .json({ success: false, message: "Coupon has expired" });
      }
      if (coupon.usedBy.includes(userId)) {
        console.log("coupon.usedBy.includes(userId)");
        return res
          .status(400)
          .json({ success: false, message: "Coupon has already been used" });
      }

      cart.totalPrice -= coupon.discount;
      console.log(cart.totalPrice);
      req.session.updatedTotal = cart.totalPrice;
      cart.coupon = couponCode;
      req.session.coupon = couponCode;

      await Coupon.updateOne({ couponCode }, { $push: { usedBy: userId } });
      await cart.save();
      // req.session.coupon = null
      return res
        .status(200)
        .json({
          success: true,
          message: "Coupon applied successfully",
          cart,
          session: req.session,
        });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getCouponPage,
  addCoupon,
  deleteCoupon,
  //Admin side
  applyOrRemoveCoupon,
};
