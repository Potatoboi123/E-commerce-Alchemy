const express=require("express")
const router=express.Router();

const adminController=require("../controllers/admin")
const isAuth=require("../middleware/isAuth.js")

const multer=require("multer")
const fileStorage=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,"uploads/")
    },
    filename:(req,file,cb)=>{
        cb(null,Date.now()+'-'+file.originalname)
    }
})

const fileFilter=(req,file,cb)=>{
    if(file.mimetype === 'image/png'||file.mimetype === 'image/jpg'||file.mimetype === 'image/jpeg'){
        cb(null,true)
    }else{
        cb(null,false)
    }
}
const upload=multer({storage:fileStorage,fileFilter:fileFilter})

router.get("/",adminController.getLogin)
router.post("/login",adminController.postLogin)
router.post("/logout",isAuth.isAdmin,adminController.postLogout)
router.get("/dashboard",isAuth.isAdmin,adminController.getDashboard)
router.get("/user",isAuth.isAdmin,adminController.getUser)
router.patch("/user-status/:userid",adminController.patchUserStatus)
router.get("/category",isAuth.isAdmin,adminController.getCategory)
router.patch("/category-status/:categoryid",adminController.patchCategoryStatus)
router.get("/product",isAuth.isAdmin,adminController.getProduct)
router.patch("/product-status/:productid",adminController.patchProductStatus)
router.get("/banner",isAuth.isAdmin,adminController.getBanner)

router.get("/order",isAuth.isAdmin,adminController.getOrder)
router.patch("/updateOrderStatus/:orderId",isAuth.isAdmin,adminController.patchOrderStatus)

router.post("/add-category",isAuth.isAdmin,upload.single("image"),adminController.postAddCategory)
router.post("/edit-category",isAuth.isAdmin,upload.single("editimage"),adminController.postEditCategory)/* Change To PUT */
router.get("/add-product",isAuth.isAdmin,adminController.getAddProduct)
router.post("/add-product",isAuth.isAdmin,upload.array("product_image",8),adminController.postAddProduct)
router.get("/edit-product/:product_id",isAuth.isAdmin,adminController.getEditProduct)   
router.post("/edit-product",isAuth.isAdmin,upload.array("product_image",8),adminController.postEditProduct)/* Change To PUT */

module.exports=router