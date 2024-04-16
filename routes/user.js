const express=require("express")
const router=express.Router();
var passport = require('passport');

const userController=require("../controllers/user");
const isAuth=require("../middleware/isAuth");

router.get("/login",userController.getLogin)
router.post("/login",userController.postLogin)
router.get("/google",passport.authenticate('google',{scope:["profile","email"]}))
router.get("/google/redirect",passport.authenticate('google',{ failureRedirect: '/user/login' }),userController.getGoogle)
router.post("/logout",userController.postLogout)
router.post("/signup",userController.postSignup)
router.post("/otp",userController.postOtp)
router.post("/forgot_email",userController.postForgotEmail)
router.post("/forgot_otp",userController.postForgotOtp)
router.post("/forgot_password",userController.postForgotPassword)

router.get("/profile",isAuth.isUser,userController.getProfile)
router.get("/address",isAuth.isUser,userController.getAddress)
router.post("/add_address",isAuth.isUser,userController.postAddAddress)
router.delete("/deleteAddress/:id",isAuth.isUser,userController.deleteAddress)
router.put("/editAddress",isAuth.isUser,userController.putEditAddress)

router.get("/order",isAuth.isUser,userController.getOrder)
router.get("/orderDetails/:orderId",isAuth.isUser,userController.getOrderDetails)

router.post("/buyNow/:id",userController.postBuyNow)

router.get("/cart",isAuth.isUser,userController.getCart)
router.post("/add_cart/:id",userController.postAddCart)
router.delete("/deleteCart/:id",userController.deleteCart)
router.patch("/updateQuantityCart/:id",userController.patchUpdateQuantityCart)

router.get("/checkout",isAuth.isUser,userController.getCheckout)
router.post("/checkout",isAuth.isUser,userController.postCheckout)

module.exports=router