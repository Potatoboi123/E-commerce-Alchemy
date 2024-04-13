const mongoose=require("mongoose")

const Schema=mongoose.Schema;

const productSchema=new Schema({
    name:{
        type: String,
        required:true
    },
    price:{
        type: Number,
        required:true
    },
    description:{
        type: String,
        required: true
    },
    stock:{
        type: Number,
        required: true
    },
    image:{
        type: String,
        required: true
    },
    is_listed:{
        type: Boolean,
        required: true
    },
    offer:{
        type: Number,
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:"Category"
    }
});

module.exports=mongoose.model("Product",productSchema)