const mongoose=require("mongoose")

const Schema=mongoose.Schema;

const categorySchema=new Schema({
    name:{
        type:String,
        required:true
    },
    isListed:{
        type:Boolean,
        required:true,
        default:true
    },
    image:{
        type:String,
        required:true
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    categoryOffer:{
        type:Number,
        default:0
    }
});

module.exports=mongoose.model("Category",categorySchema);