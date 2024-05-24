const productHelper = require("../helper/productHelper");
const Product = require("../model/productModel");
const Category = require("../model/categoryModel");
const wishlist = require("../model/wishlistModel");
const productOffer = require("../model/productOfferModel");
const categoryOffer = require("../model/categoryOfferModel");
const User = require("../model/userModel");
const fs = require("fs");
const sharp = require("sharp");
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
    console.log(req.body);
    const {
      productName,
      productDescription,
      category,
      regularPrice,
      salePrice,
      small_quantity,
      medium_quantity,
      large_quantity,
    } = req.body;
    console.log(req.files);

    // Backend validation
    if (
      !productName ||
      !productDescription ||
      !category ||
      !regularPrice ||
      !salePrice ||
      !small_quantity ||
      !medium_quantity ||
      !large_quantity
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Additional validation for numeric fields
    if (
      isNaN(regularPrice) ||
      isNaN(salePrice) ||
      isNaN(small_quantity) ||
      isNaN(medium_quantity) ||
      isNaN(large_quantity)
    ) {
      return res.status(400).json({ error: "Invalid numeric values" });
    }

    const smallQuantity = parseInt(small_quantity, 10) || 0;
    const mediumQuantity = parseInt(medium_quantity, 10) || 0;
    const largeQuantity = parseInt(large_quantity, 10) || 0;

    // Calculate total quantity
    const totalQuantity = smallQuantity + mediumQuantity + largeQuantity;

    // Check if a product with the same name or image already exists
    const productExists = await Product.findOne({
      $or: [
        { productName },
        { productImage: { $in: req.files.map((file) => file.filename) } },
      ],
    });
    if (productExists) {
      if (
        productExists.productName === productName &&
        productExists.productImage.includes(req.files[0].filename)
      ) {
        return res.status(400).json({
          error: "Product with the same name and image already exists",
        });
      }
    }

    const productSizes = [
      { size: "Small", quantity: smallQuantity },
      { size: "Medium", quantity: mediumQuantity },
      { size: "Large", quantity: largeQuantity },
      // Add more sizes if needed
    ];

    const images = [];
    const imagesDir = path.resolve(
      __dirname,
      "public",
      "uploads",
      "product-images"
    );

    // Ensure the images directory exists
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const imagePath = req.files[i].path;

        try {
          // Crop the image using sharp
          const croppedImage = await sharp(imagePath)
            .extract({ left: 0, top: 0, width: 900, height: 900 })
            .toFormat("jpeg")
            .toBuffer();

          // Save the cropped image to a new file
          const croppedFilename = `cropped_${req.files[i].filename}`;
          const croppedFilePath = path.join(imagesDir, croppedFilename);
          await sharp(croppedImage).toFile(croppedFilePath);

          images.push(croppedFilename);
        } catch (error) {
          console.error(
            `Error processing image ${req.files[i].filename}: ${error.message}`
          );
          return res
            .status(500)
            .json({ error: `Error processing image ${req.files[i].filename}` });
        }
      }
    }

    console.log(images);
    const newProduct = new Product({
      productName,
      productDescription,
      category,
      regularPrice,
      salePrice,
      productSizes,
      totalQuantity,
      productImage: images,
    });

    console.log(newProduct);
    await newProduct.save();
    res.status(200).json({ success: "Product added successfully" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const ProductList = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = 5; // Set the desired limit here

    const { products, totalPages, currentPage } =
      await productHelper.getAllProducts(page, limit);

    res.render("adminView/products", {
      products,
      totalPages,
      currentPage,
      pagination: {
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error in adminProductList:", error);
    res.status(500).send("Internal Server Error");
  }
};

const adminSearchProduct = async (req, res) => {
  try {
    console.log("inside search");
    const searchTerm = req.query.search || "";
    console.log(searchTerm);
    const product = await Product.find({
      productName: { $regex: searchTerm, $options: "i" },
    });
    console.log(product);
    res.json({ product });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
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
    const id = req.params.id;
    const data = req.body;
    const images = [];

    const smallQuantity = parseInt(data.small_quantity, 10) || 0;
    const mediumQuantity = parseInt(data.medium_quantity, 10) || 0;
    const largeQuantity = parseInt(data.large_quantity, 10) || 0;
    const totalQuantity =
      parseInt(data.small_quantity) +
      parseInt(data.medium_quantity) +
      parseInt(data.large_quantity);

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        images.push(req.files[i].filename);
      }
    }

    const existingProduct = await Product.findById(id);
    const productSizes = [
      { size: "Small", quantity: smallQuantity },
      { size: "Medium", quantity: mediumQuantity },
      { size: "Large", quantity: largeQuantity },
    ];

    const imagesDir = path.join(
      "D:",
      "ArmorHead",
      "public",
      "uploads",
      "product-images"
    );

    if (req.files.length > 0) {
      console.log("Yes, images are there");

      const newImages = images.filter(
        (image) => !existingProduct.productImage.includes(image)
      );
      const croppedNewImages = [];

      if (newImages.length > 0) {
        for (let i = 0; i < newImages.length; i++) {
          const imagePath = path.join(imagesDir, newImages[i]);

          const croppedImage = await sharp(imagePath)
            .extract({ left: 0, top: 0, width: 900, height: 900 })
            .toFormat("jpeg")
            .toBuffer();

          const croppedFilename = `cropped_${newImages[i]}`;
          const croppedFilePath = path.join(imagesDir, croppedFilename);
          await sharp(croppedImage).toFile(croppedFilePath);

          croppedNewImages.push(croppedFilename);
        }
      }

      if (croppedNewImages.length > 0) {
        const updatedProduct = await Product.findByIdAndUpdate(
          id,
          {
            productName: data.productName,
            productDescription: data.description,
            category: data.category,
            regularPrice: data.regularPrice,
            productSizes,
            salePrice: data.salePrice,
            totalQuantity: totalQuantity,
            $push: { productImage: { $each: croppedNewImages } },
          },
          { new: true }
        );

        console.log("Product updated");
        return res
          .status(200)
          .json({ success: true, message: "Product updated successfully!" });
      } else {
        console.log("Same images were present");
        const updatedProduct = await Product.findByIdAndUpdate(
          id,
          {
            productName: data.productName,
            productDescription: data.description,
            category: data.category,
            regularPrice: data.regularPrice,
            productSizes,
            salePrice: data.salePrice,
            totalQuantity: totalQuantity,
          },
          { new: true }
        );

        console.log("Product updated");
        return res
          .status(200)
          .json({ success: true, message: "Product updated successfully!" });
      }
    } else {
      console.log("No images were present");
      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        {
          productName: data.productName,
          productDescription: data.description,
          category: data.category,
          regularPrice: data.regularPrice,
          productSizes,
          salePrice: data.salePrice,
          totalQuantity: totalQuantity,
        },
        { new: true }
      );

      console.log(updatedProduct);
      console.log("Product updated");
      return res
        .status(200)
        .json({ success: true, message: "Product updated successfully!" });
    }
  } catch (error) {
    console.log(error.message);
    return res
      .status(500)
      .json({ message: "An error occurred while updating the product." });
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

// const getShopPage = async (req, res) => {
//   try {
//     console.log("getShopPage triggered");

//     // Retrieve the value of the 'sort' parameter from the query string
//     console.log(`Received query: ${req.query.sort}`);
//     let sort;

//     if (req.query.sort) {
//       sort = req.query.sort;
//     } else {
//       sort = "Price:High-Low";
//     }
//     // Retrieve sort value from query parameters
//     req.session.sort = sort;
//     console.log(sort);

//     // Process the value of 'sort' to define sorting options
//     let sortOption = {};
//     if (sort === "Price:High-Low") {
//       sortOption = { salePrice: -1 }; // High to low
//     } else if (sort === "Price:Low-High") {
//       sortOption = { salePrice: 1 }; // Low to high
//     } else if (sort === "Name:A-Z") {
//       sortOption = { productName: 1 }; // A to Z
//     } else if (sort === "Name:Z-A") {
//       sortOption = { productName: -1 }; // Z to A
//     } else if (sort === "New-Arrivals") {
//       sortOption = { createdAt: 1 };
//     }

//     // Construct the MongoDB query with sorting
//     let query = { totalQuantity: { $ne: 0 }, isBlocked: false };
//     let currentProduct;
//     if (sortOption) {
//       currentProduct = await Product.find(query).sort(sortOption);
//     } else {
//       currentProduct = await Product.find(query);
//     }
//     // console.log("Sorted products:", currentProduct);

//     const productOffers = await productOffer
//       .find({ "productOffer.offerStatus": true })
//       .populate("productOffer.product");
//     const categoryOffers = await categoryOffer
//       .find({ "categoryOffer.offerStatus": true })
//       .populate("categoryOffer.category");

//     // Paginate the results
//     const count = await Product.countDocuments(query);
//     const categories = await Category.find({ isListed: true });
//     console.log(categories);
//     const itemsPerPage = 3;
//     const currentPage = parseInt(req.query.page) || 1;
//     const startIndex = (currentPage - 1) * itemsPerPage;
//     const endIndex = startIndex + itemsPerPage;
//     const totalPages = Math.ceil(count / itemsPerPage);
//     const productsOnPage = currentProduct.slice(startIndex, endIndex);
//     const productLength = productsOnPage.length;
//     console.log(productLength);
//     console.log(count);
//     // Render the shop page with the sorted and paginated products
//     res.render("userView/shop-page", {
//       // user: user,
//       sort: sort,
//       products: productsOnPage,
//       category: categories,
//       productOffers: productOffers,
//       categoryOffers: categoryOffers,
//       count: count,
//       productLength: productLength,
//       totalPages: totalPages,
//       currentPage: currentPage,
//       selectedSort: sort, // Pass the selected sort option value to the template
//     });
//   } catch (error) {
//     console.log(error.message);
//     res.status(500).send("Internal Server Error");
//   }
// };

const getShopPage = async (req, res) => {
  try {
    console.log("getShopPage triggered");

    const {
      sort = "Price:High-Low",
      query = "",
      category = "",
      page = 1,
    } = req.query;

    let sortOption = {};
    switch (sort) {
      case "Price:High-Low":
        sortOption = { salePrice: -1 };
        break;
      case "Price:Low-High":
        sortOption = { salePrice: 1 };
        break;
      case "Name:A-Z":
        sortOption = { productName: 1 };
        break;
      case "Name:Z-A":
        sortOption = { productName: -1 };
        break;
      case "New-Arrivals":
        sortOption = { createdAt: -1 };
        break;
    }

    let queryObj = {
      productName: { $regex: new RegExp(query, "i") },
      isBlocked: false,
    };
    if (category) {
      queryObj.category = category;
    }

    const currentProduct = await Product.find(queryObj).sort(sortOption);

    const itemsPerPage = 8;
    const count = await Product.countDocuments(queryObj);
    const totalPages = Math.ceil(count / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const productsOnPage = await Product.find(queryObj)
      .sort(sortOption)
      .skip(startIndex)
      .limit(itemsPerPage);

    if (req.xhr) {
      console.log("Sending AJAX response");
      return res.json({
        products: productsOnPage,
        count: count,
        totalPages: totalPages,
        currentPage: page,
      });
    } else {
      console.log("Rendering shop page");
      const categories = await Category.find({ isListed: true });
      console.log(categories);
      res.render("userView/shop-page", {
        products: productsOnPage,
        categories,
        totalPages,
        currentPage: page,
      });
    }
  } catch (error) {
    console.error(error);
    res.render("error/404");
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
    const wishlists = await wishlist.findOne({ user: user });
    let isInWishlist = false;
    isInWishlist =
      wishlists &&
      wishlists.products.some(
        (product) => product.productItemId.toString() === id
      );
    console.log("isInWishlist: ", isInWishlist);
    console.log(categoryId);
    console.log(
      `Product Name in complete details of fetched product: ${findProduct.productName}`
    );
    // console.log(findProduct.id, "Hello world");
    let products = await Product.find({
      _id: { $ne: id },
      category: categoryId,
    });
    console.log(products);
    if (findProduct) {
      res.render("userView/product-details", {
        data: findProduct,
        category: categoryId,
        user: user,
        wishlist: isInWishlist,
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
    const { page = 1, limit = 6 } = req.query;
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

    const getAllProducts = await Product.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $skip: (parsedPage - 1) * parsedLimit },
      { $limit: parsedLimit },
    ]);

    const totalProducts = await Product.countDocuments();

    if (req.xhr) {
      res.json({
        data: getAllProducts,
        currentPage: parsedPage,
        totalPages: Math.ceil(totalProducts / parsedLimit),
      });
    } else {
      res.render("adminView/stock-page", {
        data: getAllProducts,
        currentPage: parsedPage,
        totalPages: Math.ceil(totalProducts / parsedLimit),
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateStock = async (req, res) => {
  const { productId, smallQty, mediumQty, largeQty } = req.body;

  try {
    const product = await Product.findById(productId);

    product.productSizes.forEach((size) => {
      if (size.size === "Small") {
        size.quantity = smallQty;
      } else if (size.size === "Medium") {
        size.quantity = mediumQty;
      } else if (size.size === "Large") {
        size.quantity = largeQty;
      }
    });

    let totalQuantity = 0;
    product.productSizes.forEach((size) => {
      totalQuantity += size.quantity;
    });
    product.totalQuantity = totalQuantity;

    await product.save();

    res.json({ message: "Product quantities updated successfully" });
  } catch (error) {
    console.error("Error updating product quantities:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// const searchProduct = async (req, res) => {
//   try {
//     console.log("searchProduct triggered");
//     const { query } = req.query;
//     console.log(query);
//     console.log(req.session.sort);
//     let products;
//     if (req.session.category) {
//       products = await Product.find({
//         productName: { $regex: new RegExp(query, "i") },
//         isBlocked: false,
//         category: req.session.category,
//       });
//     } else if (req.session.sort) {
//       if (req.session.sort === "Price:High-Low") {
//         products = await Product.find({
//           productName: { $regex: new RegExp(query, "i") },
//           isBlocked: false,
//         }).sort({ salePrice: -1 });
//       } else if (req.session.sort === "Price:Low-High") {
//         products = await Product.find({
//           productName: { $regex: new RegExp(query, "i") },
//           isBlocked: false,
//         }).sort({ salePrice: 1 });
//       } else if (req.session.sort === "Name:A-Z") {
//         products = await Product.find({
//           productName: { $regex: new RegExp(query, "i") },
//           isBlocked: false,
//         }).sort({ productName: 1 });
//       } else if (req.session.sort === "Name:Z-A") {
//         products = await Product.find({
//           productName: { $regex: new RegExp(query, "i") },
//           isBlocked: false,
//         }).sort({ productName: -1 });
//       } else if (req.session.sort === "New-Arrivals") {
//         products = await Product.find({
//           productName: { $regex: new RegExp(query, "i") },
//           isBlocked: false,
//         }).sort({ createdAt: 1 });
//       }
//     } else {
//       products = await Product.find({
//         productName: { $regex: new RegExp(query, "i") },
//         isBlocked: false,
//       });
//     }

//     console.log(products);
//     const productOffers = await productOffer
//       .find({ "productOffer.offerStatus": true })
//       .populate("productOffer.product");
//     const categoryOffers = await categoryOffer
//       .find({ "categoryOffer.offerStatus": true })
//       .populate("categoryOffer.category");
//     const categories = await Category.find({ isListed: true });
//     res.json([products, productOffers, categoryOffers, categories]);
//   } catch (error) {
//     console.error("Error searching for products:", error);
//     res.status(500).json({ error: "Error searching for products" });
//   }
// };

// const filterProduct = async (req, res) => {
//   try {
//     console.log("filteredProduct triggered");
//     const categoryId = req.query.category;
//     const sort = req.query.sort;
//     console.log(categoryId);
//     req.session.category = categoryId;
//     // console.log(categoryId);
//     const user = req.session.id;
//     let products;

//     if (categoryId) {
//       products = await Product.find({
//         category: categoryId,
//         isBlocked: false,
//       });
//     } else {
//       products = await Product.find({
//         isBlocked: false,
//       });
//     }

//     const count = await Product.countDocuments();

//     const categories = await Category.find({ isListed: true });

//     const itemsPerPage = 3;
//     const currentPage = parseInt(req.query.page) || 1;
//     const startIndex = (currentPage - 1) * itemsPerPage;
//     const endIndex = startIndex + itemsPerPage;
//     const totalPages = Math.ceil(products.length / itemsPerPage);
//     const productsOnPage = products.slice(startIndex, endIndex);
//     const productLength = productsOnPage.length;
//     res.render("userView/shop-page", {
//       user: user,
//       products: productsOnPage,
//       sort: sort,
//       category: categories,
//       productLength: productLength,
//       count: count,
//       totalPages: totalPages,
//       currentPage: currentPage,
//     });
//   } catch (error) {
//     console.log(error.message);
//     res.status(500).send("Internal Server Error");
//   }
// };

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

module.exports = {
  getAddProductPage,
  addProducts,
  ProductList,
  adminSearchProduct,
  getEditProduct,
  editProduct,
  deleteSingleImage,
  getBlockProduct,
  getUnblockProduct,
  getProductDetailsPage,
  getShopPage,
  stockPage,
  updateStock,
};
// searchProduct,
// filterProduct,
