const WishList = require("../model/wishlistModel");
const Product = require("../model/productModel");
const mongoose = require("mongoose");

const getAllWishlistProducts = async (userId) => {
  try {
    return await WishList.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.productItemId",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $addFields: {
          product: { $arrayElemAt: ["$product", 0] },
          size: "$products.size",
        },
      },
      { $project: { item: "$products.productItemId", product: 1, size: 1 } },
    ]);
  } catch (error) {
    console.error("Error in getAllWishlistProducts:", error);
    throw new Error("Failed to get wishlist products");
  }
};

const getWishListCount = async (userId) => {
  try {
    let wishlist = await WishList.findOne({ user: userId });
    let wishlistCount = 0;
    if (wishlist) {
      const productIds = wishlist.products.map(
        (product) => product.productItemId
      );
      wishlistCount = productIds.length;
    }
    return wishlistCount;
  } catch (error) {
    console.error("Error in getWishListCount:", error);
    throw new Error("Failed to get wishlist count");
  }
};

const addItemToWishlist = async (productId, userId, size) => {
  try {
    console.log("addItemToWishlist triggered");

    const product = await Product.findOne({ _id: productId });
    if (!product || product.isBlocked) {
      console.log("Product Not Found or Blocked");
      throw new Error("Product Not Found or Blocked");
    }

    // Check if the provided size is valid for the product
    const validSize = product.productSizes.find((s) => s.size === size);
    if (!validSize) {
      throw new Error("Invalid Size for this Product");
    }

    // Check if the product already exists in the wishlist
    const existingItem = await WishList.findOne({
      user: userId,
      "products.productItemId": productId,
    });
    if (existingItem) {
      // Check if the same size exists for the product in the wishlist
      const sizeExists = existingItem.products.some((item) => {
        return item.size === size;
      });
      if (sizeExists) {
        throw new Error(
          "Product already exists in the wishlist with the same size"
        );
      }
    }

    // Update or insert the product into the wishlist
    const wishlist = await WishList.updateOne(
      { user: userId },
      { $push: { products: { productItemId: productId, size: size } } },
      { upsert: true }
    );

    return wishlist;
  } catch (error) {
    // Return error message to handle in the main code
    return { error: error.message };
  }
};

const removeProductFromWishlist = async (userId, productId) => {
  try {
    console.log("removeProductFromWishlist triggered");
    const result = await WishList.updateOne(
      {
        user: new mongoose.Types.ObjectId(userId),
      },
      {
        $pull: {
          products: {
            productItemId: productId,
          },
        },
      }
    );
    return result;
  } catch (error) {
    console.error("Error in removeProductFromWishlist:", error);
    throw new Error("Failed to remove product from wishlist");
  }
};

module.exports = {
  getAllWishlistProducts,
  getWishListCount,
  addItemToWishlist,
  removeProductFromWishlist,
};
