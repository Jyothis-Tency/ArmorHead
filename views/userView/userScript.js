// userProfile.js

document.addEventListener("DOMContentLoaded", () => {
  const changeAddressBtn = document.querySelector(".change-address-btn");
  const addressContainer = document.querySelector(".address");
  const allAddress = JSON.parse("<%- JSON.stringify(allAddress) %>");

  // Add event listener to the "Change Address" button
  changeAddressBtn.addEventListener("click", () => {
    // Get a random address from the allAddress array
    const randomIndex = Math.floor(Math.random() * allAddress.length);
    const newAddress = allAddress[randomIndex];

    // Update the displayed address
    addressContainer.innerHTML = `
      <h4>Edit Address</h4>
      <p>First Name: ${newAddress.firstName}</p>
      <p>Last Name: ${newAddress.lastName}</p>
      <p>House: ${newAddress.house}</p>
      <p>Locality: ${newAddress.locality}</p>
      <p>City: ${newAddress.city}</p>
      <p>State: ${newAddress.state}</p>
      <p>Pincode: ${newAddress.pincode}</p>
      <p>Country: ${newAddress.country}</p>
      <p>Email: ${newAddress.email}</p>
      <p>Phone: ${newAddress.phone}</p>
    `;
  });
});
