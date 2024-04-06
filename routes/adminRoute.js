const express = require("express");
const adminRoute = express();
const adminController = require("../controller/adminController");
const customerController = require("../controller/customerController");
const productController = require("../controller/productController")
const categoryController = require("../controller/categoryController")
const orderController = require("../controller/orderController")

const {isAdmin}= require("../authentication/authentify")

//Admin Actions
adminRoute.get("/login", adminController.getLoginPage);
adminRoute.post("/login", adminController.verifyLogin);
adminRoute.get("/logout", adminController.getLogout);
adminRoute.get("/", isAdmin, adminController.renderAdmin);

// Customer Management
adminRoute.get("/users", isAdmin, customerController.getCustomersInfo);
adminRoute.get("/blockCustomer",isAdmin, customerController.getCustomerBlocked);
adminRoute.get("/unblockCustomer",isAdmin, customerController.getCustomerUnblocked);

// Category Management
adminRoute.get("/category", isAdmin, categoryController.getCategoryInfo);
adminRoute.post("/addCategory", isAdmin, categoryController.addCategory);
adminRoute.get("/allCategory", isAdmin, categoryController.getAllCategories);
adminRoute.get("/listCategory", isAdmin, categoryController.getListCategory);
adminRoute.get("/unListCategory", isAdmin, categoryController.getUnListCategory);
adminRoute.get("/editCategory", isAdmin, categoryController.getEditCategory);
adminRoute.post("/editCategory/:id", isAdmin, categoryController.editCategory);

// Multer Settings
const multer = require("multer")
const storage = require("../helper/multer")
const upload = multer({ storage: storage })
adminRoute.use("/public/uploads", express.static("/public/uploads"))

// Product Management
adminRoute.get("/addProduct", isAdmin, productController.getAddProductPage)
adminRoute.post("/addProduct", isAdmin, upload.array("images", 5), productController.addProducts)
adminRoute.get("/productPage", isAdmin, productController.ProductList)
adminRoute.get("/editProduct", isAdmin, productController.getEditProduct)
adminRoute.post("/editProduct/:id", isAdmin, upload.array("images", 5), productController.editProduct);
adminRoute.post("/deleteImage", isAdmin, productController.deleteSingleImage)
adminRoute.get("/blockProduct",isAdmin,productController.getBlockProduct)
adminRoute.get("/unBlockProduct", isAdmin, productController.getUnblockProduct)

// Order Management
adminRoute.get("/order-list", isAdmin, orderController.getOrderListAdmin);
adminRoute.get('/orderDetailsAdmin/:orderId', isAdmin, orderController.getOrderDetailsAdmin);
adminRoute.post('/updateOrderStatus/:orderId', isAdmin, orderController.updateOrderStatus);

module.exports = adminRoute;
