const bcrypt=require("bcrypt")
const validator=require("validator")
const {authenticator}=require("otplib")
const nodemailer = require("nodemailer");

const User=require("../models/user.js")
const Otp=require("../models/otp.js")

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


exports.getLogin=(req,res,next)=>{
    res.render("user/userlogin")
}

exports.postLogin=async (req,res,next)=>{
    const {signin_email,signin_password}=req.body;
    try{
        const user=await User.findOne({email:signin_email})
        const pass=await bcrypt.compare(signin_password,user.password)
            if(pass){
                req.session.user=user;
                return res.status(200).json({message:"Success"})
            }else{
                return res.status(401).json({message:"Invalid Username Or Password"})
            }
    }catch(err){
        return res.status(401).json({message:"Invalid Username Or Password"})
    }
    
    
}

exports.postSignup=async (req,res,next)=>{
    
    const {action,formdata:{signup_name,signup_email,signup_password,signup_referral,otp}}=req.body
    
    try{
        if(action==="signup"){
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
                
                let secret = authenticator.generateSecret();
                let token = authenticator.generate(secret);

                try{
                

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

                  await transporter.sendMail(info)
                  setTimeout(()=>{req.session.otp=null},60000);
                  req.session.data={signup_name,signup_email,signup_password,signup_referral}
                  req.session.otp=token;
                  return res.status(200).json({message:"Verification Code Send"});  
                }catch(err){
                    console.log(err)
                    return res.status(500).json({message:"Error Sending Email"})
                }
                
            }
        }
        
        if(action==="otp"){

            if(!(otp===req.session.otp)){
                return res.status(403).json({message:"Invalid Otp"})
            }
           const {signup_name,signup_email,signup_password,signup_referral}=req.session.data
           const user=await User.signup(signup_name,signup_email,signup_password,signup_referral)
           return res.status(201).json({message:"Enter Credentials to Login"}); 

        }

    }catch(err){
        console.log(err)
        res.status(400).json({message:"failed"})
    }
    
}