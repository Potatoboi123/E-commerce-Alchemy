const passport=require("passport")
const GoogleStrategy=require("passport-google-oauth20")
const User=require("../models/user")
const Cart=require("../models/cart")
const Wishlist=require("../models/wishlist")

const crypto=require("crypto")

passport.serializeUser((user,done)=>{
    done(null,user.id)
});

passport.deserializeUser((id,done)=>{
    User.findById(id).then((user)=>{
        done(null,user)
    })
})

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/user/google/redirect"
  },
  async function(accessToken, refreshToken, profile, done) {
    
    const userEmail = profile.emails[0].value;
    const name=profile.displayName
    const googleId=profile.id

    try {   
        let user = await User.findOne({ email: userEmail });
        if (!user) {
          const referralCode=crypto.randomBytes(3).toString('hex');
          user=await User.create({
            googleId: googleId,
            name: name,
            email: userEmail,
            referralCode: referralCode 
          });
          const cart=new Cart({
            user:user._id,
            items:[]
        })
        const wishlist=new Wishlist({
            user:user._id,
            items:[]
        })
        await cart.save();
        await wishlist.save();
        }
        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  ));