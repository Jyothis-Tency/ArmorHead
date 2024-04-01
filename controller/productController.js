const productHelper = require("../helper/productHelper");
const Product = require("../model/productModel");
const Category = require("../model/categoryModel");
const User = require("../model/userModel")
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
    console.log(`Received params: ${req.query.sortValue}`);
    let sort = req.query.sort; // Retrieve sort value from query parameters
    console.log(sort);

    // Process the value of 'sort' to define sorting options
    let sortOption = {};
    if (sort === "1") {
      sortOption = { salePrice: -1 }; // High to low
    } else if (sort === "2") {
      sortOption = { salePrice: 1 }; // Low to high
    } else if (sort === "3") {
      sortOption = { productName: 1 }; // A to Z
    } else if (sort === "4") {
      sortOption = { productName: -1 }; // Z to A
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
    const categories = await Category.find({ isBlocked: false });

    const itemsPerPage = 8;
    const currentPage = parseInt(req.query.page) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const totalPages = Math.ceil(count / itemsPerPage);
    const productsOnPage = currentProduct.slice(startIndex, endIndex);

    // Render the shop page with the sorted and paginated products
    res.render("userView/shop-page", {
      // user: user,
      products: productsOnPage,
      category: categories,
      count: count,
      totalPages: totalPages,
      currentPage: currentPage,
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
    console.log(`this is fetched user: ${user}`);
    const id = req.params.id;
    console.log(`This is required id: ${id}`);
    const findProduct = await Product.findOne({ _id: id });
    console.log(`Product Name in complete details of fetched product: ${findProduct.productName}`);
    // console.log(findProduct.id, "Hello world");
    let products = await productHelper.getAllUnblockedProducts();
    if (findProduct) {
      res.render("userView/product-details", {
        data: findProduct,
        user: user,
        products,
      });
      console.log("Everything success");
    } else {
      res.render("userView/product-details", { data: findProduct });
    }
  } catch (error) {
    console.log(error.message);
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
};
