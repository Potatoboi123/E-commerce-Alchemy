const express=require("express")
const router=express.Router();

const productController=require("../controllers/product")
const isAuth=require("../middleware/isAuth")

router.get("/",productController.getLandingPage)
router.get("/home",isAuth.isUser,productController.getHome)
router.get("/product-details/:prodid",isAuth.isUser,productController.getProductDetails)
router.get("/product-list/:action",isAuth.isUser,productController.getProductList)

module.exports=router;