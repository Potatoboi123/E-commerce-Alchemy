# E-commerce Alchemy

This repository contains the source code for an E-commerce website built using Node.js, Express, EJS, and MongoDB. The application is designed to be scalable and secure, with features such as Google authentication, PayPal and Razorpay integration, and email notifications.

## Features

- User authentication and authorization (including Google OAuth)
- Admin panel for managing products and orders
- Product catalog with search and filter functionality
- Shopping cart and checkout process
- Payment processing with PayPal and Razorpay
- Order confirmation and notification emails

## Prerequisites

- Node.js
- MongoDB
- Google Cloud Console account (for Google OAuth)
- PayPal account (for payment processing)
- Razorpay account (for payment processing)
- Mailtrap account (for email testing)
- Domain name for email sending

## Environment Variables

Create a `.env` file in the root of your project and add the following fields:

```
adminId=YOUR_ADMIN_USERNAME
adminPass=YOUR_ADMIN_PASSWORD
MONGODB_URI=YOUR_MONGODB_URI
PORT=YOUR_PORT_NUMBER
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
USER_ID=YOUR_MAILTRAP_USER_ID
USER_PASSWORD=YOUR_MAILTRAP_USER_PASSWORD
DOMAIN_NAME=YOUR_DOMAIN_NAME
PAYPAL_CLIENT_ID=YOUR_PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET=YOUR_PAYPAL_CLIENT_SECRET
RAZORPAY_KEY_ID=YOUR_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_KEY_SECRET
```

## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/Potatoboi123/E-commerce-Alchemy.git
   ```

2. Navigate to the project directory:

   ```sh
   cd E-commerce-Alchemy
   ```

3. Install dependencies:

   ```sh
   npm install
   ```

4. Install `nodemon` globally if it is not already installed:

   ```sh
   npm i -g nodemon
   ```

## Running the Application

1. Start the application:

   ```sh
   npm start
   ```

2. Open your browser and navigate to `http://localhost:<YOUR_PORT_NUMBER>`.

## Usage

- Access the admin panel at `http://localhost:<YOUR_PORT_NUMBER>/admin` using the admin credentials specified in the `.env` file.
- Users can sign up, log in, browse products, add items to the cart, and proceed to checkout using PayPal or Razorpay.
- Order confirmation and notification emails will be sent using the Mailtrap service.

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

---

Feel free to adjust any details as needed!
