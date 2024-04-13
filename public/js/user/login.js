const login_switch = document.querySelector('.logreg-box .login');
const register_switch  = document.querySelector('.logreg-box .register');
const loginLink = document.querySelector('.login-link');
const registerLink = document.querySelector('.register-link');
const otp_switch=document.querySelector('.otp');


registerLink.addEventListener("click",()=>{
  register_switch .classList.add("active")
  login_switch.classList.remove("active")
  registerform.reset();
    
})

loginLink.addEventListener("click",()=>{
  login_switch.classList.add("active")
  register_switch .classList.remove("active")

})

otp_switch.addEventListener("otp",()=>{
  console.log("fdfdf")
  otp_switch.classList.add("active")
  register_switch .classList.remove("active")
})

const inputFields = document.querySelectorAll(".input-box input");
inputFields.forEach(function(inputField) {
    const label = inputField.nextElementSibling; // Get the next element which is the label
  
    inputField.addEventListener("input", function() {
      if (this.value.trim() !== "") {
        label.classList.add("label-active");
      } else {
        label.classList.remove("label-active");
      }
    });
  });