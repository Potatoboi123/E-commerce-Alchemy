const mongoose=require("mongoose")
const Schema=mongoose.Schema;

const addressSchema=new Schema({
    user:{
        type:Schema.Types.ObjectId,
        required:true
    },
    name:{
        type:String,
        required:true
    },
    phoneNo:{
        type:Number,
        required:true
    },
    pincode:{
        type:Number,
        required:true
    },
    locality:{
        type:String,
        required:true
    },
    address:{
        type:String,
        required:true
    },
    city:{
        type:String,
        required:true
    },
    state:{
        type:String,
        required:true
    },
    landmark:{
        type:String
    },
    alternateNo:{
        type:Number
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
});
module.exports=mongoose.model("Address",addressSchema);