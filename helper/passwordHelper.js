const bcrypt = require("bcryptjs");

const securePassword = async (password) => {
  try {
    console.log("securePassword triggered");
    console.log("password:", password);
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("hashedPassword:", hashedPassword);
    return hashedPassword;
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  securePassword,
};
