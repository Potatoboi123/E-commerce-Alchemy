const fs=require("fs")
const path=require("path")

const validator=require("validator");
const moment=require("moment");
const PDFDocument = require('pdfkit');
const ExcelJS=require("exceljs")
const PDFDocument2=require('pdfkit-table');

const User=require("../models/user")
const Category=require("../models/category")
const Product=require("../models/product")
const Order=require("../models/orders.js")
const Coupon=require("../models/coupon.js")

exports.getLogin=(req,res,next)=>{
    res.render("admin/login")
}

exports.postLogin=(req,res,next)=>{
    const {name,password}=req.body;
    if(name===process.env.adminId&&password===process.env.adminPass){
        req.session.admin=name;
        res.redirect("/admin/dashboard");
    }
    else{
        res.redirect("/admin")
    }
}

exports.postLogout=(req,res,next)=>{
    req.session.destroy(err=>{
        console.log(err)
        res.redirect("/admin")
    })
}

exports.getDashboard= async (req,res,next)=>{

    let timeFrame=req.query.timeFrame
    let matchStage;
    switch (timeFrame) {
        case 'yearly':
            matchStage = { orderDate: { $gte: moment().startOf('year').toDate(), $lt: moment().endOf('year').toDate() } };
            break;
        case 'monthly':
            matchStage = { orderDate: { $gte: moment().startOf('month').toDate(), $lt: moment().endOf('month').toDate() } };
            break;
        case 'weekly':
            matchStage = { orderDate: { $gte: moment().startOf('week').toDate(), $lt: moment().endOf('week').toDate() } };
            break;
        case 'daily':
            matchStage = { orderDate: { $gte: moment().startOf('day').toDate(), $lt: moment().endOf('day').toDate() } };
            break;
        default:
            matchStage = {}; // No filter, include all data
    }

    const topSellingProducts = await Order.aggregate([
        { $match: matchStage },
        { $unwind: "$items" }, // Unwind the items array
        { 
            $group: { // Group by productId and sum the quantities
                _id: "$items.productId",
                totalQuantitySold: { $sum: "$items.quantity" },
                productName: { $first: "$items.productName" }, // Include other fields if necessary
                productImage: { $first: "$items.productImage" }
            }
        },
        { $sort: { totalQuantitySold: -1 } }, // Sort by totalQuantitySold in descending order
        { $limit: 10 } // Limit to the top 10 products
    ]);

    const topSellingCategories = await Order.aggregate([
        { $match: matchStage }, // Filter based on the time frame
        { $unwind: "$items" },
        {
            $lookup: {
                from: 'categories',
                localField: 'items.categoryId',
                foreignField: '_id',
                as: 'categoryDetails'
            }
        },
        {
            $group: {
                _id: "$categoryDetails._id",
                totalQuantitySold: { $sum: "$items.quantity" },
                categoryName: { $first: "$categoryDetails.name" },
                categoryImage: { $first: "$categoryDetails.image" }
            }
        },
        { $sort: { totalQuantitySold: -1 } },
        { $limit: 10 }
    ]);

    const topSellingBrands= await Order.aggregate([
        { $match: matchStage },
        { $unwind: "$items" }, // Unwind the items array
        { 
            $group: { // Group by productId and sum the quantities
                _id: "$items.brand",
                totalQuantitySold: { $sum: "$items.quantity" },
                brandName: { $first: "$items.brand" }
            }
        },
        { $sort: { totalQuantitySold: -1 } }, // Sort by totalQuantitySold in descending order
        { $limit: 10 } // Limit to the top 10 products
    ]);
    res.render("admin/dashboard",{topSellingProducts,topSellingCategories,current:"dashboard",topSellingBrands,timeFrame});
}
exports.getUser=async (req,res,next)=>{
    try{
        const users=await User.find().sort({createdAt:-1});
        res.render("admin/user",{users,current:"user"});
    }catch(err){
        console.log(err)
    }
   
}

exports.patchUserStatus=async (req,res,next)=>{
    const userid=req.params.userid
    try{
        const user=await User.findById(userid)
        user.isBlocked=!user.isBlocked
        await user.save();
        res.status(200).json({message:"Success"})
    }catch(err){
        res.status(400).json({message:"Unexpected Error Occured"})
    }
}

exports.getCategory=async (req,res,next)=>{

    try{
        const categories=await Category.find().sort({createdAt:-1});
        let message=req.flash("error")
        res.render("admin/category",{categories,message,current:"category"})
    }catch(err){
        console.log(err)
    }
    
}

exports.patchCategoryStatus=async (req,res,next)=>{
    const categoryid=req.params.categoryid
    try{
        const category=await Category.findById(categoryid)
        category.isListed=!category.isListed
        await category.save();
        res.status(200).json({message:"Success"})
    }catch(err){
        res.status(400).json({message:"Unexpected Error Occured"})
    }
}

exports.postAddCategory=async (req,res,next)=>{
    try{
        let imageUrl;
        if(req.file){
            imageUrl=req.file.destination+req.file.filename;
        }else{
            req.flash('error', 'You Must Select An Image');
            res.redirect("/admin/category")
        }
        const name=req.body.name
        const existingCategory=await Category.findOne({ name: new RegExp('^' + name + '$', 'i') })
        if(!existingCategory){
           const category=new Category({
            name:name,
            image:imageUrl
        })
        await category.save();
        res.redirect("/admin/category") 
        }else{
            req.flash('error', 'Category Already Exists');
            res.redirect("/admin/category")
        }
        
    }catch(err){
        console.log("err")
    }
    
}

exports.postEditCategory=async (req,res,next)=>{
    try{
        const name=req.body.editname
        const id=req.body.category_id  
        const cat=await Category.find({$and:[{name:new RegExp('^' + name + '$', 'i')},{_id:{$ne:id}}]})
        if(cat.length>0){
            req.flash("error","Category Name Already Exists")
            return res.redirect("/admin/category")
        }
        const category=await Category.findById(id)
        if(req.file){
            const image=req.file;
            const imageUrl=image.destination+image.filename
            category.image=imageUrl
        }
        category.name=name;    
        await category.save()
        res.redirect("/admin/category")
    }catch(err){
        console.log(err.message)
    }
    
}

exports.patchCategoryDiscount=async (req,res,next)=>{
    try{
        const {discountId,discount}=req.body;
        if(!(validator.isNumeric(discount) && +discount>=0 && +discount<=100)){
            return res.status(404).json({error:"Enter Valid discount"})
        }
        const category=await Category.findById(discountId)
        category.categoryOffer=discount;
        await category.save();
        const products=await Product.find({discount:0})
        for(product of products){
            product.discountPrice=parseFloat((product.price*(1-category.categoryOffer/100)).toFixed(2));
            await product.save()
        }
        res.status(200).json({message:"Success"});
    }catch(err){
        console.log(err)
        res.status(500).json({serverError:true})
    }
}

exports.getProduct=async (req,res,next)=>{
    const products=await Product.find().populate("category").sort({createdAt:-1});
    res.render("admin/product",{products,current:"product"});
}

exports.patchProductStatus=async (req,res,next)=>{
    const productid=req.params.productid
    try{
        const product=await Product.findById(productid)
        product.isListed=!product.isListed
        await product.save();
        res.status(200).json({message:"Success"})
    }catch(err){
        res.status(400).json({message:"Unexpected Error Occured"})
    }
}

exports.getAddProduct=async (req,res,next)=>{
    try{
        const categories=await Category.find();  
        res.render('admin/addproduct',{
            categories,
            errorMessage:req.flash("error"),
            current:"product"
        });
    }catch(err){
        console.log(err.message)
    }
    
}

exports.postAddProduct=async (req,res,next)=>{
    let imageUrl;
    /* let nameRegex = /^[a-zA-Z\s]+$/ */
    if(req.files&&req.files.length>0){
        imageUrl=req.files.map((image)=>"/"+image.destination+image.filename)
    }else{
        req.flash("error","Must Select Images")
        return res.redirect("/admin/add-product");
    }
    try{
        const {product_category,product_name,product_price,product_stock,product_description,product_brand}=req.body
        if(product_price<0||product_stock<0/* ||!nameRegex.test(product_name) */){
            req.flash("error","Enter Valid Details")
            return res.redirect("/admin/add-product");
        }
        const category=await Category.findOne({name:product_category})

        const product=new Product({
            name:product_name,
            price:product_price,
            discountPrice:product_price,
            description:product_description,
            brand:product_brand,
            stock:product_stock,
            image:imageUrl,
            category:category._id
        })
        if(category.categoryOffer){
            product.discountPrice = parseFloat((product_price - (product_price * (category.categoryOffer / 100))).toFixed(2));
        }
        await product.save();
        
        res.redirect("/admin/product");
    }catch(err){
        console.log(err.message)
    }
    
}

exports.getEditProduct=async (req,res,next)=>{
    try{
        const prodid=req.params.product_id
        const product= await Product.findById(prodid).populate("category")
        const categories=await Category.find(); 
        let message=req.flash("error") 
        res.render('admin/editproduct',{product,categories,message,current:"product"});
    }catch(err){
        console.log(err.message)
    }
}

exports.postEditProduct=async (req,res,next)=>{
    try{
        const {product_name,product_price,product_category,product_id,product_stock,product_description,product_brand,existingImage}=req.body
        const images=req.files;
        let finalImage=[];
        if(product_price<0||product_stock<0){      
            req.flash("error","Invalid Stock")
            return res.redirect('/admin/edit-product/'+product_id)
        }else if((!existingImage || (Array.isArray(existingImage) && existingImage.length<=0)) && images.length<=0 ){
            req.flash("error","Must Upload An Image")
            return res.redirect('/admin/edit-product/'+product_id)
        }
            const product= await Product.findById(product_id)
            const category=await Category.findOne({name:product_category})
            if(product.image.length+images.length>5){
                req.flash("error","Maximum image for a product is 5.")
                return res.redirect('/admin/edit-product/'+product_id)
            }
            product.name=product_name
            product.price=product_price
            product.category=category
            product.description=product_description
            product.stock=product_stock
            product.brand=product_brand
            if(product.discount){
                product.discountPrice = parseFloat((product_price * (1 - product.discount / 100)).toFixed(2));
            }else if(category.categoryOffer){
                product.discountPrice = parseFloat((product_price * (1 - category.categoryOffer / 100)).toFixed(2));
            }else{
                product.discountPrice=product_price
            }
            if(images.length>0){
                let imageUrl=images.map((image)=>"/"+image.destination+image.filename)
                finalImage=[...imageUrl]
            }
            if(Array.isArray(existingImage)){
                finalImage=[...existingImage]
            }else{
                finalImage.push(existingImage)
            }
            product.image=finalImage
            await product.save();
            res.redirect('/admin/product');
        
        
    }catch(err){
        console.log(err.message)
    }
}

exports.patchProductDiscount=async (req,res,next)=>{
    try{
        const {discountId,discount}=req.body;
        if(!(validator.isNumeric(discount) && +discount>=0 && +discount<=100)){
            return res.status(404).json({error:"Enter Valid discount"})
        }
        const product=await Product.findById(discountId)
        product.discount=discount;
        product.discountPrice=product.price-(product.price*(+discount/100))
        await product.save();
        res.status(200).json({message:"Success"});
    }catch(err){
        console.log(err)
        res.status(500).json({serverError:true})
    }

}

exports.getOrder=async (req,res,next)=>{
    const orders=await Order.find().populate("userId").sort({createdAt:-1});
    res.render("admin/order",{orders,current:"order"});
}

exports.patchOrderStatus=async (req,res,next)=>{

    const orderId = req.params.orderId;
    const { status,itemId } = req.body;
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Update order status based on the selected option
        order.items.forEach((item=>{
            if(item._id.toString()==itemId.toString()){

/*                 if (status === "cancel") {
                    item.status = "cancelled";
                } */if (status === "pending") {
                    item.status = "pending";
                } else if (status === "shipped") {
                    item.status = "shipped";
                } else if (status === "delivered") {
                    item.status = "delivered";
                }
            }
        }))

        await order.save();
        return res.status(200).json({ message: "Order status updated successfully" });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }

}

exports.getCoupon=async (req,res,next)=>{
    try {

        const coupons=await Coupon.find();
        res.render("admin/coupon",{coupons,current:"coupon"})
    } catch (error) {
        console.log(error)
    }

}

exports.postAddCoupon = async (req, res, next) => {
    try {
        const { couponCode, discount, expiryDate, minAmt, maxAmt } = req.body;
        
        // Convert expiryDate to a Date object
        const selectedDate = new Date(expiryDate);
        const currentDate = new Date();
        // Validation logic
        if (couponCode.length!==couponCode.replace(/\s/g, '').length) {
            return res.status(400).json({ error: "Coupon Code cant  have spaces" });
        }
        if (selectedDate < currentDate) {
            return res.status(400).json({ error: "Expiry date cannot be in the past" });
        }
        
        if (Number(minAmt) < 0) {
            return res.status(400).json({ error: "Min Amount cannot be less than 0" });
        }

        if (Number(maxAmt) < 0) {
            return res.status(400).json({ error: "Max Amount cannot be less than 0" });
        }

        if (Number(maxAmt) < Number(minAmt)) {
            return res.status(400).json({ error: "Max Amount cannot be less than Min Amount" });
        }

        // Check if the coupon code already exists
        const existingCoupon = await Coupon.findOne({ couponCode: couponCode });
        if (existingCoupon) {
            return res.status(400).json({ error: "Coupon code already exists" });
        }

        // If all validations pass, create and save the new coupon
        const coupon = new Coupon({
            couponCode,
            discount,
            expiryDate:selectedDate,
            minAmount: minAmt,
            maxAmount: maxAmt
        });

        await coupon.save();
        return res.status(201).json({ message: "Coupon created successfully" });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

exports.deleteCoupon= async (req,res,next)=>{
    try{
        const couponId=req.params.id
        await Coupon.findByIdAndDelete(couponId)
        res.status(200).json({message:"Success"})
    }catch(err){
        res.status(500).json({message:"Sorry For The Inconvenince.We are Currently working on a solution."})
    }
}

exports.putEditCoupon=async (req,res,next)=>{
    try {
        const { couponCode, discount, expiryDate, minAmt, maxAmt ,couponId} = req.body;
        
        // Convert expiryDate to a Date object
        const selectedDate = new Date(expiryDate);
        const currentDate = new Date();
        // Validation logic
        if (couponCode.length!==couponCode.replace(/\s/g, '').length) {
            return res.status(400).json({ error: "Coupon Code cant  have spaces" });
        }
        if (selectedDate < currentDate) {
            return res.status(400).json({ error: "Expiry date cannot be in the past" });
        }
        
        if (Number(minAmt) < 0) {
            return res.status(400).json({ error: "Min Amount cannot be less than 0" });
        }

        if (Number(maxAmt) < 0) {
            return res.status(400).json({ error: "Max Amount cannot be less than 0" });
        }

        if (Number(maxAmt) < Number(minAmt)) {
            return res.status(400).json({ error: "Max Amount cannot be less than Min Amount" });
        }

        // Check if the coupon code already exists
        let existingCoupon = await Coupon.findOne({ couponCode: couponCode,_id: {$ne:couponId}});
        if (existingCoupon) {
            return res.status(400).json({ error: "Coupon code already exists" });
        }
        let coupon=await Coupon.findById(couponId)
        // If all validations pass, create and save the new coupon
        
        coupon.couponCode=couponCode,
        coupon.discount=discount,
        coupon.expiryDate=selectedDate,
        coupon.minAmount= minAmt,
        coupon.maxAmount= maxAmt

        await coupon.save();
        return res.status(201).json({ message: "Coupon Edited successfully" });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

exports.getSalesReport=async (req,res,next)=>{
    try {

        let { startDate, endDate, filterOption } = req.query;
        let ordersQuery = {};
        
        if (startDate && endDate) {
            ordersQuery.orderDate = { 
                $gte: new Date(startDate), 
                $lte: new Date(endDate) 
            };
        } else if (filterOption) {
                const today = moment().startOf('day');
                switch (filterOption) {
                    case 'daily':
                        startDate = today;
                        endDate = moment(today).endOf('day');
                        break;
                    case 'weekly':
                        startDate = moment(today).startOf('isoWeek');
                        endDate = moment(today).endOf('isoWeek');
                        break;
                    case 'monthly':
                        startDate = moment(today).startOf('month');
                        endDate = moment(today).endOf('month');
                        break;
                }
                ordersQuery.orderDate = { 
                    $gte: startDate.toDate(), 
                    $lte: endDate.toDate() 
                };
            }
        const orders = await Order.find(ordersQuery).populate("userId").sort({ createdAt: -1 });
        const totalCount = await Order.countDocuments(ordersQuery);
        const totalAmount = await Order.aggregate([
            {
              $match: ordersQuery,
            },
            {
              $group: {
                _id: null,
                totalAmount: { $sum: "$totalPrice" },
              },
            },
            {
                $project:{
                    _id:0
                }
            }
          ]);
          const totalUser=await Order.distinct("userId")
        res.render("admin/salesreport", {
            orders,
            totalCount,
            totalAmount: (totalAmount.length>0) ? totalAmount[0].totalAmount : 0,
            startDate: startDate ? moment(startDate).format('YYYY-MM-DD') : '',
            endDate: endDate ? moment(endDate).format('YYYY-MM-DD') : '',
            filterOption: filterOption,
            totalUser:totalUser.length>0 ? totalUser.length : 0,
            current:"sales"
        });

    } catch (error) {
        console.log(error)
    }
    
}

exports.getSalesReportPdf=async (req,res,next)=>{

    try{
        let { startDate, endDate, filterOption } = req.query;
        let ordersQuery = {};
        let sum=0;
        if (startDate && endDate) {
            ordersQuery.orderDate = { 
                $gte: new Date(startDate), 
                $lte: new Date(endDate) 
            };
        } else if (filterOption) {
                const today = moment().startOf('day');
                switch (filterOption) {
                    case 'daily':
                        startDate = today;
                        endDate = moment(today).endOf('day');
                        break;
                    case 'weekly':
                        startDate = moment(today).startOf('isoWeek');
                        endDate = moment(today).endOf('isoWeek');
                        break;
                    case 'monthly':
                        startDate = moment(today).startOf('month');
                        endDate = moment(today).endOf('month');
                        break;
                }
                ordersQuery.orderDate = { 
                    $gte: startDate.toDate(), 
                    $lte: endDate.toDate() 
                };
            }
        const orders = await Order.find(ordersQuery).populate("userId").sort({ createdAt: -1 });
        const totalCount = await Order.countDocuments(ordersQuery);
        let totalAmount = await Order.aggregate([
            {
            $match: ordersQuery,
            },
            {
            $group: {
                _id: null,
                totalAmount: { $sum: "$totalPrice" },
            },
            },
            {
                $project:{
                    _id:0
                }
            }
        ]);
        let totalUser=await Order.aggregate([
            {
            $match:ordersQuery
            },{
                $group:{_id:"$userId",count:{$sum:1}}
            },
            {$project:{_id:0}}
        ]);
        totalAmount= (totalAmount.length>0) ? totalAmount[0].totalAmount : 0
        totalUser=totalUser.length>0 ? totalUser[0].count : 0

        const doc = new PDFDocument2;
        const salesReportPdfName='salesReport-'+Date.now()+'.pdf';
        const salesReportPdfPath=path.join('data','salesReportPdf',salesReportPdfName)
       
        res.setHeader('Content-Type','application/pdf')
        res.setHeader('Content-Disposition','inline;filename="'+salesReportPdfName+'"') //change 'inline' to attatchment to download directly
        
        doc.pipe(fs.createWriteStream(salesReportPdfPath))

        doc.pipe(res)
    
        // Add content to PDF
        doc.fontSize(20).text('Sales Report', { align: 'center' });
        doc.moveDown();

        doc.fontSize(15).text(`Overall Sales Count: ${totalCount}`);
        doc.moveDown();

        doc.fontSize(15).text(`Overall Order Amount: $${totalAmount.toFixed(2)}`);
        doc.moveDown();

        doc.fontSize(15).text(`Total Users: ${totalUser}`);
        doc.moveDown(2);

        // Prepare table data
        const table = {
            headers: [
                'Order ID', 'Name', 'Products', 'Total Quantity', 'Total Price', 'Address', 'Payment Method', 'Order Date'
            ],
            rows: orders.map(order => {
                sum=0;
                const products = order.items.map(item => {
                    
                    if(item.status==="cancelled"){
                        return `${item.productName}(cancelled) - ${item.quantity}`
                    }else if(item.status==="returned"){
                        return `${item.productName}(returned) - ${item.quantity}`
                    }else{
                        sum+=item.discountPrice
                        return `${item.productName} - ${item.quantity}`
                    }
                    
                }).join(', ');
                const address = `${order.address.name}, ${order.address.phoneNo}, ${order.address.address}, ${order.address.locality}, ${order.address.city}, ${order.address.state} - ${order.address.pincode}`;
                if(order.coupon.discount){
                    sum=(sum*(1-order.coupon.discount/100)).toFixed(2);
                }else{
                    sum=sum.toFixed(2);
                }
                return [
                    order.orderId,
                    order.userId.name,
                    products,
                    order.totalQuantity,
                    `$${sum}`,
                    address,
                    order.paymentMethod,
                    order.orderDate.toISOString().split('T')[0] // Format as YYYY-MM-DD
                ];
            })
        };

        // Add table to PDF
        doc.table(table, {
            prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
            prepareRow: (row, i) => doc.font('Helvetica').fontSize(10)
        });

        // Finalize the PDF and end the stream
        doc.end();


    }catch (error) {
        
        console.log(error)
    }

}
exports.getSalesReportExcel=async (req,res,next)=>{

    try{

        let { startDate, endDate, filterOption } = req.query;
        let ordersQuery = {};
        
        if (startDate && endDate) {
            ordersQuery.orderDate = { 
                $gte: new Date(startDate), 
                $lte: new Date(endDate) 
            };
        } else if (filterOption) {
                const today = moment().startOf('day');
                switch (filterOption) {
                    case 'daily':
                        startDate = today;
                        endDate = moment(today).endOf('day');
                        break;
                    case 'weekly':
                        startDate = moment(today).startOf('isoWeek');
                        endDate = moment(today).endOf('isoWeek');
                        break;
                    case 'monthly':
                        startDate = moment(today).startOf('month');
                        endDate = moment(today).endOf('month');
                        break;
                }
                ordersQuery.orderDate = { 
                    $gte: startDate.toDate(), 
                    $lte: endDate.toDate() 
                };
            }
        const orders = await Order.find(ordersQuery).populate("userId").sort({ createdAt: -1 });
        const totalCount = await Order.countDocuments(ordersQuery);
        let totalAmount = await Order.aggregate([
            {
            $match: ordersQuery,
            },
            {
            $group: {
                _id: null,
                totalAmount: { $sum: "$totalPrice" },
            },
            },
            {
                $project:{
                    _id:0
                }
            }
        ]);
        let totalUser=await Order.aggregate([
            {
            $match:ordersQuery
            },{
                $group:{_id:"$userId",count:{$sum:1}}
            },
            {$project:{_id:0}}
        ]);
        totalAmount= (totalAmount.length>0) ? totalAmount[0].totalAmount : 0
        totalUser=totalUser.length>0 ? totalUser[0].count : 0

        const salesReportExcelName='salesReport-'+Date.now()+'.xlsx';

        // Create a workbook and add a worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Define headers for the Excel sheet
        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 15 },
            { header: 'User Name', key: 'userName', width: 20 },
            { header: 'Products', key: 'products', width: 40 },
            { header: 'Total Quantity', key: 'totalQuantity', width: 15 },
            { header: 'Total Price', key: 'totalPrice', width: 15 },
            { header: 'Address', key: 'address', width: 40 },
            { header: 'Payment Method', key: 'paymentMethod', width: 20 },
            { header: 'Order Date', key: 'orderDate', width: 20 },
        ];
        // Add data
        orders.forEach(order => {
            worksheet.addRow({
                orderId:order.orderId,
                userName:order.userId.name,
                products:order.items.map(item => `${item.productName} - ${item.quantity}`).join(', '),
                totalQuantity:`${order.totalQuantity}`,
                totalPrice:`$${order.totalPrice}`,
                address:`${order.address.name}, ${order.address.phoneNo}, ${order.address.address}, ${order.address.locality}, ${order.address.city}, ${order.address.state} - ${order.address.pincode}`,
                paymentMethod:order.paymentMethod,
                orderDate:`${order.orderDate}`
            });
        });
        // Add totals row
        worksheet.addRow({
            orderId: 'Total',
            totalPrice: `$${totalAmount.toFixed(2)}`,
            userId:totalUser
        });

        // Generate Excel file
        res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.setHeader('Content-Disposition','attachment;filename="'+salesReportExcelName+'"')

        await workbook.xlsx.write(res);

        // End response
        res.end();

    }catch (error) {
        
        console.log(error)
    }

}

exports.getChat=async (req,res,next)=>{
    res.render("admin/chat",{current:"chat"})
}