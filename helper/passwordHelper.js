const bcrypt = require("bcrypt");

const securePassword = async (password) => {
  try {
    console.log("securePassword triggered");
    const hashedPassword = await bcrypt.hash(password, 10);
    return hashedPassword;
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  securePassword,
};
