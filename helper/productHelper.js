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

const stockDecrease = async (cartItems) => {
  try {
    console.log('stockDecrease triggered');

    for (let i = 0; i < cartItems.length; i++) {
      const { item: productId, size, quantity } = cartItems[i];
      console.log(`productId: ${productId}, size: ${size}, quantity: ${quantity}`);
      const product = await Product.findById(productId);

      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      const sizeIndex = product.productSizes.findIndex((s) => s.size === size);

      if (sizeIndex === -1) {
        throw new Error(
          `Size ${size} not found for product ${product.productName}`
        );
      }

      const availableQuantity =
        product.productSizes[sizeIndex].quantity - quantity;

      if (availableQuantity >= 0) {
        product.productSizes[sizeIndex].quantity = availableQuantity;
      } else {
        throw new Error(
          `Insufficient stock for product ${product.productName} in size ${size}`
        );
      }

      // Save the product after updating individual size quantity
      await product.save();
    }

    // Update total quantity for each product
    const productIds = cartItems.map((item) => item.item);
    const products = await Product.find({ _id: { $in: productIds } });

    for (const product of products) {
      let totalQuantity = 0;

      for (const size of product.productSizes) {
        totalQuantity += size.quantity;
      }

      product.totalQuantity = totalQuantity;
      await product.save();
    }

    console.log("Stock decreased successfully");
    return true;
  } catch (error) {
    console.log("inside catch block");
    throw error;
  }
};

module.exports = {
  getAllProducts,
  getAllUnblockedProducts,
  stockDecrease,
};
