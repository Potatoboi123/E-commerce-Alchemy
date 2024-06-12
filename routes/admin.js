const express=require("express")
const router=express.Router();

const adminController=require("../controllers/admin")
const isAuth=require("../middleware/isAuth.js")
const multer=require("../config/multer.js")

/* Login */
router.get("/",adminController.getLogin)
router.post("/login",adminController.postLogin)
router.post("/logout",isAuth.isAdmin,adminController.postLogout)

/* Dashboard */
router.get("/dashboard",isAuth.isAdmin,adminController.getDashboard)

/* User */
router.get("/user",isAuth.isAdmin,adminController.getUser)
router.patch("/user-status/:userid",adminController.patchUserStatus)

/* Order */
router.get("/order",isAuth.isAdmin,adminController.getOrder)
router.patch("/updateOrderStatus/:orderId",isAuth.isAdmin,adminController.patchOrderStatus)

/* Category */
router.get("/category",isAuth.isAdmin,adminController.getCategory)
router.patch("/category-status/:categoryid",adminController.patchCategoryStatus)
router.post("/add-category",isAuth.isAdmin,multer.upload.single("image"),adminController.postAddCategory)
router.post("/edit-category",isAuth.isAdmin,multer.upload.single("editimage"),adminController.postEditCategory)/* Change To PUT */
router.patch("/categoryDiscount",isAuth.isAdmin,adminController.patchCategoryDiscount)

/* Product */
router.get("/product",isAuth.isAdmin,adminController.getProduct)
router.patch("/product-status/:productid",adminController.patchProductStatus)
router.get("/add-product",isAuth.isAdmin,adminController.getAddProduct)
router.post("/add-product",isAuth.isAdmin,multer.checkMulter,adminController.postAddProduct)
router.get("/edit-product/:product_id",isAuth.isAdmin,adminController.getEditProduct)   
router.post("/edit-product",isAuth.isAdmin,multer.checkMulter,adminController.postEditProduct)/* Change To PUT */
router.patch("/discount",isAuth.isAdmin,adminController.patchProductDiscount)

/* Coupon */
router.get("/coupon",isAuth.isAdmin,adminController.getCoupon)
router.post("/add-coupon",isAuth.isAdmin,adminController.postAddCoupon)
router.delete("/deleteCoupon/:id",isAuth.isAdmin,adminController.deleteCoupon)
router.put("/edit-coupon",isAuth.isAdmin,adminController.putEditCoupon)

/* Sales Report */
router.get("/sales",isAuth.isAdmin,adminController.getSalesReport)
router.get("/salesPdf",isAuth.isAdmin,adminController.getSalesReportPdf)
router.get("/salesExcel",isAuth.isAdmin,adminController.getSalesReportExcel)

/* Chat */
router.get("/chat",isAuth.isAdmin,adminController.getChat)

module.exports=router