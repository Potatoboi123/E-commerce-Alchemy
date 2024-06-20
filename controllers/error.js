exports.get404=(req,res,next)=>{
    let userName;
    if(req.session.user){
        userName=req.session.user
    }else{
        userName=null
    }
    res.render("404",{userName})
}

exports.get500=(req,res,next)=>{
    let userName;
    if(req.session.user){
        userName=req.session.user
    }else{
        userName=null
    }
    res.render("500",{userName})
}