const mongoose=require("mongoose");
const Schema=mongoose.Schema;

const cartSchema=new Schema({
    user:{
        type:Schema.Types.ObjectId,
        required:true
    },
    items:[{
        product:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        quantity:{
            type:Number,
            required:true
        }
        }],
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

module.exports=mongoose.model("Cart",cartSchema);