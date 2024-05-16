const mongoose=require("mongoose")

const Schema=mongoose.Schema;

const productSchema=new Schema({
    name:{
        type: String,
        required:true
    },
    price:{
        type: Number,
        required:true,
        min:0
    },
    discountPrice:{
        type:Number
    },
    description:{
        type: String,
        required: true
    },
    brand:{
        type:String,
        required:true
    },
    stock:{
        type:Number,
        required:true,
        min:0
    },
    image:{
        type: [String],
        required: true
    },
    isListed:{
        type: Boolean,
        default: true,
        required: true
    },
    discount:{
        type: Number,
        default: 0
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:"Category"
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
});

module.exports=mongoose.model("Product",productSchema)