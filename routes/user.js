const express=require("express")
const router=express.Router();
var passport = require('passport');

const userController=require("../controllers/user");
const isAuth=require("../middleware/isAuth");

/* Login-Signup-Change Password-Google */
router.get("/login",userController.getLogin)
router.post("/login",userController.postLogin)
router.get("/google",passport.authenticate('google',{scope:["profile","email"]}))
router.get("/google/redirect",passport.authenticate('google',{ failureRedirect: '/user/login' }),userController.getGoogle)
router.post("/logout",userController.postLogout);
router.post("/signup",userController.postSignup)
router.post("/otp",userController.postOtp)
router.post("/forgot_email",userController.postForgotEmail)
router.post("/forgot_otp",userController.postForgotOtp)
router.post("/forgot_password",userController.postForgotPassword)

/* Profile */
router.get("/profile",isAuth.isUser,userController.getProfile)
router.put("/changePassword",isAuth.isUser,userController.putChangePassword)

/* Chat */
router.get("/chat",isAuth.isUser,userController.getChat)

/* Address */
router.get("/address",isAuth.isUser,userController.getAddress)
router.post("/add_address",isAuth.isUser,userController.postAddAddress)
router.delete("/deleteAddress/:id",isAuth.isUser,userController.deleteAddress)
router.put("/editAddress",isAuth.isUser,userController.putEditAddress)

/* Wishlist */
router.get("/wishlist",isAuth.isUser,userController.getWishList)
router.post("/addWishlist/:id",isAuth.isUser,userController.postaddWishlist)
router.delete("/deleteWishlist/:id",isAuth.isUser,userController.deleteWishlist)

/* Order */
router.get("/order",isAuth.isUser,userController.getOrder)
router.get("/orderDetails/:orderId",isAuth.isUser,userController.getOrderDetails)
router.put("/orderStatus/:orderId",isAuth.isUser,userController.putOrderStatus)
router.get("/invoice/:orderId",isAuth.isUser,userController.getInvoice)

/* Wallet */
router.get("/wallet",isAuth.isUser,userController.getWallet)

/* Coupon */
router.get("/coupon",isAuth.isUser,userController.getCoupon)
router.get("/checkCoupon",isAuth.isUser,userController.getCheckCoupon)

/* BuyNow */
router.post("/buyNow/:id",userController.postBuyNow)

/* Cart */
router.get("/cart",isAuth.isUser,userController.getCart)
router.post("/add_cart/:id",userController.postAddCart)
router.delete("/deleteCart/:id",userController.deleteCart)
router.patch("/updateQuantityCart/:id",userController.patchUpdateQuantityCart)

/* Checkout */
router.get("/checkout",isAuth.isUser,userController.getCheckout)
router.post("/checkout",isAuth.isUser,userController.postCheckout)

/* RazorPay */
router.post("/razorpay-createOrder",isAuth.isUser,userController.postCreateRazorPayOrder)
router.post("/razorpay-success",isAuth.isUser,userController.postRazorPaySuccess)
router.post("/razorpay-failure",isAuth.isUser,userController.postRazorPayFailure)

/* Paypal */
router.get("/paypal",isAuth.isUser,userController.getPaypal)
router.post("/create-order",isAuth.isUser,userController.postCreatePayPalOrder)
router.post("/capture-order",isAuth.isUser,userController.postCapturePayPalOrder)
router.post("/paypalPayment",isAuth.isUser,userController.postPayPalPayment)
router.post("/paypalFailed",isAuth.isUser,userController.postPayPalFailed)

module.exports=router