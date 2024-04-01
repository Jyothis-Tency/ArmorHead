const User = require("../model/userModel");

const isLoggedIn = async (req, res, next) => {
  try {
    console.log("isLoggedIn triggered");
    if (req.session.userData) {
      const user = await User.findOne({ _id: req.session.userData._id });
      console.log(user);
      if (user) {
        if (!user.isBlocked) {
          // User is not blocked, proceed
          next();
        } else {
          // User is blocked, redirect to login page with a message
          // console.log('1');
          req.flash("error", "Your account has been blocked");
          res.redirect("/login");
        }
      } else {
        // User not found, redirect to login page
        res.redirect("/login");
      }
    } else {
      // User not logged in, redirect to login page
      res.redirect("/login");
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({ message: "Internal error occurred" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.session.admin) {
    User.findOne({ isAdmin: "1" })
      .then((data) => {
        if (data) {
          next();
        } else {
          res.redirect("/admin/login");
        }
      })
      .catch((error) => {
        console.error("Error in isAdmin middleware:", error);
        res.status(500).send("Internal Server Error");
      });
  } else {
    res.redirect("/admin/login");
  }
};

module.exports = {
    isLoggedIn,
    isAdmin
}