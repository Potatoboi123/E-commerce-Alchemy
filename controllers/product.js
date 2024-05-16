const Category=require("../models/category.js")
const Product=require("../models/product.js")
const Cart=require("../models/cart.js")
const Wishlist=require("../models/wishlist.js")
const User=require("../models/user.js")

const ITEMS_PER_PAGE=9;

exports.getHome=async (req,res,next)=>{
    let userName;
    (req.session.user) ? userName=true : userName=false
    const categories= await Category.find().limit(6);
    const products=await Product.find({isListed:true}).limit(8).populate("category");
    const wishlist=await Wishlist.findOne({user:req.session.user})
    const display_products=products.slice(0,8)
    res.render("product/home",{categories,display_products,userName,wishlist})
}

exports.getProductDetails=async (req,res,next)=>{   
    try{
        let productInCart,cart,index,userName;
        const id=req.params.prodid
        const product=await Product.findById(id).populate("category");

        if(req.session.user){

            cart=await Cart.findOne({user:req.session.user})
            index=cart.items.findIndex((val)=>{
                return val.product.toString()===product._id.toString()
            })
            if(index>=0){
                productInCart=true
            }else{
                productInCart=false
            }
            userName=true;
        }else{
            userName=false;
        }
        res.render("product/productdetail",{product,productInCart,userName})
    }catch(err){
        console.log(err)
    }

}

exports.getProductList=async (req,res,next)=>{   
    const category=req.query.category;
    let action=req.params.action;
    const page=+req.query.page||1;
    const search=req.query.search;
    let searchquery,userName;
    if(search){
        searchquery=true;
    }
    (req.session.user) ? userName=true : userName=false
    try{
        let product_count;
        const wishlist=await Wishlist.findOne({user:req.session.user})
        const categories=await Category.find({isListed:true});
        const products=await filterProducts(action,page,search,searchquery,category)
        if(category&&searchquery){
            product_count=await Product.find({isListed:true,name: { $regex: search, $options: 'i' },category:category}).countDocuments();
        }else if(searchquery){
            product_count=await Product.find({isListed:true,name: { $regex: search, $options: 'i' }}).countDocuments();
        }else if(category){
            product_count=await Product.find({isListed:true,category:category}).countDocuments();
        }else{
            product_count=await Product.find({isListed:true}).countDocuments();
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
            search: (search)?search : "",
            wishlist:wishlist,
            categories:categories,
            category:(category)?category : "",
            userName:userName
        })
    }catch(err){
        console.log(err)
    }
}
    
async function filterProducts(action,page,search,searchquery,category){   
        let products;
        let filter;
        if(action==="lowToHigh"&&searchquery){
            (category)? filter={isListed:true,name: { $regex: search, $options: 'i' },category:category} : filter={isListed:true,name: { $regex: search, $options: 'i' }}
            products=await Product.find(filter).sort({discountPrice:1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");  
        }else if(action==="highToLow"&&searchquery){
            (category)? filter={isListed:true,name: { $regex: search, $options: 'i' },category:category} : filter={isListed:true,name: { $regex: search, $options: 'i' }}
            products=await Product.find(filter).sort({discountPrice:-1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }else if(action==="newArrivals"&&searchquery){
            (category)? filter={isListed:true,name: { $regex: search, $options: 'i' },category:category} : filter={isListed:true,name: { $regex: search, $options: 'i' }}
            products=await Product.find(filter).sort({_id:-1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }else if(action==="aA-Zz"&&searchquery){
            (category)? filter={isListed:true,name: { $regex: search, $options: 'i' },category:category} : filter={isListed:true,name: { $regex: search, $options: 'i' }}
            products=await Product.find(filter).sort({name:1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }else if(action==="Zz-aA"&&searchquery){
            (category)? filter={isListed:true,name: { $regex: search, $options: 'i' },category:category} : filter={isListed:true,name: { $regex: search, $options: 'i' }}
            products=await Product.find(filter).sort({name:-1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }else if(action==="stock"&&searchquery){
            (category)? filter={isListed:true,name: { $regex: search, $options: 'i' },category:category,stock:{$ne:0}} : filter={isListed:true,name: { $regex: search, $options: 'i' },stock:{$ne:0}}
            products=await Product.find(filter).sort({name:-1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }else if(action==="lowToHigh"){
            (category)? filter={isListed:true,category:category} : filter={isListed:true}
            products=await Product.find(filter).sort({discountPrice:1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");  
        }else if(action==="highToLow"){
            (category)? filter={isListed:true,category:category} : filter={isListed:true}
            products=await Product.find(filter).sort({discountPrice:-1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }else if(action==="newArrivals"){
            (category)? filter={isListed:true,category:category} : filter={isListed:true}
            products=await Product.find(filter).sort({_id:-1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }else if(action==="aA-Zz"){
            (category)? filter={isListed:true,category:category} : filter={isListed:true}
            products=await Product.find(filter).sort({name:1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }else if(action==="Zz-aA"){
            (category)? filter={isListed:true,category:category} : filter={isListed:true}
            products=await Product.find(filter).sort({name:-1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }else if(action==="stock"){
            (category)? filter={isListed:true,category:category,stock:{$ne:0}} : filter={isListed:true,stock:{$ne:0}}
            products=await Product.find(filter).sort({name:-1}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }else if(searchquery){
            (category)? filter={isListed:true,name: { $regex: search, $options: 'i' },category:category} : filter={isListed:true,name: { $regex: search, $options: 'i' }}
            products=await Product.find(filter).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category")
        }else if(category){
            products=await Product.find({isListed:true,category:category}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }else{
            products=await Product.find({isListed:true}).skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).populate("category");
        }
        return products;       
}

