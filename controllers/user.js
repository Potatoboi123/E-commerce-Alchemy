const bcrypt=require("bcrypt")
const validator=require("validator")
const {authenticator}=require("otplib")
const nodemailer = require("nodemailer");
const crypto=require("crypto")

const User=require("../models/user.js")
const Address=require("../models/address.js")
const Cart=require("../models/cart.js")
const Wishlist=require("../models/wishlist.js")
const Product=require("../models/product.js")
const Order=require("../models/orders.js")
const BuyNow=require("../models/buynow.js")

const transporter = nodemailer.createTransport({
    service:"gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Use `true` for port 465, `false` for all other ports
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
                name:"Cloth Store",
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
    return res.redirect("/home")
    res.render("user/userlogin")
}

exports.postLogin=async (req,res,next)=>{
    const {signin_email,signin_password}=req.body;
    try{
        const user=await User.findOne({email:signin_email})
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
        return res.status(401).json({message:err.message})
    }   
}

exports.getGoogle=(req,res,next)=>{
    req.session.user=req.user._id
    res.redirect("/home")
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
    
    const {action,formdata:{signup_name,signup_email,signup_password,signup_referral,otp}}=req.body
    
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
                const value=otpgeneretor(signup_email)
                await transporter.sendMail(value.info)
                req.session.data={signup_name,signup_email,signup_password,signup_referral}
                req.session.otp=value.token;
                setTimeout(()=>{ 
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
        setTimeout(()=>{ delete req.session.otp},60000);
        return res.status(200).json({message:"Enter The New Code"}); 
    }
        if(!(otp===req.session.otp)){
                return res.status(403).json({message:"Invalid Otp"})
            }
        const {signup_name,signup_email,signup_password,signup_referral}=req.session.data
        const user=await User.signup(signup_name,signup_email,signup_password,signup_referral)
        const cart=new Cart({
            user:user._id
        })
        const wishlist=new Wishlist({
            user:user._id
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
                setTimeout(()=>{req.session.otp=null},60000);
                return res.status(200).json({message:"Success"});
            }else{
                throw new Error("Email dosen't Exist")
            }

    }catch(err){
        return res.status(404).json({message:err.message})
    }
}

exports.postForgotOtp=async(req,res,next)=>{
    const otp=req.body.otp;
    if(otp===req.session.otp){
        req.session.change=true;
        return res.status(200).json({messsage:"Success"})
    }
    else
    return res.status(400).json({message:"Wrong Otp"})
}

exports.postForgotPassword=async (req,res,next)=>{
    if(req.session.change){
        delete req.session.change
        const password=req.body.password;
        const email=req.session.email;
        if(!validator.isStrongPassword(password)){
            return res.status(400).json({message:"Password Not Strong Enough"})
        }
        try{
                const user=await User.findOne({email:email});
                const salt=await bcrypt.genSalt(10)
                const hashedPassword=await bcrypt.hash(password,salt)
                user.password=hashedPassword;
                await user.save();
                return res.status(200).json({message:"Password Updated"});

        }catch(err){
            return res.status(500).json({message:err.message})
        } 
    }else{
        return res.status(500).json({message:"Error"})
    }
    
}

exports.getProfile=async (req,res,next)=>{
    try{
       const user=await User.findById(req.session.user||"663a2b00293758b81d67eb0a")
        res.render("user/userprofile",{user}) 
    }catch(err){
        console.log(err)
    }
    
}

exports.getAddress=async (req,res,next)=>{
    try{
        const user=await User.findById(req.session.user||"663a2b00293758b81d67eb0a");
        const addresses=await Address.find({user:req.session.user||"663a2b00293758b81d67eb0a"})
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
            user:req.session.user||"663a2b00293758b81d67eb0a",
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

exports.getOrder=async (req,res,next)=>{
    try{
        const orders=await Order.find({userId:req.session.user||"663a2b00293758b81d67eb0a"})
        res.render("user/order",{orders})
    }catch(err){
        console.log(err)
    }
}

exports.getOrderDetails=async (req,res,next)=>{
    try{
        const orderId=req.params.orderId
        const order=await Order.findById(orderId)
        res.render("user/orderdetails",{order})
    }catch(err){
        console.log(err)
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
            user:req.session.user||"663a2b00293758b81d67eb0a"
        }
        const update={
            user:req.session.user||"663a2b00293758b81d67eb0a",
            product:productId,
            totalPrice: product.price
        }
        await BuyNow.findOneAndUpdate(conditions,update,options);
        
        res.status(200).json({message:"Successfully Added"})
    }catch(err){
        res.status(500).json({message:"Sorry For The Inconvenince.We are Currently working on a solution."})
    }
}

exports.getCart=async (req,res,next)=>{
    try{
        const cart=await Cart.findOne({user:req.session.user||"663a2b00293758b81d67eb0a"})
        .populate("items.product");
        await cart.populate("items.product.category")
        let totalPrice=0;
        cart.items.forEach((item)=>{
            totalPrice+=item.quantity*item.product.price
        })
        res.render("user/cart",{
            cart,
            totalPrice
        })        
    }catch(err){
        console.log(err)
    } 
}

exports.postAddCart=async (req,res,next)=>{
    try{
        const productId=req.params.id;
        const cart=await Cart.findOne({user:req.session.user||"663a2b00293758b81d67eb0a"})
        const product=await Product.findById(productId)
        const index=cart.items.findIndex((item)=>{
            return item.product.toString()===productId
        })
        if(index<0&&product.stock>0){
            cart.items.push({
                product:productId,
                quantity:1
            })
            cart.totalPrice+=product.price;
            await cart.save();
        }else if(!(index<0)&&(product.stock>cart.items[index].quantity)){
            cart.items[index].quantity++;
            cart.totalPrice+=product.price;
            await cart.save();
        }else{
            return res.status(409).json({outOfStock:true})
        }
        res.status(200).json({message:"Successfully Added"})
    }catch(err){
        res.status(500).json({message:"Sorry For The Inconvenince.We are Currently working on a solution."})
    }

}

exports.deleteCart=async (req,res,next)=>{
    try{
        let quantity,totalPrice;
        const id=req.params.id;
        let cart=await Cart.findOne({user:req.session.user||"663a2b00293758b81d67eb0a"})
        let product=await Product.findOne({_id:id})
        const newCartItems=cart.items.filter((val)=>{
            if(val.product.toString()==id){quantity=val.quantity}
            return val.product.toString()!==id
        })
        cart.items=newCartItems;
        cart.totalPrice-=product.price*quantity
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
        const cart=await Cart.findOne({user:req.session.user||"663a2b00293758b81d67eb0a"});
        const product=await Product.findOne({_id:id})
        const index=cart.items.findIndex((val)=>{
            return val.product.toString()===id
        });
        if(cart.items[index].quantity==product.stock&&action){
            return res.status(404).json({outOfStock:true})
        }else if(cart.items[index].quantity===1&&!action){
            return res.status(404).json({negative:true})
        }
        else if(action){
            cart.items[index].quantity++;
            cart.totalPrice+=product.price;
        }else{
            cart.items[index].quantity--;
            cart.totalPrice-=product.price;
        }
        totalPrice=cart.totalPrice
        await cart.save();
        res.status(200).json({message:"Success",totalPrice})
    }catch(err){
        res.status(500).json({message:"Something Happened"});
    }
}

exports.getCheckout=async (req,res,next)=>{
    try{
        const addresses=await Address.find({user:req.session.user||"663a2b00293758b81d67eb0a"})
        const cart=await Cart.findOne({user:req.session.user||"663a2b00293758b81d67eb0a"})
        .populate("items.product");
        await cart.populate("items.product.category")
        res.render("user/checkout",{addresses,cart})

    }catch(err){
        console.log(err)
    }
}

exports.postCheckout=async (req,res,next)=>{
    try{
        let product;
        const {address,paymentMethod}=req.body
        const cart=await Cart.findOne({user:req.session.user||"663a2b00293758b81d67eb0a"}).populate("items.product");
        if(cart.items.length==0){
            return res.status(404).json({error:"Add Products To Cart"})
        }
        for(let item of cart.items){
            if(item.product.stock<item.quantity)
                return res.status(404).json({error:`Product ${item.product} Out of Stock`})
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
        if(paymentMethod==="cashOnDelivery"){
            let order=new Order({
                orderId:orderId,
                userId:req.session.user||"663a2b00293758b81d67eb0a",
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
                    stock: item.product.stock,
                    productImage: item.product.image,
                    quantity: item.quantity,
                    price: item.product.price,
            })
        })
            await order.save();
            for(let item of cart.items){
                product=await Product.findById(item.product._id)
                product.stock-=item.quantity
                await product.save();
            }
            cart.items=[];
            cart.totalPrice=0;
            await cart.save();
            return res.status(200).json({message:"Success"})
        }else{
            return res.status(500).json({error:"Select another mode of payment"})
        }

    }catch(err){
        return res.status(500).json({error:"Something Happened"})
    }

}