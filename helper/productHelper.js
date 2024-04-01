const Product = require("../model/productModel");

const getAllProducts = async () => {
  try {
    console.log("getAllProducts triggered");
    const result = await Product.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
    ]);
    console.log(result);
    return result;
  } catch (error) {
    console.log(error);
    throw error; // Re-throw the error to be caught by the caller
  }
};

const getAllUnblockedProducts = async () => {
  try {
    console.log("getAllUnblockedProducts triggered");
    const unblockedProducts = await Product.find({ isBlocked: false });
    return unblockedProducts;
  } catch (error) {
    throw new Error("Error fetching unblocked products: " + error.message);
  }
};

module.exports = {
  getAllProducts,
  getAllUnblockedProducts,
};
