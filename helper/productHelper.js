const Product = require("../model/productModel");

const getAllProducts = async (page = 1, limit = 10) => {
  try {
    console.log("getAllProducts triggered");
    const startIndex = (page - 1) * limit;
    const result = await Product.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $skip: startIndex,
      },
      {
        $limit: limit,
      },
    ]);
    console.log(result);
    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);
    return { products: result, totalPages, currentPage: page };
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
    console.log("stockDecrease triggered");

    for (let i = 0; i < cartItems.length; i++) {
      const { productId, size, quantity } = cartItems[i];
      console.log(
        `productId: ${productId}, size: ${size}, quantity: ${quantity}`
      );

      const product = await Product.findById(productId);
      console.log(product);

      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      const sizeIndex = product.productSizes.findIndex((s) => s.size === size);
      console.log(`sizeIndex: ${sizeIndex}`);

      if (sizeIndex === -1) {
        throw new Error(
          `Size ${size} not found for product ${product.productName}`
        );
      }

      const availableQuantity =
        product.productSizes[sizeIndex].quantity - quantity;
      console.log(availableQuantity);
      const totalAvailableQuantity = product.totalQuantity - quantity;
      console.log(totalAvailableQuantity);

      if (availableQuantity >= 0) {
        product.productSizes[sizeIndex].quantity = availableQuantity;
        product.totalQuantity = totalAvailableQuantity;
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
    console.log(`productIds: ${productIds}`);
    const products = await Product.find({ _id: { $in: productIds } });
    console.log(`products: ${products}`);

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

const stockStatus = async (productId, size) => {
  try {
    // Find the product by productId
    const product = await Product.findById(productId);

    if (!product) {
      throw new Error("Product not found");
    }

    // Find the product size object with the specified size
    const productSize = product.productSizes.find(
      (sizeObj) => sizeObj.size === size
    );

    if (!productSize) {
      return "Out of Stock";
    }

    // Check if the quantity of the product size is greater than 0
    if (productSize.quantity > 0) {
      return "In Stock";
    } else {
      return "Out of Stock";
    }
  } catch (error) {
    console.error("Error in stockStatus:", error);
    throw new Error("Failed to check stock status");
  }
};

module.exports = {
  getAllProducts,
  getAllUnblockedProducts,
  stockDecrease,
  stockStatus,
};
