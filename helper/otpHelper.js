const generateOtp = async () => {
  console.log("generateOtp triggered");
  const digits = "1234567890";
  var otp = "";
  for (i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

//otp verification process




module.exports = {
  generateOtp,
};

