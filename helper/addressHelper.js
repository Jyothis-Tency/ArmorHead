const Address = require("../model/addressModel");
const ObjectId = require("mongoose").Types.ObjectId;

const addAddress = async (addressDetails, userData) => {
  try {
    const userId = userData._id;

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

    const updatedAddress = await newAddress.save();

    return updatedAddress;
  } catch (error) {
    console.error("Error adding address:", error);
    throw error;
  }
};

const findAnAddress = async (_id) => {
  try {
    const result = await Address.findOne({ _id: _id });
    return result;
  } catch (error) {
    throw error;
  }
};

const findAllAddress = async (userId) => {
  try {
    const result = await Address.find({ userId: userId });
    return result;
  } catch (error) {
    console.error("Error finding addresses:", error);
    throw error;
  }
};

const editAddress = async (addressDetails) => {
  try {
    console.log("editAddress triggered");
    // Convert userId string to ObjectId
    const addressId = String(addressDetails._id);
    console.log(addressId);

    // Check if an address document with the given userId exists
    const existingAddress = await Address.findById(addressId);
    console.log(existingAddress);

    if (existingAddress) {
      // If an existing address is found, update its fields
      existingAddress.firstName = addressDetails.firstName;
      existingAddress.lastName = addressDetails.lastName;
      existingAddress.house = addressDetails.house;
      existingAddress.locality = addressDetails.locality;
      existingAddress.city = addressDetails.city;
      existingAddress.state = addressDetails.state;
      existingAddress.pincode = addressDetails.pincode;
      existingAddress.country = addressDetails.country;
      existingAddress.email = addressDetails.email;
      existingAddress.phone = addressDetails.phone;

      // Save the updated address document
      const updatedAddress = await existingAddress.save();

      return updatedAddress;
      

    } else {
       throw new Error("Address not found");
    }
  } catch (error) {
    console.error("Error adding address:", error);
    throw error;
  }
};

module.exports = {
  addAddress,
  findAnAddress,
  findAllAddress,
  editAddress,
};
