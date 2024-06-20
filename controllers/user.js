const bcrypt=require("bcrypt")
const validator=require("validator")
const {authenticator}=require("otplib")
const nodemailer = require("nodemailer");
const crypto=require("crypto")
const path=require("path")
const fs=require("fs")


const User=require("../models/user.js")
const Address=require("../models/address.js")
const Cart=require("../models/cart.js")
const Wishlist=require("../models/wishlist.js")
const Product=require("../models/product.js")
const Order=require("../models/orders.js")
const BuyNow=require("../models/buynow.js")
const Coupon=require("../models/coupon.js")

const { client } = require('../config/paypal-setup.js');
const paypal = require("@paypal/checkout-server-sdk");
const PDFDocument = require('pdfkit');
const Razorpay = require('razorpay');
const { Console } = require("console");

let timer;
var instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})

const transporter = nodemailer.createTransport({
    service:"gmail",
    auth: {
        user: process.env.USER,
        pass: process.env.USER_PASSWORD,
    },
});

function otpgeneretor(signup_email){

    let secret = authenticator.generateSecret();
    let token = authenticator.generate(secret);
        const info ={
            from:{
                name:"Alchemy",
                address:process.env.USER
            }, // sender address
            to: signup_email , // list of receivers
            subject: "Verification Code", // Subject line
            text: `Your Verification Code is ${token}`, // plain text body
            html: `<b>Your Verification Code is ${token}</b>`, // html body
            };
            return {
                info,
                token
            }
        }


exports.getLogin=(req,res,next)=>{
    if(req.session.user)
    return res.redirect("/")
    res.render("user/userlogin")
}

exports.postLogin=async (req,res,next)=>{
    const {signin_email,signin_password}=req.body;
    try{
        const user=await User.findOne({email:signin_email})
        if(!user){
            return res.status(404).json({message:"Invalid Username Or Password"})
        }
        if(user.googleId){
            return res.status(401).json({message:"Account Signed in With Google"})
        }
        const pass=await bcrypt.compare(signin_password,user.password)
            if(pass&& !user.isBlocked){
                req.session.user=user._id;
                return res.status(200).json({message:"Success"})
            }else if(user.isBlocked){
                return res.status(401).json({message:"You are Blocked"})
            }else{
                return res.status(401).json({message:"Invalid Username Or Password"})
            }
    }catch(err){
        console.log(err.message)
        return res.status(401).json({message:err.message})
    }   
}

exports.getGoogle=(req,res,next)=>{
    req.session.user=req.user._id
    res.redirect("/")
}

exports.postLogout=async (req,res,next)=>{
    if(req.user){
        req.logout(function(err) {
            if (err) console.log(err);   
        })
        return res.redirect("/")
    }
    req.session.destroy(err=>{
        console.log(err)
        res.redirect("/")
    })
}

exports.postSignup=async (req,res,next)=>{
    
    const {formdata:{signup_name,signup_email,signup_password,signup_referral}}=req.body
    
    try{
            const exist=await User.findOne({email:signup_email})
            if(exist){
                return res.status(409).json({message:"User Already Exists"})
            }
            else if(!signup_email||!signup_password){
                return res.status(400).json({message:"All Fields Must Be Filled"})
            }
            else if(!validator.isEmail(signup_email)){
                return res.status(400).json({message:"Email not valid"})
            }
            else if(!validator.isStrongPassword(signup_password)){
                return res.status(400).json({message:"Password Not Strong Enough"})
            }
            else{
                if(signup_referral){
                    const referral=User.findOne({referralCode:signup_referral});
                    if(!referral)
                    return res.status(404).json({message:"Invalid Referral Code"})
                }

                const value=otpgeneretor(signup_email)
                await transporter.sendMail(value.info)
                req.session.data={signup_name,signup_email,signup_password,signup_referral}
                req.session.otp=value.token;
                timer=setTimeout(()=>{ 
                    delete req.session.otp;
                },60000);
                return res.status(200).json({message:"Verification Code Send"});  
            } 
    }catch(err){
        console.log(err)
        res.status(400).json({message:"failed"})
    }
    
}

exports.postOtp=async (req,res,next)=>{

    const otp=req.body.formdata.otp 
    const action=req.body.action
    
    try{
        if(action){
        const value=otpgeneretor(req.session.data.signup_email)
        await transporter.sendMail(value.info)
        req.session.otp=value.token;
        clearTimeout(timer);
        timer=setTimeout(()=>{ delete req.session.otp},60000);
        return res.status(200).json({message:"Enter The New Code"}); 
    }
        if(!(otp===req.session.otp)){
                return res.status(403).json({message:"Invalid Otp"})
            }
        clearTimeout(timer);
        const {signup_name,signup_email,signup_password,signup_referral}=req.session.data
        const referralCode=crypto.randomBytes(3).toString('hex');
        const user=await User.signup(signup_name,signup_email,signup_password,signup_referral,referralCode)
        if(signup_referral){
            const updateUser= await User.findOne({referralCode:signup_referral})
            if(updateUser){
                updateUser.wallet.balance+=100;
                user.wallet.balance+=50;
                user.referredCode=updateUser.referralCode
                await updateUser.save()
                await user.save()
            }
        }
        const cart=new Cart({
            user:user._id,
            items:[]
        })
        const wishlist=new Wishlist({
            user:user._id,
            items:[]
        })
        await cart.save();
        await wishlist.save();
        return res.status(201).json({message:"Enter Credentials to Login"});

    }catch(err){
        return res.status(400).json({message:"failed"})
    }
     
}

exports.postForgotEmail=async (req,res,next)=>{
    
    const email=req.body.email
    try{
            const user=await User.findOne({email:email});
            if(user){
                req.session.email=email
                const value=otpgeneretor(email)
                await transporter.sendMail(value.info)
                req.session.otp=value.token;
                timer=setTimeout(()=>{req.session.otp=null},60000);
                return res.status(200).json({message:"Success"});
            }else{
                return res.status(404).json({error:"Email doesn't exist"})
            }

    }catch(err){
        return res.status(404).json({message:err.message})
    }
}

exports.postForgotOtp=async(req,res,next)=>{
    const otp=req.body.otp;
    if(otp===req.session.otp){
        req.session.change=true;
        clearTimeout(timer);
        return res.status(200).json({messsage:"Success"})
    }else{
        return res.status(404).json({error:"Wrong Otp"})
    }
}

exports.postForgotPassword=async (req,res,next)=>{
    if(req.session.change){
        const password=req.body.password;
        const email=req.session.email;
        if(!validator.isStrongPassword(password)){
            return res.status(404).json({error:"Password Not Strong Enough"})
        }
        try{
                const user=await User.findOne({email:email});
                const salt=await bcrypt.genSalt(10)
                const hashedPassword=await bcrypt.hash(password,salt)
                user.password=hashedPassword;
                await user.save();
                delete req.session.change
                return res.status(200).json({message:"Password Updated"});

        }catch(err){
            console.log(err)
            return res.status(500).json({error:err.message})
        } 
    }else{
        return res.status(500).json({error:"Retry again"})
    }
    
}

exports.getProfile=async (req,res,next)=>{
    try{
       const user=await User.findById(req.session.user)
        res.render("user/userprofile",{user}) 
    }catch(err){
        console.log(err)
    }
    
}

exports.putChangePassword=async (req,res,next)=>{
    try{
        const {currentPassword,newPassword,}=req.body
       const user=await User.findById(req.session.user);
       const pass=await bcrypt.compare(currentPassword,user.password)
       if(pass){

        if(!validator.isStrongPassword(newPassword)){
            return res.status(400).json({message:"Password Not Strong Enough"})
        }
        const salt=await bcrypt.genSalt(10)
        const hashedPassword=await bcrypt.hash(newPassword,salt)
        user.password=hashedPassword;
        await user.save();
        res.status(200).json({message:"Successfully Created"})
       }else{
        res.status(400).json({message:"Invalid Password"})
       }
    }catch(err){
        console.log(err)
    }
    
}

exports.getChat=async (req,res,next)=>{
    const user=await User.findById(req.session.user)
    res.render("user/chat",{user})
}

exports.getAddress=async (req,res,next)=>{
    try{
        const user=await User.findById(req.session.user);
        const addresses=await Address.find({user:req.session.user})
        res.render("user/useraddress",{user,addresses})
    }catch(err){
        console.log(err)
    } 
}

exports.postAddAddress=async (req,res,next)=>{
    try{
        const {name,phoneNo,locality,address,city,state,landmark,alternateNo,pincode}=req.body;
        let a=!validator.isNumeric(phoneNo)||!(phoneNo.length===10)

        if(!validator.isAlpha(name)){
            return res.status(500).json({message:"Enter A Valid Name"})
        }else if(!validator.isNumeric(phoneNo)||!(phoneNo.length===10)){
            return res.status(500).json({message:"Enter A Valid Phone No"})
        }
        const newAddress=new Address({
            user:req.session.user,
            name:name,
            phoneNo:phoneNo,
            pincode:pincode,
            locality:locality,
            address:address,
            city:city,
            state:state,
            landmark:landmark,
            alternateNo:alternateNo
        });
        await newAddress.save();
        res.status(200).json({message:"Address Added"});
    }catch(err){
        res.status(500).json({message:"Something Happened"})
    }
    
}

exports.deleteAddress=async (req,res,next)=>{
    try{
        const addressId=req.params.id
        await Address.findByIdAndDelete(addressId)
        res.status(200).json({message:"Success"})
    }catch(err){
        res.status(500).json({message:"Sorry For The Inconvenince.We are Currently working on a solution."})
    }
}

exports.putEditAddress=async (req,res,next)=>{
    try{
        const {name,phoneNo,locality,address,city,state,landmark,alternateNo,pincode,id}=req.body;
        let a=!validator.isNumeric(phoneNo)||!(phoneNo.length===10)

        if(!validator.isAlpha(name)){
            return res.status(500).json({message:"Enter A Valid Name"})
        }else if(!validator.isNumeric(phoneNo)||!(phoneNo.length===10)){
            return res.status(500).json({message:"Enter A Valid Phone No"})
        }
        let newAddress=await Address.findById(id)
            newAddress.name=name,
            newAddress.phoneNo=phoneNo,
            newAddress.pincode=pincode,
            newAddress.locality=locality,
            newAddress.address=address,
            newAddress.city=city,
            newAddress.state=state,
            newAddress.landmark=landmark,
            newAddress.alternateNo=alternateNo
        await newAddress.save();
        res.status(200).json({message:"Address successfully edited"});
    }catch(err){
        res.status(500).json({message:"Something Happened"})
    }
}

exports.getWishList=async (req,res,next)=>{
    try{
        const wishlist=await Wishlist.findOne({user:req.session.user}).populate("items")
        res.render("user/wishlist",{wishlist});

    }catch(err){
        console.log(err)
    }
}

exports.postaddWishlist=async (req,res,next)=>{
    try{
        let action;
        const prodId=req.params.id;
        const wishlist=await Wishlist.findOne({user:req.session.user})
        const product=await Product.findById(prodId)
        if(!product)
            return res.status(404);
        if(wishlist.items.includes(product._id)){
            wishlist.items=wishlist.items.filter((item)=>{
                return item.toString()!==product._id.toString()
            })
            action=false;
        }else{
            wishlist.items.push(prodId);
            action=true;
        }
        wishlist.save();
        res.status(200).json({action})
    }catch(err){
        res.status(500).json({serverError:true})
    }
}

exports.deleteWishlist=async (req,res,next)=>{
    try{
        const product=req.params.id
        const wishlist=await Wishlist.findOne({user:req.session.user})
        wishlist.items=wishlist.items.filter((item)=>{
            return item.toString()!==product.toString()
        })
        await wishlist.save();
        res.status(200).json({message:"Success"})
    }catch(err){
        res.status(500).json({message:"Sorry For The Inconvenince.We are Currently working on a solution."})
    }
}

exports.getOrder=async (req,res,next)=>{
    try{
        const orders=await Order.find({userId:req.session.user}).sort({createdAt:-1})
        res.render("user/order",{orders})
    }catch(err){
        console.log(err)
    }
}

exports.getOrderDetails=async (req,res,next)=>{
    try{
        const orderId=req.params.orderId;
        const order=await Order.findById(orderId)
        res.render("user/orderdetails",{order})
    }catch(err){
        console.log(err)
    }
}

exports.putOrderStatus=async (req,res,next)=>{
    try{
        const orderId=req.params.orderId;
        const {action,productId,reason}=req.body;
        const order=await Order.findById(orderId);
        const index=order.items.findIndex((item)=>item.productId.toString()===productId)
        if(index>=0){
            if(action){
                order.items[index].status="returned";
                order.items[index].reason=reason;
            }else{
                order.items[index].status="cancelled";
                order.items[index].reason=reason;
                if(order.paymentMethod==="paypal"||order.paymentMethod==="razorpay"){
                    const user=await User.findById(req.session.user);
                    if(order.coupon.discount){
                        user.wallet.balance+=Math.round((((order.items[index].discountPrice*order.items[index].quantity)*(1-order.coupon.discount/100))+Number.EPSILON)*100)/100;
                        user.wallet.transactions.push({
                            amount:Math.round((((order.items[index].discountPrice*order.items[index].quantity)*(1-order.coupon.discount/100))+Number.EPSILON)*100)/100,
                            description:`Cancellation refund for ${order.items[index].productName}`
                        })
                    }else{
                        user.wallet.balance+=order.items[index].discountPrice*order.items[index].quantity;
                        user.wallet.transactions.push({
                            amount:order.items[index].discountPrice,
                            description:`Cancellation refund for ${order.items[index].productName}`
                        })
                    }
                    user.wallet.balance=Math.round((user.wallet.balance +Number.EPSILON)*100)/100
                    await user.save();
                }
            }
            await order.save();
            return res.status(200).json({message:"Success"})
        }else{
            return res.status(404).json({error:"Error"})
        }
        
    }catch(err){
        console.log(err)
    }
}

exports.getInvoice=async (req,res,next)=>{
    try{
        let sum=0;
        const orderId=req.params.orderId
        const order=await Order.findById(orderId)
        if(!order||order.userId.toString()!==req.session.user.toString()){
            return res.status(404).send('Order not found');
        }
        const user=await User.findById(req.session.user)
        const doc = new PDFDocument;
        const invoiceName='invoice-'+orderId+'.pdf';
        const invoicePath=path.join('data','invoices',invoiceName)
       
        res.setHeader('Content-Type','application/pdf')
        res.setHeader('Content-Disposition','inline;filename="'+invoiceName+'"')
        
        doc.pipe(fs.createWriteStream(invoicePath))
        doc.pipe(res)
    
        // Add title
        doc.fontSize(20).text("Alchemy", { align: 'center' }).moveDown();
    
        // Add order details
        doc.moveDown();
        doc.fontSize(14).text('Order Details', { align: 'center' }).moveDown();
        doc.fontSize(12).text(`Order ID: ${order.orderId}`);
        doc.fontSize(12).text(`Total Quantity: ${order.totalQuantity}`);
        doc.fontSize(12).text(`Total Price: ₹${order.totalPrice}`);
        doc.fontSize(12).text(`Order Date: ${order.orderDate}`);
        doc.fontSize(12).text(`Payment Method: ${order.paymentMethod}`);
        doc.moveDown();
    
        // Write address details to the PDF document
        doc.fontSize(14).text('Delivery Address', { align: 'center' }).moveDown();
        doc.fontSize(12).text(`Name: ${user.name}`);
        doc.text(`Email: ${user.email}`);
        doc.text(`Address: ${order.address.name}, ${order.address.address}, ${order.address.city}, ${order.address.state}, ${order.address.pincode}`);
        doc.text(`Phone: ${order.address.phoneNo}`);
        doc.moveDown();

        // Write product details to the PDF document
        doc.fontSize(14).text('Product Details', { align: 'center' }).moveDown();
        order.items.forEach(item => {
            if(item.status!=="cancelled"&&item.status!=="returned"){
                sum+=item.discountPrice;
            }
            doc.fontSize(12).text(`Product Name: ${item.productName}`);
            doc.fontSize(12).text(`Quantity: ${item.quantity}`);
            doc.fontSize(12).text(`Price: ${item.discountPrice}`);
            doc.moveDown();
        });
        // Add total price
        doc.moveDown();
        if(order.coupon.discount){
            sum=sum*(1-order.coupon.discount/100)
        }
        doc.text(`Total Price After Cancellation and/or Return: ₹${sum.toFixed(2)}`, { align: 'right' });
    
        doc.end();
    }catch(err){
        console.log(err)
    }


}

exports.getWallet=async (req,res,next)=>{
    try{
        const user=await User.findById(req.session.user)
        res.render("user/wallet",{user})
    }catch(err){
        console.log(err)
    }
}

exports.getCoupon=async (req,res,next)=>{
    try{
        const coupons=await Coupon.find({expiryDate:{$gte:Date.now()}})
        res.render("user/coupon",{coupons})
    }catch(err){
        console.log(err)
    }
}

exports.getCheckCoupon=async (req,res,next)=>{
    try{
        const {couponCode,totalPrice}=req.query
        const coupon=await Coupon.findOne({$and:[{expiryDate:{$gte:Date.now()}},{couponCode:couponCode},{minAmount:{$lte:totalPrice}},{maxAmount:{$gte:totalPrice}}]})
        if(coupon){

            return res.status(200).json({
                couponCode:coupon.couponCode,
                discount:coupon.discount
            })
        }else{
            
            return res.status(404).json({notFound:true})
        }
    }catch(err){
        return res.status(500).json({error:err.message})
    }
}

exports.postBuyNow=async (req,res,next)=>{
    try{
        const productId=req.params.id;
        const product=await Product.findById(productId)
        if(product.stock<=0){
            return res.status(409).json({outOfStock:true})
        }
        const options={
            upsert:true,
            new:true
        }
        const conditions={
            user:req.session.user
        }
        const update={
            user:req.session.user,
            product:productId,
            totalPrice: product.discountPrice
        }
        await BuyNow.findOneAndUpdate(conditions,update,options);
        
        res.status(200).json({message:"Successfully Added"})
    }catch(err){
        res.status(500).json({message:"Sorry For The Inconvenince.We are Currently working on a solution."})
    }
}

exports.getCart=async (req,res,next)=>{
    try{
        const cart=await Cart.findOne({user:req.session.user})
        .populate("items.product");
        await cart.populate("items.product.category")
        res.render("user/cart",{
            cart
        })        
    }catch(err){
        console.log(err)
    } 
}

exports.postAddCart=async (req,res,next)=>{
    try{
        const productId=req.params.id;
        const cart=await Cart.findOne({user:req.session.user})
        const product=await Product.findById(productId)
        const index=cart.items.findIndex((item)=>{
            return item.product.toString()===productId
        })
        if(index<0&&product.stock>0){
            cart.items.push({
                product:productId,
                quantity:1
            })
            cart.totalPrice = Math.round((cart.totalPrice + product.discountPrice + Number.EPSILON) * 100) / 100;
            await cart.save();
        }else if(index>=0 &&cart.items[index].quantity===3){
            return res.status(409).json({maxQuantity:true})
        }else if(!(index<0)&&(product.stock>cart.items[index].quantity)){
            cart.items[index].quantity++;
            cart.totalPrice = Math.round((cart.totalPrice + product.discountPrice + Number.EPSILON) * 100) / 100;
            await cart.save();
        }else{
            return res.status(404).json({outOfStock:true})
        }
        res.status(200).json({message:"Successfully Added"})
    }catch(err){
        console.log(err.message)
        res.status(500).json({message:"Sorry For The Inconvenince.We are Currently working on a solution."})
    }

}

exports.deleteCart=async (req,res,next)=>{
    try{
        let quantity,totalPrice;
        const id=req.params.id;
        let cart=await Cart.findOne({user:req.session.user})
        let product=await Product.findOne({_id:id})
        const newCartItems=cart.items.filter((val)=>{
            if(val.product.toString()==id){quantity=val.quantity}
            return val.product.toString()!==id
        })
        cart.items=newCartItems;
        const discountTotal = product.discountPrice * quantity;
        const roundedDiscountTotal = Math.round((discountTotal + Number.EPSILON) * 100) / 100;
        cart.totalPrice = Math.round((cart.totalPrice - roundedDiscountTotal + Number.EPSILON) * 100) / 100;
        totalPrice=cart.totalPrice
        await cart.save();
        res.status(200).json({message:"Success",totalPrice})
    }catch(err){
        res.status(500).json({message:"Something Happened"})
    }
}

exports.patchUpdateQuantityCart=async (req,res,next)=>{
    try{
        const id=req.params.id
        const action=req.body.action
        let totalPrice;
        const cart=await Cart.findOne({user:req.session.user});
        const product=await Product.findOne({_id:id})
        const index=cart.items.findIndex((val)=>{
            return val.product.toString()===id
        });
        if(cart.items[index].quantity==product.stock&&action){
            return res.status(404).json({outOfStock:true})
        }else if(cart.items[index].quantity===1&&!action){
            return res.status(404).json({negative:true})
        }else if(cart.items[index].quantity===3&&action){
            return res.status(404).json({maxQuantity:true})
        }else if(action){
            cart.items[index].quantity++;
            cart.totalPrice = Math.round((cart.totalPrice + product.discountPrice + Number.EPSILON) * 100) / 100;
        }else{
            cart.items[index].quantity--;
            cart.totalPrice = Math.round((cart.totalPrice - product.discountPrice + Number.EPSILON) * 100) / 100;
        }
        totalPrice=cart.totalPrice
        await cart.save();
        res.status(200).json({message:"Success",totalPrice})
    }catch(err){
        console.log(err.message)
        res.status(500).json({message:"Something Happened"});
    }
}

exports.getCheckout=async (req,res,next)=>{
    try{
        let cart;
        let action=req.query.buynow;
        if(action){
            cart=await BuyNow.findOne({user:req.session.user})
            .populate("product");
            await cart.populate("product.category");
            if((!cart.product))
                return res.redirect("/user/cart")
            
        }else{
            cart=await Cart.findOne({user:req.session.user})
            .populate("items.product");
            await cart.populate("items.product.category")
        if(cart.items.length==0)
            return res.redirect("/user/cart")
        }
        const addresses=await Address.find({user:req.session.user})
        res.render("user/checkout",{addresses,cart,action})
    
    }catch(err){
        console.log(err)
    }
}

exports.postCheckout=async (req,res,next)=>{
    try{
        let product,coupon,newCoupon;
        const {address,paymentMethod,couponCode}=req.body.json_form
        const action=req.body.action
        if(!address){
            return res.status(404).json({error:`Select Address`})
        }else if(!paymentMethod){
            return res.status(404).json({error:`Select payment method`})
        }
        if(action==="true"){
            
            const cart=await BuyNow.findOne({user:req.session.user})
            .populate({
                path: 'product',
                populate: {
                    path: 'category'
                }
            });
            if(cart.product.stock<=0)
            return res.status(404).json({error:`Product ${cart.product.name} Out of Stock`})

            const userAddress=await Address.findById(address);
            if (userAddress) {
                delete userAddress._id;
              }
            const randomBytes = crypto.randomBytes(3).toString('hex');
            const orderId=randomBytes+Date.now().toString(36);

            if(paymentMethod==="paypal"){
                return res.status(200).json({paymentMethod:"paypal"})
            }else if(paymentMethod==="razorpay"){
                return res.status(200).json({paymentMethod:"razorpay"})
            }else if(paymentMethod==="cashOnDelivery"){
                let order=new Order({
                    orderId:orderId,
                    userId:req.session.user,
                    items:[{
                        productId: cart.product._id,
                        productName: cart.product.name,
                        productDescription: cart.product.description,
                        brand:cart.product.brand,
                        categoryId:cart.product.category._id,
                        categoryName:cart.product.category.name,
                        stock: cart.product.stock,
                        productImage: cart.product.image,
                        quantity: cart.quantity,
                        price: Math.round((cart.product.price + Number.EPSILON)* 100) / 100,
                        discountPrice:Math.round((cart.product.discountPrice + Number.EPSILON)* 100) / 100
                    }],
                    totalQuantity:1,
                    totalPrice: Math.round((cart.product.discountPrice + Number.EPSILON)* 100) / 100,
                    address:userAddress,
                    paymentMethod:paymentMethod
                })
                if(couponCode){
                    coupon=await Coupon.findOne({$and:[{expiryDate:{$gte:Date.now()}},{couponCode:couponCode},{minAmount:{$lte:cart.totalPrice}},{maxAmount:{$gte:cart.totalPrice}}]})
                    if(!coupon)
                    return res.status(404).json({error:"Invalid Coupon"})
                    order.coupon={
                        couponCode: coupon.couponCode,
                        discount:coupon.discount
                    }
                    order.totalPrice=Math.round(((cart.product.discountPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100
                    order.discountPrice=Math.round(((cart.product.discountPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100
                }
                if(order.totalPrice>1000){
                    return res.status(400).json({error:"Order above $1000 is not Allowed"})
                }
                await order.save();
                    product=await Product.findById(cart.product._id)
                    product.stock-=1
                    await product.save();

                cart.product=null;
                cart.totalPrice=0;

                await cart.save();
                return res.status(200).json({message:"Success",id:order._id})
            }else{
                return res.status(500).json({error:"Select another mode of payment"})
            }

        }else{

            const cart=await Cart.findOne({user:req.session.user})
            .populate({
                path: 'items.product',
                populate: {
                    path: 'category'
                }
            });
            if(cart.items.length==0){
                return res.status(404).json({error:"Add Products To Cart"})
            }
            for(let item of cart.items){
                if(item.product.stock<item.quantity)
                    return res.status(404).json({error:`Product ${item.product.name} Out of Stock`})
            }
            const userAddress=await Address.findById(address);
            if (userAddress) {
                delete userAddress._id;
              }
            const randomBytes = crypto.randomBytes(3).toString('hex');
            const orderId=randomBytes+Date.now().toString(36);
            let totalQuantity=0;
            cart.items.forEach((item)=>{
                totalQuantity+=item.quantity;
            })
            if(paymentMethod==="paypal"){
                return res.status(200).json({paymentMethod:"paypal"})
            }else if(paymentMethod==="razorpay"){
                return res.status(200).json({paymentMethod:"razorpay"})
            }else if(paymentMethod==="cashOnDelivery"){
                let order=new Order({
                    orderId:orderId,
                    userId:req.session.user,
                    items:[],
                    totalQuantity:totalQuantity,
                    totalPrice: cart.totalPrice,
                    address:userAddress,
                    paymentMethod:paymentMethod
                })
                cart.items.forEach((item)=>{
                    order.items.push({
                        productId: item.product._id,
                        productName: item.product.name,
                        productDescription: item.product.description,
                        brand:item.product.brand,
                        categoryId:item.product.category._id,
                        categoryName:item.product.category.name,
                        stock: item.product.stock,
                        productImage: item.product.image,
                        quantity: item.quantity,
                        price: item.product.price,
                        discountPrice:item.product.discountPrice
                })
            })
            if(couponCode){
                coupon=await Coupon.findOne({$and:[{expiryDate:{$gte:Date.now()}},{couponCode:couponCode},{minAmount:{$lte:cart.totalPrice}},{maxAmount:{$gte:cart.totalPrice}}]})
                if(!coupon)
                return res.status(404).json({error:"Invalid Coupon"})
                order.coupon={
                    couponCode: coupon.couponCode,
                    discount:coupon.discount
                }
                order.totalPrice=Math.round(((cart.totalPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100
            }
            if(order.totalPrice>1000){
                return res.status(400).json({error:"Order above $1000 is not Allowed"})
            }
                await order.save();
                for(let item of cart.items){
                    product=await Product.findById(item.product._id)
                    product.stock-=item.quantity
                    await product.save();
                }
                cart.items=[];
                cart.totalPrice=0;
                await cart.save();
                return res.status(200).json({message:"Success",id:order._id})
            }else{
                return res.status(500).json({error:"Select another mode of payment"})
            }
        }

    }catch(err){
        console.log(err.message)
        return res.status(500).json({error:"Something Happened"})
    }

}

exports.postCreateRazorPayOrder=async (req,res,next)=>{
    try{
        /* Retry Payment BEGIN */
        let orderId=req.query.orderId
        if(orderId){
            const order=await Order.findById(orderId);
            if((order.userId.toString()!==req.session.user.toString())||!order){
                return res.status(404).send('Error');
            }else{
                var options = {
                    amount: parseInt(order.totalPrice*100),  // amount in the smallest currency unit
                    currency: "INR",
                    receipt: "order_rcptid_11"
                };
                instance.orders.create(options, function(err, order) {
                    if(err){
                        console.log(err)
                    }
                    res.json({ orderId: order.id, orderprice: options.amount })
                });
            }
        }else{
        /* Retry Payment END */
        let totalPrice=0,coupon;
        const {couponCode}=req.body.json_form
        const action=req.body.action
        if(action==="true"){
            
            const cart=await BuyNow.findOne({user:req.session.user})
            .populate({
                path: 'product',
                populate: {
                    path: 'category'
                }
            });
            if(cart.product.stock<=0)
            return res.status(404).json({error:`Product ${cart.product.name} Out of Stock`})

                if(couponCode){
                    coupon=await Coupon.findOne({$and:[{expiryDate:{$gte:Date.now()}},{couponCode:couponCode},{minAmount:{$lte:cart.totalPrice}},{maxAmount:{$gte:cart.totalPrice}}]})
                    totalPrice+=Math.round(((cart.product.discountPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100
                }else{
                    totalPrice+=Math.round((cart.product.discountPrice+ Number.EPSILON)* 100) / 100
                }

        }else{

            const cart=await Cart.findOne({user:req.session.user})
            .populate({
                path: 'items.product',
                populate: {
                    path: 'category'
                }
            });
            if(cart.items.length==0){
                return res.status(404).json({error:"Add Products To Cart"})
            }
            if(couponCode){
                coupon=await Coupon.findOne({$and:[{expiryDate:{$gte:Date.now()}},{couponCode:couponCode},{minAmount:{$lte:cart.totalPrice}},{maxAmount:{$gte:cart.totalPrice}}]})
                
            }
            for(let item of cart.items){

                if(item.product.stock<item.quantity)
                    return res.status(404).json({error:`Product ${item.product.name} Out of Stock`})

                if(coupon){
                    totalPrice+=Math.round(((item.product.discountPrice*(1-(coupon.discount/100)))*item.quantity + Number.EPSILON)* 100) / 100
                }else{
                    totalPrice+=Math.round((item.product.discountPrice*item.quantity + Number.EPSILON)* 100) / 100
                }
            }

        }
        var options = {
            amount: parseInt(totalPrice*100),  // amount in the smallest currency unit
            currency: "INR",
            receipt: "order_rcptid_11"
        };
        instance.orders.create(options, function(err, order) {
            if(err){
                console.log(err)
            }
            res.json({ orderId: order.id, orderprice: options.amount })
        });
    }
    }catch(err){
        console.log(err)
    }

}

exports.postRazorPaySuccess=async(req,res,next)=>{

    try{
        let orderId=req.query.orderId
        if(orderId){
            const order=await Order.findById(orderId)
            if(!order||order.userId.toString()!==req.session.user.toString()){
                return res.json(404).json({error:"Something Happened"})
            }
            for(item of order.items){
                item.status = "pending";
                await Product.updateOne(
                  { _id: item.productId },
                  { $inc: { stock: -item.quantity } }
                );
              };
            await order.save();
            return res.status(200).json({message:"Success",id:order._id})
        }
        let product,coupon,sum=0;
        const {address,paymentMethod,couponCode}=req.body.json_form
        const action=req.body.action
        
        if(action==="true"){
            
            const cart=await BuyNow.findOne({user:req.session.user})
            .populate({
                path: 'product',
                populate: {
                    path: 'category'
                }
            });

            const userAddress=await Address.findById(address);
            if (userAddress) {
                delete userAddress._id;
              }
            const randomBytes = crypto.randomBytes(3).toString('hex');
            const orderId=randomBytes+Date.now().toString(36);

                let order=new Order({
                    orderId:orderId,
                    userId:req.session.user,
                    items:[{
                        productId: cart.product._id,
                        productName: cart.product.name,
                        productDescription: cart.product.description,
                        brand:cart.product.brand,
                        categoryId:cart.product.category._id,
                        categoryName:cart.product.category.name,
                        stock: cart.product.stock,
                        productImage: cart.product.image,
                        quantity: cart.quantity,
                        price: Math.round((cart.product.price + Number.EPSILON)* 100) / 100,
                        discountPrice:Math.round((cart.product.discountPrice + Number.EPSILON)* 100) / 100
                    }],
                    totalQuantity:1,
                    totalPrice: Math.round((cart.product.discountPrice + Number.EPSILON)* 100) / 100,
                    address:userAddress,
                    paymentMethod:paymentMethod
                })
                if(couponCode){
                    coupon=await Coupon.findOne({$and:[{expiryDate:{$gte:Date.now()}},{couponCode:couponCode},{minAmount:{$lte:cart.totalPrice}},{maxAmount:{$gte:cart.totalPrice}}]})
                    if(!coupon)
                    return res.status(404).json({error:"Invalid Coupon"})
                    order.coupon={
                        couponCode: coupon.couponCode,
                        discount:coupon.discount
                    }
                    order.totalPrice=Math.round(((cart.product.discountPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100
                    order.discountPrice=Math.round(((cart.product.discountPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100
                }
                await order.save();
                    product=await Product.findById(cart.product._id)
                    product.stock-=1
                    await product.save();

                cart.product=null;
                cart.totalPrice=0;

                await cart.save();
                return res.status(200).json({message:"Success",id:order._id})

        }else{

            const cart=await Cart.findOne({user:req.session.user})
            .populate({
                path: 'items.product',
                populate: {
                    path: 'category'
                }
            });
            if(cart.items.length==0){
                return res.status(404).json({error:"Add Products To Cart"})
            }
            const userAddress=await Address.findById(address);
            if (userAddress) {
                delete userAddress._id;
              }
            const randomBytes = crypto.randomBytes(3).toString('hex');
            const orderId=randomBytes+Date.now().toString(36);
            let totalQuantity=0;
            cart.items.forEach((item)=>{
                totalQuantity+=item.quantity;
            })
                let order=new Order({
                    orderId:orderId,
                    userId:req.session.user,
                    items:[],
                    totalQuantity:totalQuantity,
                    totalPrice: cart.totalPrice,
                    address:userAddress,
                    paymentMethod:paymentMethod
                })
                cart.items.forEach((item)=>{
                    order.items.push({
                        productId: item.product._id,
                        productName: item.product.name,
                        productDescription: item.product.description,
                        brand:item.product.brand,
                        categoryId:item.product.category._id,
                        categoryName:item.product.category.name,
                        stock: item.product.stock,
                        productImage: item.product.image,
                        quantity: item.quantity,
                        price: item.product.price,
                        discountPrice:item.product.discountPrice
                })
            })
            if(couponCode){
                coupon=await Coupon.findOne({$and:[{expiryDate:{$gte:Date.now()}},{couponCode:couponCode},{minAmount:{$lte:cart.totalPrice}},{maxAmount:{$gte:cart.totalPrice}}]})
                if(!coupon)
                return res.status(404).json({error:"Invalid Coupon"})
                order.coupon={
                    couponCode: coupon.couponCode,
                    discount:coupon.discount
                }
                order.totalPrice=Math.round(((cart.totalPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100
            }
                await order.save();
                for(let item of cart.items){
                    product=await Product.findById(item.product._id)
                    product.stock-=item.quantity
                    await product.save();
                }
                cart.items=[];
                cart.totalPrice=0;
                await cart.save();
                return res.status(200).json({message:"Success",id:order._id})
        }

    }catch(err){
        console.log(err.message)
        return res.status(500).json({error:"Something Happened"})
    }
    
    }

exports.postRazorPayFailure=async(req,res,next)=>{

    try{
        let {orderId}=req.query
        if(orderId){
            return res.status(200).json({message:"Success",id:orderId})
        }
        let product,coupon,sum=0;
        const {address,paymentMethod,couponCode}=req.body.json_form
        const action=req.body.action
        if(action==="true"){
            
            const cart=await BuyNow.findOne({user:req.session.user})
            .populate({
                path: 'product',
                populate: {
                    path: 'category'
                }
            });

            const userAddress=await Address.findById(address);
            if (userAddress) {
                delete userAddress._id;
              }
            const randomBytes = crypto.randomBytes(3).toString('hex');
            const orderId=randomBytes+Date.now().toString(36);

                let order=new Order({
                    orderId:orderId,
                    userId:req.session.user,
                    items:[{
                        productId: cart.product._id,
                        productName: cart.product.name,
                        productDescription: cart.product.description,
                        brand:cart.product.brand,
                        categoryId:cart.product.category._id,
                        categoryName:cart.product.category.name,
                        stock: cart.product.stock,
                        productImage: cart.product.image,
                        quantity: cart.quantity,
                        status:"payment pending",
                        price: Math.round((cart.product.price + Number.EPSILON)* 100) / 100,
                        discountPrice:Math.round((cart.product.discountPrice + Number.EPSILON)* 100) / 100
                    }],
                    totalQuantity:1,
                    totalPrice: Math.round((cart.product.discountPrice + Number.EPSILON)* 100) / 100,
                    address:userAddress,
                    paymentMethod:paymentMethod
                })
                if(couponCode){
                    coupon=await Coupon.findOne({$and:[{expiryDate:{$gte:Date.now()}},{couponCode:couponCode},{minAmount:{$lte:cart.totalPrice}},{maxAmount:{$gte:cart.totalPrice}}]})
                    if(!coupon)
                    return res.status(404).json({error:"Invalid Coupon"})
                    order.coupon={
                        couponCode: coupon.couponCode,
                        discount:coupon.discount
                    }
                    order.totalPrice=Math.round(((cart.product.discountPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100
                    order.discountPrice=Math.round(((cart.product.discountPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100
                }
                await order.save();
                    product=await Product.findById(cart.product._id)
                    product.stock-=1
                    if(product.stock)
                    await product.save();

                cart.product=null;
                cart.totalPrice=0;

                await cart.save();
                return res.status(200).json({message:"Success",id:order._id})

        }else{

            const cart=await Cart.findOne({user:req.session.user})
            .populate({
                path: 'items.product',
                populate: {
                    path: 'category'
                }
            });
            if(cart.items.length==0){
                return res.status(404).json({error:"Add Products To Cart"})
            }
            const userAddress=await Address.findById(address);
            if (userAddress) {
                delete userAddress._id;
              }
            const randomBytes = crypto.randomBytes(3).toString('hex');
            const orderId=randomBytes+Date.now().toString(36);
            let totalQuantity=0;
            cart.items.forEach((item)=>{
                totalQuantity+=item.quantity;
            })
                let order=new Order({
                    orderId:orderId,
                    userId:req.session.user,
                    items:[],
                    totalQuantity:totalQuantity,
                    totalPrice: cart.totalPrice,
                    address:userAddress,
                    paymentMethod:paymentMethod
                })
                cart.items.forEach((item)=>{
                    order.items.push({
                        productId: item.product._id,
                        productName: item.product.name,
                        productDescription: item.product.description,
                        brand:item.product.brand,
                        categoryId:item.product.category._id,
                        categoryName:item.product.category.name,
                        stock: item.product.stock,
                        productImage: item.product.image,
                        quantity: item.quantity,
                        status:"payment pending",
                        price: item.product.price,
                        discountPrice:item.product.discountPrice
                })
            })
            if(couponCode){
                coupon=await Coupon.findOne({$and:[{expiryDate:{$gte:Date.now()}},{couponCode:couponCode},{minAmount:{$lte:cart.totalPrice}},{maxAmount:{$gte:cart.totalPrice}}]})
                if(!coupon)
                return res.status(404).json({error:"Invalid Coupon"})
                order.coupon={
                    couponCode: coupon.couponCode,
                    discount:coupon.discount
                }
                order.totalPrice=Math.round(((cart.totalPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100
            }
                await order.save();
                for(let item of cart.items){
                    product=await Product.findById(item.product._id)
                    product.stock-=item.quantity
                    await product.save();
                }
                cart.items=[];
                cart.totalPrice=0;
                await cart.save();
                return res.status(200).json({message:"Success",id:order._id})
        }

    }catch(err){
        console.log(err.message)
        return res.status(500).json({error:"Something Happened"})
    }
}

exports.getPaypal=(req,res,next)=>{

    let action=req.query.action;
    let address=req.query.address;
    let coupon=req.query.coupon;
    let orderId=req.query.orderId
    const paypalClientId=process.env.PAYPAL_CLIENT_ID;
    if(!action)
    action=false
    res.render("user/paypal",{paypalClientId,action,address,coupon,orderId});
    
}

exports.postCreatePayPalOrder=async (req,res,next)=>{
    try{
        let sum=0;
        let cart,items,coupon;
        let action=req.query.action;
        let couponCode=req.body.coupon
        /* Retry Payment BEGIN */
        let orderId=req.body.orderId
        if(orderId){
            cart=await Order.findById(orderId);
            if((cart.userId.toString()!==req.session.user.toString())||!cart){
                return res.status(404).send('Error');
            }else{
                items=cart.items.map((item)=>{
                    if(cart.coupon.discount){
    
                        sum+=item.quantity*Math.round(((item.product.discountPrice*(1-(cart.coupon.discount/100)))+Number.EPSILON)*100)/100
                    }else{
                        sum+=item.quantity*item.discountPrice
                    }
                    
                    return {
                        name:item.productName,
                        unit_amount:{
                            currency_code: "USD",
                            value: (coupon) ? Math.round(((item.discountPrice*(1-(coupon.discount/100)))+Number.EPSILON)*100)/100 : item.discountPrice
                        },
                        quantity:item.quantity
                    }
                })
            }
        }
        /* Retry Payment END */
        else if(action==="false"){
            cart=await Cart.findOne({user:req.session.user}).populate("items.product");
            if(couponCode){
                coupon=await Coupon.findOne({$and:[{expiryDate:{$gte:Date.now()}},{couponCode:couponCode},{minAmount:{$lte:cart.totalPrice}},{maxAmount:{$gte:cart.totalPrice}}]})
                if(!coupon)
                return res.status(404).send('Coupon not found');
            }
            items=cart.items.map((item)=>{
                if(coupon){

                    sum+=item.quantity*Math.round(((item.product.discountPrice*(1-(coupon.discount/100)))+Number.EPSILON)*100)/100
                }else{
                    sum+=item.quantity*item.product.discountPrice
                }
                return {
                    name:item.product.name,
                    unit_amount:{
                        currency_code: "USD",
                        value: (coupon) ? Math.round(((item.product.discountPrice*(1-(coupon.discount/100)))+Number.EPSILON)*100)/100 : item.product.discountPrice
                    },
                    quantity:item.quantity
                }
            })
        }else{
            cart=await BuyNow.findOne({user:req.session.user}).populate("product")
            if(couponCode){
                coupon=await Coupon.findOne({$and:[{expiryDate:{$gte:Date.now()}},{couponCode:couponCode},{minAmount:{$lte:cart.totalPrice}},{maxAmount:{$gte:cart.totalPrice}}]})
                if(!coupon)
                return res.status(404).send('Coupon not found');
            }
            items=[{
                name:cart.product.name,
                unit_amount:{
                    currency_code: "USD",
                    value: cart.product.discountPrice
                },
                quantity:1
            }]
            sum+=cart.product.discountPrice;
        }

        if (!cart)
        return res.status(404).send('Cart not found');

        const request = new paypal.orders.OrdersCreateRequest()
        request.prefer("return=representation")
        request.requestBody({
            intent: "CAPTURE",
            purchase_units: [
            {
                amount: {
                currency_code: "USD",
                value:  Math.round((sum + Number.EPSILON)* 100) / 100 ,
                breakdown: {
                    item_total: {
                    currency_code: "USD",
                    value: Math.round((sum + Number.EPSILON)* 100) / 100,
                    },
                },
                },
                items: items,
            },
            ],
        })

    const order = await client.execute(request)
    res.json({ id: order.result.id })

    }catch(err){
        console.log(err)
    res.status(500).json({ error: err.message })
    }

}

exports.postCapturePayPalOrder=async (req,res,next)=>{
    try{
        const orderId = req.body.orderId;
        const request = new paypal.orders.OrdersCaptureRequest(orderId);
        request.requestBody({});
        const capture = await client.execute(request);

        if (capture.result.status === 'COMPLETED') {
        // Update the cart status to 'completed'

        res.json({ status: 'success' }); /* For success set status to success and for failure,set status to failure */
        } else {
        res.json({ status: 'failure' });
        }
        
    }catch(err){
        console.log(err)
    }

}

exports.postPayPalPayment=async (req,res,next)=>{

    try{
        let product,coupon;
        const {address,action,paymentMethod,couponCode,orderId}=req.body
        if(orderId){
            const order=await Order.findById(orderId)
            if(!order||order.userId.toString()!==req.session.user.toString()){
                return res.json(404).json({error:"Something Happened"})
            }
            for(item of order.items){
                item.status = "pending";
                await Product.updateOne(
                  { _id: item.productId },
                  { $inc: { stock: -item.quantity } }
                );
              };
            await order.save();
            return res.status(200).json({message:"Success",id:order._id})
        }
        if(action==="true"){
            
            const cart=await BuyNow.findOne({user:req.session.user})
            .populate({
                path: 'product',
                populate: {
                    path: 'category'
                }
            });
            if(couponCode){
                coupon=await Coupon.findOne({$and:[{expiryDate:{$gte:Date.now()}},{couponCode:couponCode},{minAmount:{$lte:cart.totalPrice}},{maxAmount:{$gte:cart.totalPrice}}]})
                if(!coupon)
                return res.status(404).json({error:"Invalid Coupon"})
            }
            if(cart.product.stock<=0)
                return res.status(404).json({error:`Product ${cart.product.name} Out of Stock`})
            
            const userAddress=await Address.findById(address);
            if (userAddress) {
                delete userAddress._id;
            }else{
                return res.json(500).json({error:"Error"})
            }
            const randomBytes = crypto.randomBytes(3).toString('hex');
            const orderId=randomBytes+Date.now().toString(36);
            
            if(paymentMethod==="paypal"){
                let order=new Order({
                    orderId:orderId,
                    userId:req.session.user,
                    items:[{
                        productId: cart.product._id,
                        productName: cart.product.name,
                        productDescription: cart.product.description,
                        brand:cart.product.brand,
                        categoryId: cart.product.category._id,
                        categoryName:cart.product.category.name,
                        stock: cart.product.stock,
                        productImage: cart.product.image,
                        quantity: cart.quantity,
                        price: cart.product.price,
                        discountPrice: (coupon)? Math.round(((cart.product.discountPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100 : cart.product.discountPrice
                    }],
                    totalQuantity:1,
                    totalPrice: (coupon)? Math.round(((cart.product.discountPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100 : cart.product.discountPrice,
                    address:userAddress,
                    paymentMethod:paymentMethod
                })
                if(couponCode){
                    order.coupon={
                        couponCode: coupon.couponCode,
                        discount:coupon.discount
                    }
                    order.totalPrice=Math.round(((cart.totalPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100
                }
                await order.save();
                product=await Product.findById(cart.product._id)
                product.stock-=1
                await product.save();
                
                cart.product=null;
                cart.totalPrice=0;

                await cart.save();
                return res.status(200).json({message:"Success",id:order._id})
            }else{
                return res.status(500).json({error:"Select another mode of payment"})
            }

        }else{

            const cart=await Cart.findOne({user:req.session.user})
            .populate({
                path: 'items.product',
                populate: {
                    path: 'category'
                }
            });
            if(couponCode){
                coupon=await Coupon.findOne({$and:[{expiryDate:{$gte:Date.now()}},{couponCode:couponCode},{minAmount:{$lte:cart.totalPrice}},{maxAmount:{$gte:cart.totalPrice}}]})
                if(!coupon)
                return res.status(404).json({error:"Invalid Coupon"})
            }
            if(cart.items.length==0){
                return res.status(404).json({error:"Add Products To Cart"})
            }
            for(let item of cart.items){
                if(item.product.stock<item.quantity)
                    return res.status(404).json({error:`Product ${item.product.name} Out of Stock`})
            }
            const userAddress=await Address.findById(address);
            if (userAddress) {
                delete userAddress._id;
            }
            const randomBytes = crypto.randomBytes(3).toString('hex');
            const orderId=randomBytes+Date.now().toString(36);
            let totalQuantity=0;
            cart.items.forEach((item)=>{
                totalQuantity+=item.quantity;
            })
            if(paymentMethod==="paypal"){
                let order=new Order({
                    orderId:orderId,
                    userId:req.session.user,
                    items:[],
                    totalQuantity:totalQuantity,
                    totalPrice: (coupon) ? Math.round(((cart.totalPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100 : cart.totalPrice,
                    address:userAddress,
                    paymentMethod:paymentMethod
                })
                cart.items.forEach((item)=>{
                    order.items.push({
                        productId: item.product._id,
                        productName: item.product.name,
                        productDescription: item.product.description,
                        brand:item.product.brand,
                        categoryId:item.product.category._id,
                        categoryName:item.product.category.name,
                        stock: item.product.stock,
                        productImage: item.product.image,
                        quantity: item.quantity,
                        price: item.product.price,
                        discountPrice: (coupon) ? Math.round(((item.product.discountPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100 : item.product.discountPrice
                    })
                    
                })
                if(couponCode){
                    order.coupon={
                        couponCode: coupon.couponCode,
                        discount:coupon.discount
                    }
                    order.totalPrice=Math.round(((cart.totalPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100
                }
                await order.save();
                for(let item of cart.items){
                    product=await Product.findById(item.product._id)
                    product.stock-=item.quantity
                    await product.save();
                }
                cart.items=[];
                cart.totalPrice=0;
                await cart.save();
                return res.status(200).json({message:"Success",id:order._id})
            }else{
                return res.status(500).json({error:"Select another mode of payment"})
            }
        }

    }catch(err){
        return res.status(500).json({error:"Something Happened"})
    }

}

exports.postPayPalFailed=async (req,res,next)=>{
    
    try{
        let product,coupon;
        const {address,action,paymentMethod,couponCode,orderId}=req.body
        if(orderId){
            return res.status(200).json({message:"Success",id:orderId})
        }
        if(action==="true"){
            
            const cart=await BuyNow.findOne({user:req.session.user})
            .populate({
                path: 'product',
                populate: {
                    path: 'category'
                }
            });
            if(couponCode){
                coupon=await Coupon.findOne({$and:[{expiryDate:{$gte:Date.now()}},{couponCode:couponCode},{minAmount:{$lte:cart.totalPrice}},{maxAmount:{$gte:cart.totalPrice}}]})
                if(!coupon)
                return res.status(404).json({error:"Invalid Coupon"})
            }
            
            const userAddress=await Address.findById(address);
            if (userAddress) {
                delete userAddress._id;
            }else{
                return res.json(500).json({error:"Error"})
            }
            const randomBytes = crypto.randomBytes(3).toString('hex');
            const orderId=randomBytes+Date.now().toString(36);
            
            if(paymentMethod==="paypal"){
                let order=new Order({
                    orderId:orderId,
                    userId:req.session.user,
                    items:[{
                        productId: cart.product._id,
                        productName: cart.product.name,
                        productDescription: cart.product.description,
                        brand:cart.product.brand,
                        categoryId: cart.product.category._id,
                        categoryName:cart.product.category.name,
                        stock: cart.product.stock,
                        productImage: cart.product.image,
                        quantity: cart.quantity,
                        price: cart.product.price,
                        status:"payment pending",
                        discountPrice: (coupon)? Math.round(((cart.product.discountPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100 : cart.product.discountPrice
                    }],
                    totalQuantity:1,
                    totalPrice: (coupon)? Math.round(((cart.product.discountPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100 : cart.product.discountPrice,
                    address:userAddress,
                    paymentMethod:paymentMethod
                })
                if(couponCode){
                    order.coupon={
                        couponCode: coupon.couponCode,
                        discount:coupon.discount
                    }
                    order.totalPrice=Math.round(((cart.totalPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100
                }
                await order.save();
                product=await Product.findById(cart.product._id)
                product.stock-=1
                await product.save();
                
                cart.product=null;
                cart.totalPrice=0;

                await cart.save();
                return res.status(200).json({message:"Success",id:order._id})
            }else{
                return res.status(500).json({error:"Select another mode of payment"})
            }

        }else{

            const cart=await Cart.findOne({user:req.session.user})
            .populate({
                path: 'items.product',
                populate: {
                    path: 'category'
                }
            });
            if(couponCode){
                coupon=await Coupon.findOne({$and:[{expiryDate:{$gte:Date.now()}},{couponCode:couponCode},{minAmount:{$lte:cart.totalPrice}},{maxAmount:{$gte:cart.totalPrice}}]})
                if(!coupon)
                return res.status(404).json({error:"Invalid Coupon"})
            }
            if(cart.items.length==0){
                return res.status(404).json({error:"Add Products To Cart"})
            }
            const userAddress=await Address.findById(address);
            if (userAddress) {
                delete userAddress._id;
            }
            const randomBytes = crypto.randomBytes(3).toString('hex');
            const orderId=randomBytes+Date.now().toString(36);
            let totalQuantity=0;
            cart.items.forEach((item)=>{
                totalQuantity+=item.quantity;
            })
            if(paymentMethod==="paypal"){
                let order=new Order({
                    orderId:orderId,
                    userId:req.session.user,
                    items:[],
                    totalQuantity:totalQuantity,
                    totalPrice: (coupon) ? Math.round(((cart.totalPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100 : cart.totalPrice,
                    address:userAddress,
                    paymentMethod:paymentMethod
                })
                cart.items.forEach((item)=>{
                    order.items.push({
                        productId: item.product._id,
                        productName: item.product.name,
                        productDescription: item.product.description,
                        brand:item.product.brand,
                        categoryId:item.product.category._id,
                        categoryName:item.product.category.name,
                        stock: item.product.stock,
                        productImage: item.product.image,
                        quantity: item.quantity,
                        price: item.product.price,
                        status:"payment pending",
                        discountPrice: (coupon) ? Math.round(((item.product.discountPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100 : item.product.discountPrice
                    })
                    
                })
                if(couponCode){
                    order.coupon={
                        couponCode: coupon.couponCode,
                        discount:coupon.discount
                    }
                    order.totalPrice=Math.round(((cart.totalPrice*(1-(coupon.discount/100))) + Number.EPSILON)* 100) / 100
                }
                await order.save();
                cart.items=[];
                cart.totalPrice=0;
                await cart.save();
                return res.status(200).json({orderId:order._id})
            }else{
                return res.status(500).json({error:"Select another mode of payment"})
            }
        }

    }catch(err){
        return res.status(500).json({error:"Something Happened"})
    }
}
