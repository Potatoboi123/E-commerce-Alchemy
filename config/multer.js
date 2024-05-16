const multer=require("multer")
const Product=require('../models/product.js')
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

const checkMulter=async (req,res,next)=>{
/*     const product= await Product.findById(product_id)
    if(product.image.length+req.files.length>5){
        req.flash("error","Maximum image for a product is 5.")
        return res.redirect('/admin/edit-product/'+product_id)
    } */
    upload.array('product_image', 5)(req, res, (err) => {
        const {product_id}=req.body
    if (err instanceof multer.MulterError) {
        // Multer-specific errors
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            req.flash("error","Too many files to upload. Maximum is 5.")
            return res.redirect('/admin/edit-product/'+product_id)
        }
    } else if (err) {
        req.flash("error","Error Encountered.")
        return res.redirect('/admin/edit-product/'+product_id)
    }
    next();
})
}

module.exports={
    upload,
    checkMulter
}