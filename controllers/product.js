const Category=require("../models/category.js")
const Product=require("../models/product.js")
const Cart=require("../models/cart.js")

const ITEMS_PER_PAGE=9;

exports.getLandingPage=async (req,res,next)=>{
    
    if(req.session.user)
    return res.redirect("/home")

    const categories= await Category.find();
    const products=await Product.find({isListed:true}).populate("category");
    const display_products=products.slice(0,8)

    res.render("product/landingPage",{categories,display_products})
}

exports.getHome=async (req,res,next)=>{

    const categories= await Category.find().limit(6);
    const products=await Product.find({isListed:true}).limit(8).populate("category");
    const display_products=products.slice(0,8)
    res.render("product/home",{categories,display_products})
}

exports.getProductDetails=async (req,res,next)=>{   
    try{
        let productInCart;
        const id=req.params.prodid
        const product=await Product.findById(id).populate("category");
        const cart=await Cart.findOne({user:req.session.user||"663a2b00293758b81d67eb0a"})
        const index=cart.items.findIndex((val)=>{
            return val.product.toString()===product._id.toString()
        })
        if(index>=0){
            productInCart=true
        }else{
            productInCart=false
        }
        res.render("product/productdetail",{product,productInCart})
    }catch(err){
        console.log(err)
    }

}

exports.getProductList=async (req,res,next)=>{   

    let action=req.params.action;
    const page=+req.query.page||1;
    const search=req.query.search
    let searchquery;
    if(search){
        searchquery=true;
    }
    try{
        let product_count;
        const products=await filterProducts(action,page,search,searchquery)
        product_count=await Product.find({isListed:true}).countDocuments();
        if(searchquery){
            product_count=await Product.find({isListed:true,name:{ $regex: '^' + search, $options:'i'}}).countDocuments();
        }

        res.render("product/productlist",{
            products,
            currentPage: page,
            hasNextPage: (page*ITEMS_PER_PAGE)<product_count,
            hasPreviousPage: page>1,
            nextPage: page+1,
            previousPage: page-1,
            lastPage:Math.ceil(product_count / ITEMS_PER_PAGE),
            action:action,
            search: (search)?search : ""
        })
    }catch(err){
        console.log(err)
    }
}
    
async function filterProducts(action,page,search,searchquery){   
        let products;
        if(action==="lowToHigh"&&searchquery){
            products=await Product.find({isListed:true,name:{ $regex: '^' + search, $options:'i'}}).sort({price:1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");  
        }else if(action==="highToLow"&&searchquery){
            products=await Product.find({isListed:true,name:{ $regex: '^' + search, $options:'i'}}).sort({price:-1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }else if(action==="newArrivals"&&searchquery){
            products=await Product.find({isListed:true,name:{ $regex: '^' + search, $options:'i'}}).sort({_id:-1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }else if(action==="aA-Zz"&&searchquery){
            products=await Product.find({isListed:true,name:{ $regex: '^' + search, $options:'i'}}).sort({name:1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }else if(action==="Zz-aA"&&searchquery){
            products=await Product.find({isListed:true,name:{ $regex: '^' + search, $options:'i'}}).sort({name:-1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }else if(action==="lowToHigh"){
            products=await Product.find({isListed:true}).sort({price:1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");  
        }else if(action==="highToLow"){
            products=await Product.find({isListed:true}).sort({price:-1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }else if(action==="newArrivals"){
            products=await Product.find({isListed:true}).sort({_id:-1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }else if(action==="aA-Zz"){
            products=await Product.find({isListed:true}).sort({name:1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }else if(action==="Zz-aA"){
            products=await Product.find({isListed:true}).sort({name:-1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }else if(searchquery){
            products=await Product.find({isListed:true,name:{ $regex: '^' + search, $options:'i'}}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category")
        }
        else{
            products=await Product.find({isListed:true}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }
        return products;       
}

