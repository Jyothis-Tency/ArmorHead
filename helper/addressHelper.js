const Address = require("../model/addressModel");
const ObjectId = require("mongoose").Types.ObjectId;

const addAddress = async (addressDetails,userData) => {
  try {
    console.log("addAddress triggered");
    // Convert userId string to ObjectId
    const userId = userData._id
    console.log(userId);

    // Create a new address document
    const newAddress = new Address({
      userId: userId,
      firstName: addressDetails.firstName,
      lastName: addressDetails.lastName,
      house: addressDetails.house,
      locality: addressDetails.locality,
      city: addressDetails.city,
      state: addressDetails.state,
      pincode: addressDetails.pincode,
      country: addressDetails.country,
      email: addressDetails.email,
      phone: addressDetails.phone,
    });

    // Save the new address document
    const updatedAddress = await newAddress.save();

    return updatedAddress;
  } catch (error) {
    console.error("Error adding address:", error);
    throw error;
  }
};


const findAnAddress = async (userId) => {
  try {
    const result = await Address.findOne({ userId: userId });
    return result;
  } catch (error) {
    throw error;
  }
};

const findAllAddress = async (userId) => {
  try {
    const result = await Address.find({ userId: userId });
    // console.log(result);
    return result;
  } catch (error) {
    console.error("Error finding addresses:", error);
    throw error; // Throw the error for handling
  }
};

module.exports = {
  addAddress,
  findAnAddress,
  findAllAddress,
};