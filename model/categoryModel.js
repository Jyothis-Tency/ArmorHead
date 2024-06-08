const Mongoose = require("mongoose");
const categorySchema = Mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    catOff: {
      type: Boolean,
      default: false,
    },
    isListed: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Category = Mongoose.model("Category", categorySchema);

module.exports = Category;
