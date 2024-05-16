const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
   
    couponCode: {
        type: String,
    },
    discount: {
        type: Number,
    },
    expiryDate: {
        type: Date,
    },
    minAmount: {
        type: Number,
    },
    maxAmount:{
        type: Number,
    },
    createdAt: {
        type: Date,
        default: Date.now
    }

});

const coupon = mongoose.model('Coupon',couponSchema);

module.exports = coupon;