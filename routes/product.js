const express=require("express")
const router=express.Router();

const productController=require("../controllers/product")

router.get("/",productController.getLandingPage)
router.get("/home",productController.getHome)

module.exports=router;