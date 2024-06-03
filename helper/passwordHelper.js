const bcrypt = require("bcryptjs");
const argon2 = require('argon2')

// const securePassword = async (password) => {
//   try {
//     console.log("securePassword triggered");
//     const hashedPassword = await bcrypt.hash(password, 10);
//     return hashedPassword;
//   } catch (error) {
//     console.log(error.message);
//   }
// };

const securePassword = async (password) => {
  try {
    console.log("securePassword triggered");
    const hashedPassword = await argon2.hash(password);
    return hashedPassword;
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  securePassword,
};
