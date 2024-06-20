const path=require("path")

const express=require("express")
const mongoose=require("mongoose")
const session=require("express-session")
const bodyParser=require("body-parser")
require("dotenv").config(); 
const flash=require("connect-flash")
const passport=require("passport")

const nocache=require("nocache")

const userRoutes=require("./routes/user.js")
const adminRoutes=require("./routes/admin.js")
const productRoutes=require("./routes/product.js")
const errorRoutes=require("./controllers/error.js")
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

app.use(session({
    secret:"secret key",
    resave:false,
    saveUninitialized:false
}))

app.use(flash());

app.use(passport.initialize())
app.use(passport.session())

app.use("/user",userRoutes);
app.use("/admin",adminRoutes);
app.use(productRoutes);

app.use(errorRoutes.get404);

mongoose.connect(MONGODB_URI)
.then(()=>{
    const server=app.listen(PORT,()=>console.log(`Server listening on http://localhost:${PORT}`))
    const io = require('./config/socket.js').init(server);
})
.catch((err)=>console.log(err));