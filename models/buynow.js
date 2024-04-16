const mongoose=require("mongoose");
const Schema=mongoose.Schema;

const BuyNowSchema=new Schema({
    user:{
        type:Schema.Types.ObjectId,
        required:true
    },
    product:{
        type:Schema.Types.ObjectId,
        ref:"Product",
        required:true
    },
    totalPrice:{
        type:Number,
        default:0,
        required:true
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
    })

module.exports=mongoose.model("BuyNow",BuyNowSchema);