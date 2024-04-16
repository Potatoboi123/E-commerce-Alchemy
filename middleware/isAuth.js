const User=require("../models/user.js")

exports.isUser=async (req,res,next)=>{
    
    /* if(req.session.user){
        const user=await User.findById(req.session.user)
        if(user.isBlocked){
            delete req.session.user
            res.redirect("/")
        }else{
            next();
        }
        
        }
    else{
            res.redirect("/")
    } */

        next()
    }
exports.isAdmin=(req,res,next)=>{
    /* if(req.session.admin){
        next();
        }
        else{
            res.redirect("/admin")
        } */

        next();
    }
