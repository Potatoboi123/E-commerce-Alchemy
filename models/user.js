
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
        type:String,
        required:true
    },
    phoneNo:{
        type:String
    },
    isBlocked:{
        type:Boolean,
        required:true
    },
    referralCode:{
        type:String
    },
    cart:{
        type: Schema.Types.ObjectId,
        ref:"Cart"
    },
    wishlist:{
        type: Schema.Types.ObjectId,
        ref:"wishlist"
    }
});

userSchema.statics.signup=async function (signup_name,signup_email,signup_password,signup_referral){

    const salt=await bcrypt.genSalt(10)
    const hashedPassword=await bcrypt.hash(signup_password,salt)
    const user=await this.create({
        name:signup_name,
        email:signup_email,
        password:hashedPassword,
        isBlocked:false,
        referralCode:signup_referral
    })
    return user
}

module.exports=mongoose.model("User",userSchema);