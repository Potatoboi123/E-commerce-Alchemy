const fs=require("fs")

const User=require("../models/user")
const Category=require("../models/category")
const Product=require("../models/product")
const Order=require("../models/orders.js")

exports.getLogin=(req,res,next)=>{
    res.render("admin/login")
}

exports.postLogin=(req,res,next)=>{
    const {name,password}=req.body;
    if(name===process.env.adminId&&password===process.env.adminPass){
        req.session.admin=name;
        res.redirect("/admin/dashboard");
    }
    else{
        res.redirect("/admin")
    }
}

exports.postLogout=(req,res,next)=>{
    req.session.destroy(err=>{
        console.log(err)
        res.redirect("/admin")
    })
}

exports.getDashboard=(req,res,next)=>{
    res.render("admin/dashboard");
}

exports.getUser=async (req,res,next)=>{
    try{
        const users=await User.find().sort({createdAt:-1});
        res.render("admin/user",{users});
    }catch(err){
        console.log(err)
    }
   
}

exports.patchUserStatus=async (req,res,next)=>{
    const userid=req.params.userid
    try{
        const user=await User.findById(userid)
        user.isBlocked=!user.isBlocked
        await user.save();
        res.status(200).json({message:"Success"})
    }catch(err){
        res.status(400).json({message:"Unexpected Error Occured"})
    }
}

exports.getCategory=async (req,res,next)=>{

    try{
        const categories=await Category.find().sort({createdAt:-1});
        let message=req.flash("error")
        res.render("admin/category",{categories,message})
    }catch(err){
        console.log(err)
    }
    
}

exports.patchCategoryStatus=async (req,res,next)=>{
    const categoryid=req.params.categoryid
    try{
        const category=await Category.findById(categoryid)
        category.isListed=!category.isListed
        await category.save();
        res.status(200).json({message:"Success"})
    }catch(err){
        res.status(400).json({message:"Unexpected Error Occured"})
    }
}

exports.postAddCategory=async (req,res,next)=>{
    try{
        let imageUrl;
        if(req.file){
            imageUrl=req.file.destination+req.file.filename;
        }else{
            req.flash('error', 'You Must Select An Image');
            res.redirect("/admin/category")
        }
        const name=req.body.name
        const existingCategory=await Category.findOne({ name: new RegExp('^' + name + '$', 'i') })
        if(!existingCategory){
           const category=new Category({
            name:name,
            image:imageUrl
        })
        await category.save();
        res.redirect("/admin/category") 
        }else{
            req.flash('error', 'Category Already Exists');
            res.redirect("/admin/category")
        }
        
    }catch(err){
        console.log("err")
    }
    
}

exports.postEditCategory=async (req,res,next)=>{
    try{
        const name=req.body.editname
        const id=req.body.category_id  
        const cat=await Category.find({$and:[{name:new RegExp('^' + name + '$', 'i')},{_id:{$ne:id}}]})
        if(cat.length>0){
            req.flash("error","Category Name Already Exists")
            return res.redirect("/admin/category")
        }
        const category=await Category.findById(id)
        if(req.file){
            const image=req.file;
            const imageUrl=image.destination+image.filename
            category.image=imageUrl
        }
        category.name=name;    
        await category.save()
        res.redirect("/admin/category")
    }catch(err){
        console.log(err.message)
    }
    
}

exports.getProduct=async (req,res,next)=>{
    const products=await Product.find().populate("category").sort({createdAt:-1});
    res.render("admin/product",{products});
}

exports.patchProductStatus=async (req,res,next)=>{
    const productid=req.params.productid
    try{
        const product=await Product.findById(productid)
        product.isListed=!product.isListed
        await product.save();
        res.status(200).json({message:"Success"})
    }catch(err){
        res.status(400).json({message:"Unexpected Error Occured"})
    }
}

exports.getAddProduct=async (req,res,next)=>{
    try{
        const categories=await Category.find();  
        res.render('admin/addproduct',{
            categories,
            errorMessage:req.flash("error")
        });
    }catch(err){
        console.log(err.message)
    }
    
}

exports.postAddProduct=async (req,res,next)=>{
    let imageUrl;
    /* let nameRegex = /^[a-zA-Z\s]+$/ */
    if(req.files&&req.files.length>0){
        imageUrl=req.files.map((image)=>"/"+image.destination+image.filename)
    }else{
        req.flash("error","Must Select Images")
        return res.redirect("/admin/add-product");
    }
    try{
        const {product_category,product_name,product_price,product_stock,product_description}=req.body
        if(product_price<0||product_stock<0/* ||!nameRegex.test(product_name) */){
            req.flash("error","Enter Valid Details")
            return res.redirect("/admin/add-product");
        }
        const category=await Category.findOne({name:product_category})
        const product=new Product({
            name:product_name,
            price:product_price,
            description:product_description,
            stock:product_stock,
            image:imageUrl,
            category:category._id

        })
        await product.save();
        
        res.redirect("/admin/product");
    }catch(err){
        console.log(err.message)
    }
    
}

exports.getEditProduct=async (req,res,next)=>{
    try{
        /* console.log(req.params.product_id) */
        const prodid=req.params.product_id
        const product= await Product.findById(prodid).populate("category")
        const categories=await Category.find(); 
        let message=req.flash("error") 
        res.render('admin/editproduct',{product,categories,message});
    }catch(err){
        console.log(err.message)
    }
}

exports.postEditProduct=async (req,res,next)=>{
    try{
        const {product_name,product_price/* ,product_discount */,product_category,product_id,product_stock,product_description,existingImage}=req.body
        const images=req.files;
        let finalImage=[];
        if(product_price<0||product_stock<0){      
            req.flash("error","Invalid Stock")
            return res.redirect('/admin/edit-product/'+product_id)
        }else if((!existingImage || (Array.isArray(existingImage) && existingImage.length<=0)) && images.length<=0 ){
            req.flash("error","Must Upload An Image")
            return res.redirect('/admin/edit-product/'+product_id)
        }
            const product= await Product.findById(product_id)
            const category=await Category.findOne({name:product_category})
            product.name=product_name
            product.price=product_price
            product.category=category
/*             product.discount=product_discount */
            product.description=product_description
            product.stock=product_stock
            if(images.length>0){
                let imageUrl=images.map((image)=>"/"+image.destination+image.filename)
                finalImage=[...imageUrl]
            }
            if(Array.isArray(existingImage)){
                finalImage=[...existingImage]
            }else{
                finalImage.push(existingImage)
            }
            product.image=finalImage
            await product.save();
            res.redirect('/admin/product');
        
        
    }catch(err){
        console.log(err.message)
    }
}

exports.getOrder=async (req,res,next)=>{
    const orders=await Order.find().sort({createdAt:-1});
    res.render("admin/order",{orders});
}

exports.patchOrderStatus=async (req,res,next)=>{

    const orderId = req.params.orderId;
    const { status,itemId } = req.body;

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Update order status based on the selected option
        order.items.forEach((item=>{
            if(item._id.toString()==itemId){

                if (status === "cancel") {
                    item.status = "Cancelled";
                } else if (status === "pending") {
                    item.status = "Pending";
                } else if (status === "Shipped") {
                    item.status = "shipped";
                } else if (status === "delivered") {
                    item.status = "Delivered";
                }

            }
        }))

        await order.save();
        return res.status(200).json({ message: "Order status updated successfully" });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }

}
exports.getBanner=async (req,res,next)=>{
    res.render("admin/banner")
}