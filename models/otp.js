
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
    },
    password:{
        type:String,
        required:true
    },
    otp:{
        type: String
        
    },
    referral:{
        type:String
    }
});

module.exports=mongoose.model("Otp",userSchema);