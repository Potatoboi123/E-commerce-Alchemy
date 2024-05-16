const express=require("express")
const router=express.Router();

const productController=require("../controllers/product")
const isAuth=require("../middleware/isAuth")

router.get("/",productController.getHome)
router.get("/product-details/:prodid",productController.getProductDetails)
router.get("/product-list/:action",productController.getProductList)

module.exports=router;