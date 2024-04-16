const mongoose=require("mongoose");
const Schema=mongoose.Schema;

const wishListSchema=new Schema({
    user:{
        type:Schema.Types.ObjectId,
        required:true
    },
    items:[{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
    }],
    createdAt:{
        type:Date,
        default:Date.now
    }
})

module.exports=mongoose.model("Wishlist",wishListSchema);