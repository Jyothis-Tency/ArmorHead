const generateRandomString = async (req, res) => {
  try {
    console.log("generateRandomString triggered");
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 15; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }
    return result;
  } catch (error) {
    console.log("failed to generate string");
  }
};

module.exports = {
  generateRandomString,
};