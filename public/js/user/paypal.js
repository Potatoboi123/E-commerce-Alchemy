const action=document.querySelector("[name='action']").value
const address=document.querySelector("[name='address']").value
const coupon=document.querySelector("[name='coupon']").value
const orderId=document.querySelector("[name='orderId']").value
paypal.Buttons({
/*     style: {
      shape: 'rect',
      //color:'blue', change the default color of the buttons
      layout: 'vertical', //default value. Can be changed to horizontal
    }, */
    createOrder: function(data, actions) {
      return fetch(`/user/create-order?action=${action}`, {
        method: 'post',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ coupon: coupon,orderId:orderId }) // Replace with actual cart ID
      }).then(res => res.json())
        .then(orderData => {
          return orderData.id;
        });

    },
    onApprove: function(data, actions) {
      return fetch('/user/capture-order', {
        method: 'post',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ orderId: data.orderID })
      }).then(res => res.json())
        .then(orderData => {
          if (orderData.status === 'success') {
            document.getElementById('paypal-button-container').style.display = 'none'; 

            fetch("/user/paypalPayment",{
              method:"POST",
              headers:{
                "Content-Type":"application/json"
              },
              body:JSON.stringify({
                address,
                action,
                paymentMethod:"paypal",
                couponCode:coupon,
                orderId:orderId
            })
            })
            .then((response)=>{
                return response.json();
              
            })
            .then((data)=>{
              if(data.error){
                return Swal.fire(data.error);
              }
              Swal.fire({
                  title: 'Order Placed',
                  text: 'Your Order has been placed.',
                  icon: 'success',
                  showCancelButton: true,
                  cancelButtonText: 'Continue Browsing',
                  showConfirmButton: true,
                  confirmButtonText: 'Go To Your Order',
                  allowOutsideClick: false
                  }).then((result) => {
                      if (result.isConfirmed) {
                          window.location.href = '/user/orderDetails/'+data.id;
                      }else{
                        window.location.href = '/product-list/list';
                      }
                  });
            })
            .catch((err)=>{
              console.log("Something Happened")
            })

          } else {

            fetch("/user/paypalFailed",{
              method:"POST",
              headers:{
                "Content-Type":"application/json"
              },
              body:JSON.stringify({
                address,
                action,
                paymentMethod:"paypal",
                couponCode:coupon,
                orderId:orderId
            })
            })
            .then((response)=>{
              if(response.ok){
                return response.json();
              }else{
                throw new Error("Something Happened")
              }
            })
            .then((data)=>window.location.href=`/user/orderDetails/${data.id}`)
            .catch((err)=>console.log(err.message))
            // Redirect to a failure page or update the UI
          }
        });
    },

    onError: function(err) {
      console.error(err);
      fetch("/user/paypalFailed",{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          address,
          action,
          paymentMethod:"paypal",
          couponCode:coupon
      })
      })
      .then((response)=>{
        if(response.ok){
          return response.json();
        }else{
          throw new Error("Something Happened")
        }
      })
      .then((data)=>window.location.href=`/user/orderDetails/${data.id}`)
      .catch((err)=>console.log(err.message))
    },

    onCancel: function(data) {
      alert('Payment was cancelled.');
    }

  })
  .render("#paypal-button-container");
