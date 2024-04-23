const mongoose = require("mongoose");
const Product = require("../model/productModel");
const Category = require("../model/categoryModel");
const ProductOffer = require("../model/productOfferModel");
const CategoryOffer = require("../model/categoryOfferModel");

const getAllProductOffers = async (req, res) => {
  try {
    console.log("getAllProductOffers");
    const prodoffers = await ProductOffer.find({
      "productOffer.offerStatus": true,
    }).populate("productOffer.product");
    const products = await Product.find({});
    res.render("adminView/productOffer", { prodoffers, products });
  } catch (error) {
    console.error("ERROR!!!!! :", error);
  }
};

const addProductOffer = async (req, res) => {
  try {
    console.log("addProductOffer triggered");
    const { name, product, discount, startingDate, endingDate } = req.body;
    console.log(
      "req.body: ",
      name,
      product,
      discount,
      startingDate,
      endingDate
    );
    const newOffer = new ProductOffer({
      name: name,
      startingDate: startingDate,
      endingDate: endingDate,
      productOffer: {
        product: product,
        offerStatus: true,
      },
      discount: discount,
    });
    await newOffer.save();
    const existingProduct = await Product.findById(product);
    console.log(existingProduct);
    if (!existingProduct) {
      return res.status(404).send("Product not found");
    }
    const existingProductOffer = await ProductOffer.findOne({
      "productOffer.product": product,
    });
    if (!existingProductOffer) {
      return res.status(404).send("Product offer not found");
    }
    const currentSalePrice = existingProduct.regularPrice;
    const offerDiscount = existingProductOffer.discount;
    const newSalePrice = currentSalePrice - offerDiscount;
    existingProduct.salePrice = newSalePrice;
    await existingProduct.save();
    res.redirect("/admin/productOffer");
  } catch (error) {
    console.error("Error adding product offer:", error);
    res.status(500).send("Internal Server Error");
  }
};

const editProductOffer = async (req, res) => {
  try {
    const offerId = req.body.offerId;
    const existingOffer = await ProductOffer.findById(offerId);
    if (!existingOffer) {
      return res.status(404).send("Offer not found");
    }
    const { name, product, discount, startingDate, endingDate } = req.body;
    const oldDiscount = existingOffer.discount;
    existingOffer.name = name;
    existingOffer.startingDate = startingDate;
    existingOffer.endingDate = endingDate;
    existingOffer.discount = discount;
    await existingOffer.save();
    const productToUpdate = await Product.findById(
      existingOffer.productOffer.product
    );
    if (!productToUpdate) {
      return res.status(404).send("Product not found");
    }
    productToUpdate.salePrice += oldDiscount - discount;
    await productToUpdate.save();
    res.redirect("/admin/productOffer");
  } catch (error) {
    console.error("Error editing product offer:", error);
    res.status(500).send("Internal Server Error");
  }
};

const deleteProductOffer = async (req, res) => {
  try {
    console.log("deleteProductOffer triggered");
    const offerId = req.params.offerId;
    const deletedOffer = await ProductOffer.findById(offerId);
    const productId = deletedOffer.productOffer.product;
    const offerDiscount = deletedOffer.discount;
    const affectedProduct = await Product.findById(productId);
    const currentSalePrice = affectedProduct.salePrice;
    const newSalePrice = currentSalePrice + offerDiscount;
    affectedProduct.salePrice = newSalePrice;
    await affectedProduct.save();
    await deletedOffer.deleteOne();
    res.redirect("/admin/productOffer");
  } catch (error) {
    console.error("Error deleting product offer:", error);
    res.status(500).send("Internal Server Error");
  }
};

const allCategoryOffer = async (req, res) => {
  try {
    const catoffers = await CategoryOffer
      .find({ "categoryOffer.offerStatus": true })
      .populate("categoryOffer.category");
    const categories = await Category.find({});
    res.render("adminView/categoryOffer", { catoffers, categories: categories });
  } catch (error) {
    console.error("Error fetching product offers:", error);
    res.status(500).send("Internal Server Error");
  }
};

const addCategoryOffer = async (req, res) => {
  try {
    const { name, category, discount, startingDate, endingDate } = req.body;
    const newOffer = new CategoryOffer({
      name: name,
      startingDate: startingDate,
      endingDate: endingDate,
      categoryOffer: {
        category: category,
        offerStatus: true,
      },
      discount: discount,
    });
    await newOffer.save();
    const productsToUpdate = await Product.find({ category: category });
    for (let i = 0; i < productsToUpdate.length; i++) {
      const productToUpdate = productsToUpdate[i];
      const oldSalePrice = productToUpdate.salePrice;
      const newSalePrice = oldSalePrice - discount;
      productToUpdate.salePrice = newSalePrice;
      await productToUpdate.save();
    }
    res.redirect("/admin/categoryOffer");
  } catch (error) {
    console.error("Error adding product offer:", error);
    res.status(500).send("Internal Server Error");
  }
};

const editCategoryOffer = async (req, res) => {
  try {
    const offerId = req.body.offerId;
    const existingOffer = await CategoryOffer.findById(offerId);
    if (!existingOffer) {
      return res.status(404).send("Offer not found");
    }
    const { name, category, discount, startingDate, endingDate } = req.body;
    const oldDiscount = existingOffer.discount;
    existingOffer.name = name;
    existingOffer.startingDate = startingDate;
    existingOffer.endingDate = endingDate;
    existingOffer.discount = discount;
    await existingOffer.save();
    const discountDifference = oldDiscount - discount;
    const productsToUpdate = await Product.find({ category: category });
    for (const productToUpdate of productsToUpdate) {
      productToUpdate.salePrice += discountDifference;
      await productToUpdate.save();
    }
    res.redirect("/admin/categoryOffer");
  } catch (error) {
    console.error("Error editing category offer:", error);
    res.status(500).send("Internal Server Error");
  }
};

const deleteCategoryOffer = async (req, res) => {
  try {
    const offerId = req.params.offerId;
    const deletedOffer = await CategoryOffer.findById(offerId);
    if (!deletedOffer) {
      return res.status(404).send("Category offer not found");
    }
    const categoryId = deletedOffer.categoryOffer.category;
    const offerDiscount = deletedOffer.discount;
    const productsToUpdate = await Product.find({ category: categoryId });
    for (let i = 0; i < productsToUpdate.length; i++) {
      const productToUpdate = productsToUpdate[i];
      productToUpdate.salePrice += offerDiscount;
      await productToUpdate.save();
    }
    await deletedOffer.deleteOne();
    res.redirect("/admin/categoryOffer");
  } catch (error) {
    console.error("Error deleting category offer:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  getAllProductOffers,
  addProductOffer,
  editProductOffer,
  deleteProductOffer,
  allCategoryOffer,
  addCategoryOffer,
  editCategoryOffer,
  deleteCategoryOffer,
};