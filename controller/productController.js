const productHelper = require("../helper/productHelper");
const Product = require("../model/productModel");
const Category = require("../model/categoryModel");
const User = require("../model/userModel");
const fs = require("fs");
const path = require("path");

const getAddProductPage = async (req, res) => {
  try {
    console.log("getAddProductPage triggered");
    const category = await Category.find({ isListed: true });
    console.log(category);
    res.render("adminView/product-add", { cat: category });
  } catch (error) {
    console.log(error);
  }
};

const addProducts = async (req, res) => {
  try {
    console.log("addProducts triggered");

    const products = req.body;
    console.log("req.body data =" + JSON.stringify(products));
    const smallQuantity = parseInt(req.body.small_quantity, 10) || 0;
    const mediumQuantity = parseInt(req.body.medium_quantity, 10) || 0;
    const largeQuantity = parseInt(req.body.large_quantity, 10) || 0;
    const productExists = await Product.findOne({
      productName: products.productName,
    });
    if (!productExists) {
      // Calculate total quantity
      const totalQuantity = smallQuantity + mediumQuantity + largeQuantity;

      const productSizes = [
        { size: "Small", quantity: smallQuantity },
        { size: "Medium", quantity: mediumQuantity },
        { size: "Large", quantity: largeQuantity },
        // Add more sizes if needed
      ];

      const images = [];
      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          images.push(req.files[i].filename);
        }
      }

      const newProduct = new Product({
        id: Date.now(),
        productName: products.productName,
        productDescription: products.productDescription,
        category: products.category,
        regularPrice: products.regularPrice,
        salePrice: products.salePrice,
        productSizes,
        totalQuantity, // Assign total quantity
        createdOn: new Date(),
        productImage: images,
      });
      await newProduct.save();
      console.log("New product = " + newProduct);
      res.redirect("/admin/productPage");
      // res.json("success")
    } else {
      res.json("failed");
    }
  } catch (error) {
    console.log(JSON.stringify(error));
  }
};

const ProductList = async (req, res) => {
  try {
    console.log("ProductList triggered");
    const response = await productHelper.getAllProducts();
    res.render("adminView/products", {
      data: response,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const getEditProduct = async (req, res) => {
  try {
    console.log("getEditProduct triggered");
    const id = req.query.id;
    const findProduct = await Product.findOne({ _id: id });

    const category = await Category.find({});
    res.render("adminView/edit-product", {
      product: findProduct,
      cat: category,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const editProduct = async (req, res) => {
  try {
    console.log("editProduct triggered");
    const id = req.params.id;
    const products = req.body;
    const smallQuantity = parseInt(req.body.small_quantity, 10) || 0;
    const mediumQuantity = parseInt(req.body.medium_quantity, 10) || 0;
    const largeQuantity = parseInt(req.body.large_quantity, 10) || 0;
    const totalQuantity = smallQuantity + mediumQuantity + largeQuantity; // Calculate total quantity

    const productSizes = [
      { size: "Small", quantity: smallQuantity },
      { size: "Medium", quantity: mediumQuantity },
      { size: "Large", quantity: largeQuantity },
      // Add more sizes if needed
    ];
    const images = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        images.push(req.files[i].filename);
      }
    }
    console.log(req.files);
    if (req.files.length > 0) {
      console.log("Yes image is there");
      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        {
          id: Date.now(),
          productName: products.productName,
          productDescription: products.productDescription,
          category: products.category,
          regularPrice: products.regularPrice,
          salePrice: products.salePrice,
          productSizes,
          totalQuantity, // Update total quantity
          createdOn: new Date(),
          productImage: images,
        },
        { new: true }
      );
      console.log("product updated");
      res.redirect("/admin/productPage");
    } else {
      console.log("No images there");
      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        {
          id: Date.now(),
          productName: products.productName,
          productDescription: products.productDescription,
          category: products.category,
          regularPrice: products.regularPrice,
          salePrice: products.salePrice,
          productSizes,
          totalQuantity, // Update total quantity
          createdOn: new Date(),
        },
        { new: true }
      );
      console.log("product updated");
      res.redirect("/admin/productPage");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const deleteSingleImage = async (req, res) => {
  try {
    console.log("deleteSingleImage triggered");
    console.log("hi");
    const id = req.body.productId;
    const image = req.body.filename;
    console.log(id, image);
    const product = await Product.findByIdAndUpdate(id, {
      $pull: { productImage: image },
    });
    // console.log(image);
    const imagePath = path.join("public", "uploads", "product-images", image);
    if (fs.existsSync(imagePath)) {
      await fs.unlinkSync(imagePath);
      console.log(`Image ${image} deleted successfully`);
      res.json({ success: true });
    } else {
      console.log(`Image ${image} not found`);
    }

    // res.redirect(`/admin/editProduct?id=${product._id}`)
  } catch (error) {
    console.log(error.message);
  }
};

const getBlockProduct = async (req, res) => {
  try {
    console.log("getBlockProduct triggered");
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
    console.log("product blocked");
    res.redirect("/admin/productPage");
  } catch (error) {
    console.log(error.message);
  }
};

const getUnblockProduct = async (req, res) => {
  try {
    console.log("getUnblockProduct triggered");
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
    console.log("product unblocked");
    res.redirect("/admin/productPage");
  } catch (error) {
    console.log(error.message);
  }
};

const getShopPage = async (req, res) => {
  try {
    console.log("getShopPage triggered");

    // Retrieve the value of the 'sort' parameter from the query string
    console.log(`Received query: ${req.query.sort}`);
    let sort;

    if (req.query.sort) {
      sort = req.query.sort;
    } else {
      sort = "Price:High-Low";
    }
    // Retrieve sort value from query parameters
    req.session.sort = sort;
    console.log(sort);

    // Process the value of 'sort' to define sorting options
    let sortOption = {};
    if (sort === "Price:High-Low") {
      sortOption = { salePrice: -1 }; // High to low
    } else if (sort === "Price:Low-High") {
      sortOption = { salePrice: 1 }; // Low to high
    } else if (sort === "Name:A-Z") {
      sortOption = { productName: 1 }; // A to Z
    } else if (sort === "Name:Z-A") {
      sortOption = { productName: -1 }; // Z to A
    } else if (sort === "New-Arrivals") {
      sortOption = { createdAt: 1 };
    }

    // Construct the MongoDB query with sorting
    let query = { isBlocked: false };
    let currentProduct;
    if (sortOption) {
      currentProduct = await Product.find(query).sort(sortOption);
    } else {
      currentProduct = await Product.find(query);
    }
    // console.log("Sorted products:", currentProduct);

    // Paginate the results
    const count = await Product.countDocuments(query);
    const categories = await Category.find({ isListed: true });
    console.log(categories);
    const itemsPerPage = 8;
    const currentPage = parseInt(req.query.page) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const totalPages = Math.ceil(count / itemsPerPage);
    const productsOnPage = currentProduct.slice(startIndex, endIndex);
    const productLength = productsOnPage.length;
    console.log(productLength);
    console.log(count);
    // Render the shop page with the sorted and paginated products
    res.render("userView/shop-page", {
      // user: user,
      sort: sort,
      products: productsOnPage,
      category: categories,
      count: count,
      productLength: productLength,
      totalPages: totalPages,
      currentPage: currentPage,
      selectedSort: sort, // Pass the selected sort option value to the template
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const getProductDetailsPage = async (req, res) => {
  try {
    console.log("getProductDetailsPage triggered");
    const user = req.session.userData;
    console.log("this is fetched user:" + user);
    const id = req.params.id;
    console.log(`This is required id: ${id}`);
    const findProduct = await Product.findOne({ _id: id });
    const categoryId = await Category.findOne({ _id: findProduct.category });
    console.log(categoryId);
    console.log(
      `Product Name in complete details of fetched product: ${findProduct.productName}`
    );
    // console.log(findProduct.id, "Hello world");
    let products = await productHelper.getAllUnblockedProducts();
    if (findProduct) {
      res.render("userView/product-details", {
        data: findProduct,
        category: categoryId,
        user: user,
        products,
      });
      console.log("getProductDetailsPage success");
    } else {
      res.render("userView/product-details", { data: findProduct });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const stockPage = async (req, res) => {
  try {
    const getAllProducts = await productHelper.getAllProducts();
    res.render("adminView/stock-page", {
      data: getAllProducts,
    });
  } catch (error) {
    console.error(error);
  }
};

const searchProduct = async (req, res) => {
  try {
    console.log("searchProduct triggered");
    const { query } = req.query;
    console.log(query);
    console.log(req.session.sort);
    let products;
    if (req.session.category) {
      products = await Product.find({
        productName: { $regex: new RegExp(query, "i") },
        isBlocked: false,
        category: req.session.category,
      });
    } else if (req.session.sort) {
      if (req.session.sort === "Price:High-Low") {
        products = await Product.find({
          productName: { $regex: new RegExp(query, "i") },
          isBlocked: false,
        }).sort({ salePrice: -1 });
      } else if (req.session.sort === "Price:Low-High") {
        products = await Product.find({
          productName: { $regex: new RegExp(query, "i") },
          isBlocked: false,
        }).sort({ salePrice: 1 });
      } else if (req.session.sort === "Name:A-Z") {
        products = await Product.find({
          productName: { $regex: new RegExp(query, "i") },
          isBlocked: false,
        }).sort({ productName: 1 });
      } else if (req.session.sort === "Name:Z-A") {
        products = await Product.find({
          productName: { $regex: new RegExp(query, "i") },
          isBlocked: false,
        }).sort({ productName: -1 });
      } else if (req.session.sort === "New-Arrivals") {
        products = await Product.find({
          productName: { $regex: new RegExp(query, "i") },
          isBlocked: false,
        }).sort({ createdAt: 1 });
      }
    } else {
      products = await Product.find({
        productName: { $regex: new RegExp(query, "i") },
        isBlocked: false,
      });
    }

    console.log(products);
    const categories = await Category.find({ isListed: true });
    res.json([products, categories]);
  } catch (error) {
    console.error("Error searching for products:", error);
    res.status(500).json({ error: "Error searching for products" });
  }
};

const filterProduct = async (req, res) => {
  try {
    console.log("filteredProduct triggered");
    const categoryId = req.query.category;
    const sort = req.query.sort;
    console.log(categoryId);
    req.session.category = categoryId;
    // console.log(categoryId);
    const user = req.session.id;
    let products;

    if (categoryId) {
      products = await Product.find({
        category: categoryId,
        isBlocked: false,
      });
    } else {
      products = await Product.find({
        isBlocked: false,
      });
    }

    const count = await Product.countDocuments();

    const categories = await Category.find({ isListed: true });

    const itemsPerPage = 8;
    const currentPage = parseInt(req.query.page) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const totalPages = Math.ceil(products.length / itemsPerPage);
    const productsOnPage = products.slice(startIndex, endIndex);
    const productLength = productsOnPage.length;
    res.render("userView/shop-page", {
      user: user,
      products: productsOnPage,
      sort: sort,
      category: categories,
      productLength: productLength,
      count: count,
      totalPages: totalPages,
      currentPage: currentPage,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const filterPrice = async (req, res) => {
  try {
    console.log("1");
    const user = req.session.userData._id;
    const { minPrice, maxPrice } = req.body;
    console.log(minPrice + " " + maxPrice);
    const filteredProducts = await Product.find({
      salePrice: { $gte: minPrice, $lte: maxPrice },
    });
    console.log(filteredProducts);
    const count = filteredProducts.length;
    const categories = await Category.find({ isBlocked: false });
    const itemsPerPage = 8;
    const currentPage = parseInt(req.query.page) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const productsOnPage = filteredProducts.slice(startIndex, endIndex);
    res.render("userView/shop-page", {
      user: user,
      product: productsOnPage,
      category: categories,
      count: count,
      totalPages: totalPages,
      currentPage: currentPage,
    });
  } catch (error) {
    console.error("Error filtering products:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateStock = async (req, res) => {
  const { productId, smallQty, mediumQty, largeQty } = req.body;

  try {
    // Find the product by its ID
    const product = await Product.findById(productId);

    // Update the quantities
    product.productSizes.forEach((size) => {
      if (size.size === "Small") {
        size.quantity = smallQty;
      } else if (size.size === "Medium") {
        size.quantity = mediumQty;
      } else if (size.size === "Large") {
        size.quantity = largeQty;
      }
    });

    // Recalculate total quantity
    let totalQuantity = 0;
    product.productSizes.forEach((size) => {
      totalQuantity += size.quantity;
    });
    product.totalQuantity = totalQuantity;

    // Save the updated product
    await product.save();

    res.setHeader("Refresh", "0;url=/stockPage"); // Refresh the page after 0 seconds with the root URL (/)

    // res
    //   .status(200)
    //   .json({ message: "Product quantities updated successfully" });
  } catch (error) {
    console.error("Error updating product quantities:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getAddProductPage,
  addProducts,
  ProductList,
  getEditProduct,
  editProduct,
  deleteSingleImage,
  getBlockProduct,
  getUnblockProduct,
  getProductDetailsPage,
  getShopPage,
  stockPage,
  searchProduct,
  filterProduct,
  updateStock,
};
