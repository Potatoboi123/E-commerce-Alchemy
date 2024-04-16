const login_switch = document.querySelector('.logreg-box .login');
const register_switch  = document.querySelector('.register');
const forgot_email_switch  = document.querySelector('.forgot_email');
const forgot_otp_switch  = document.querySelector('.forgot_otp');
const forgot_password_switch  = document.querySelector('.forgot_password');
const loginLink = document.querySelector('.login-link');
const registerLink = document.querySelector('.register-link');
const otp_switch=document.querySelector('.otp');
const forgotLink=document.querySelector(".forgot-link")

/* Switch SignIn To SignUp */
registerLink.addEventListener("click",()=>{
  register_switch .classList.add("active")
  login_switch.classList.remove("active")
  registerform.reset();
    
})

/* Switch SignUp To SignIn */

loginLink.addEventListener("click",()=>{
  login_switch.classList.add("active")
  register_switch .classList.remove("active")

})

/* Switch from login page to forgot password(Enter email) */

forgotLink.addEventListener("click",()=>{
  login_switch.classList.remove("active");
  forgot_email_switch.classList.add("active")
})

otp_switch.addEventListener("otp",()=>{
  otp_switch.classList.add("active")
  register_switch .classList.remove("active")
})

/* Switch from Forgot Password(Enter Email) to Verification Code Page */
forgot_email_switch.addEventListener("forgotemail",()=>{
  forgot_email_switch.classList.remove("active");
  forgot_otp_switch.classList.add("active");
})

forgot_otp_switch.addEventListener("forgototp",()=>{
  forgot_otp_switch.classList.remove("active");
  forgot_password_switch.classList.add("active");
})

/* Switch from new password to login page */

forgot_password_switch.addEventListener("forgotpassword",()=>{
  forgot_password_switch.classList.remove("active");
  login_switch.classList.add("active");
})

const inputFields = document.querySelectorAll(".input-box input");
inputFields.forEach(function(inputField) {
    const label = inputField.nextElementSibling; // Get the next element which is the label
  
    inputField.addEventListener("input", function() {
      if (this.value !== "") {
        label.classList.add("label-active");
      } else {
        label.classList.remove("label-active");
      }
    });
  });