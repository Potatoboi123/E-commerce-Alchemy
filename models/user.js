
const mongoose=require("mongoose");
const bcrypt=require("bcrypt")

const Schema=mongoose.Schema;

const userSchema=new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String
    },
    phoneNo:{
        type:String
    },
    isBlocked:{
        type:Boolean,
        default:false,
        required:true
    },
    referralCode:{
        type:String
    },
    referredCode:{
        type: String
    },
    googleId:{
        type:String
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    wallet:{
        balance: {type:Number, default:0},
        transactions:[{
            amount: {type: Number},
            description:{type:String},
            date: {type: Date, default: Date.now},
        }],
    }
});

userSchema.statics.signup=async function (signup_name,signup_email,signup_password,signup_referral,referralCode){

    const salt=await bcrypt.genSalt(10)
    const hashedPassword=await bcrypt.hash(signup_password,salt)
    const user=await this.create({
        name:signup_name,
        email:signup_email,
        password:hashedPassword,
        isBlocked:false,
        referralCode:referralCode,
        referredCode:signup_referral,
        cart:[],
        wishlist:[]
    })
    return user
}

module.exports=mongoose.model("User",userSchema);