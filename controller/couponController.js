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
    console.log("addCoupon triggered");
    console.log(req.body);
    const coupon = await couponHelper.addCouponToDb(req.body);
    console.log(coupon);
    res.status(200).redirect("/admin/coupon");
  } catch (error) {
    console.error(error);
  }
};

const editCoupon = async (req, res) => {
  try {
    console.log("editCoupon triggered");
    console.log(req.body);
    const { eCouponId, eCouponName, eStartDate, eEndDate, eDiscount } = req.body;
    console.log(eCouponId, eCouponName, eStartDate, eEndDate, eDiscount);
    await Coupon.updateOne(
      { _id: eCouponId },
      {
        $set: {
          couponName: eCouponName,
          createdOn: eStartDate,
          expiryDate: eEndDate,
          discount: eDiscount,
        },
      }
    );
    console.log("coupon edit success");
    res.status(200).json({ message: "coupon edited successfully" });
  } catch (error) {
    res.status(400).json({ message: "coupon edit failed" });
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

const applyCoupon = async (req, res) => {
  try {
    console.log("inside applycoupon");
    req.session.couponTotal = null;
    console.log("req.session.couponTotal", req.session.couponTotal);
    let couponApplied;
    const userId = req.session.userData._id;
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found for this user" });
    }
    // Store the original total price before applying the coupon
    req.session.originalTotal = cart.totalPrice;

    const couponCode = req.body.couponCode;
    const coupon = await Coupon.findOne({ couponCode });
    if (!coupon) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid coupon code" });
    } else {
      req.session.coupon = couponCode;
    }
    console.log("req.session.coupon:", req.session.coupon);
    if (req.session.coupon) {
      if (cart.totalPrice < coupon.minimumPurchaseAmount) {
        return res.status(400).json({
          success: false,
          message: "Minimum purchase amount not met for this coupon",
        });
      }
      if (coupon.expiryDate < new Date()) {
        return res
          .status(400)
          .json({ success: false, message: "Coupon has expired" });
      }
      if (coupon.usedBy.includes(userId)) {
        return res
          .status(400)
          .json({ success: false, message: "Coupon has already been used" });
      }

      // Apply the coupon discount
      cart.totalPrice -= coupon.discount;
      cart.coupon = couponCode;
      couponApplied = req.session.coupon;

      await Coupon.updateOne({ couponCode }, { $push: { usedBy: userId } });
      await cart.save();
      console.log("cart.totalPrice : ", cart.totalPrice);
      req.session.couponTotal = cart.totalPrice;
      console.log("req.session.couponTotal:", req.session.couponTotal);
      console.log(cart);
      return res.status(200).json({
        success: true,
        message: "Coupon applied successfully",
        cart,
        session: req.session,
        couponApplied,
      });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const removeCoupon = async (req, res) => {
  try {
    console.log("inside removecoupon");
    req.session.couponTotal = null;
    console.log("req.session.couponTotal:", req.session.couponTotal);
    const userId = req.session.userData._id;
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found for this user" });
    }

    const couponCode = req.session.coupon;
    const coupon = await Coupon.findOne({ couponCode });
    console.log(coupon);

    if (!coupon) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid coupon code" });
    }

    if (cart.coupon !== couponCode) {
      return res.status(400).json({
        success: false,
        message: "Coupon is not applied to this cart",
      });
    }

    // Remove the coupon from the cart
    cart.totalPrice = req.session.originalTotal; // Restore the original total price
    cart.coupon = null;
    req.session.coupon = null;
    console.log("req.session.coupon:", req.session.coupon);
    await Coupon.updateOne({ couponCode }, { $pull: { usedBy: userId } });
    await cart.save();
    req.session.couponTotal = cart.totalPrice;
    console.log("req.session.couponTotal:", req.session.couponTotal);

    return res.status(200).json({
      success: true,
      message: "Coupon removed successfully",
      cart,
      session: req.session,
    });
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
  editCoupon,
  deleteCoupon,
  //Admin side
  applyCoupon,
  removeCoupon,
};
