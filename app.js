const path=require("path")

const express=require("express")
const mongoose=require("mongoose")
const session=require("express-session")
const bodyParser=require("body-parser")
require("dotenv").config(); 
const flash=require("connect-flash")
const passport=require("passport")
/* const multer=require("multer") */

const nocache=require("nocache")
/* const morgan = require('morgan'); */

const userRoutes=require("./routes/user.js")
const adminRoutes=require("./routes/admin.js")
const productRoutes=require("./routes/product.js")
const passportSetup=require("./config/passport-setup.js")

const app=express();

const MONGODB_URI=process.env.MONGODB_URI
const PORT=process.env.PORT||8080

app.set("view engine","ejs")

app.use(bodyParser.urlencoded({extended:true}))
app.use(express.json())

app.use(express.static(path.join(__dirname,"public")))
app.use("/uploads",express.static(path.join(__dirname,"uploads")))

app.use(nocache())
/* app.use(morgan('combined')); */

app.use(session({
    secret:"secret key",
    resave:false,
    saveUninitialized:false
}))

app.use(flash());

app.use(passport.initialize())
app.use(passport.session())

//CORS HEADERS
/* app.use((req,res,next)=>{
    res.setHeader("Access-Control-Origin","*")
    res.setHeader("Access-Control-Methods","GET,POST,PUT,PATCH,DELETE")
    res.setHeader("Access-Control-Headers","Content-Type,Authorization")
    next();
}) */

/* Development Begin */

app.use((req,res,next)=>{
    req.session.user="663a2b00293758b81d67eb0a";
    req.session.admin=true
    next();
})

/* Development End */

app.use("/user",userRoutes);
app.use("/admin",adminRoutes);
app.use(productRoutes);

app.use((req,res,next)=>{
    let userName;
    if(req.session.user){
        userName=req.session.user
    }else{
        userName=null
    }
    res.render("errorPage",{userName})
})

mongoose.connect(MONGODB_URI)
.then(()=>{
    const server=app.listen(PORT,()=>console.log(`Server listening on http://localhost:${PORT}`))
    const io = require('./config/socket.js').init(server);
})
.catch((err)=>console.log(err));