const mongoose = require('mongoose');
const moment = require('moment-timezone');

const Schema=mongoose.Schema;

const orderSchema = mongoose.Schema({
    orderId: {
         type: String
        },
    userId: {
         type: Schema.Types.ObjectId,
         required:true
         },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId},
        productName: { type: String},
        productDescription: { type: String,},
        productRating: { type: Number,default:0},
        stock: { type: Number,},
        productImage: { type: [String]},
        quantity: { type: Number,min: 1 },
        price: { type: Number,min: 0 },
        status: { type: String,default:"Pending"},
        reason: { type: String,default: "" },
        discountPrice: { type: Number, default: 0 },
        couponCode: { type: String },
        refferalCode: { type: String }
    }],
    totalQuantity: { type: Number,min: 1 },
    totalPrice: { type: Number,min: 0 },
    address: {
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
        }   
    },
    paymentMethod: { type: String},
    orderDate: { type: Date },
    createdAt:{
        type:Date
    }
});

// Pre-save hook to format orderDate and createdAt fields using Moment.js
orderSchema.pre('save', function(next) {
    this.orderDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
    this.createdAt = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
    next();
});

const ordersCollection = mongoose.model('orders', orderSchema);

module.exports = ordersCollection;