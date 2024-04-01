const currencyFormatter = async (amount) => {
  try {
    const formattedAmount = Number(amount).toLocaleString("en-in", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    });
    return formattedAmount;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  currencyFormatter,
};