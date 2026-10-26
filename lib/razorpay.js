// src/lib/razorpay.js

// Dynamically loads the Razorpay checkout script once
export function loadRazorpayScript() {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }
  
  // Creates a Razorpay order on the server, returns order details
  export async function createRazorpayOrder(orderId) {
  // authFetch sends the token; server returns keyId from env (not NEXT_PUBLIC_)
  const { authFetch } = await import('@/lib/authFetch')
  const res = await authFetch('/api/razorpay/create-order', {
    method: 'POST',
    body:   JSON.stringify({ orderId }),
  })
  if (!res.ok) throw new Error('Failed to create Razorpay order')
  return res.json()
  // response includes keyId — use it in openRazorpayCheckout
}
  
  // Verifies payment signature on the server
  export async function verifyRazorpayPayment(paymentData) {
  const { authFetch } = await import('@/lib/authFetch')
  const res = await authFetch('/api/razorpay/verify', {
    method: 'POST',
    body:   JSON.stringify(paymentData),
  })
  return res.json()
}
  
  // Opens the Razorpay checkout modal — returns a Promise that resolves
  // with payment details on success, rejects on dismiss/failure
  export function openRazorpayCheckout({ orderId, amount, currency, keyId, customerInfo }) {
    return new Promise((resolve, reject) => {
      const options = {
        key: keyId,
        amount,
        currency,
        name: 'ShopNext',
        description: 'Order payment',
        order_id: orderId,
        prefill: {
          name: customerInfo.name,
          email: customerInfo.email,
          contact: customerInfo.phone,
        },
        theme: {
          color: '#4f46e5', // indigo-600 to match brand
        },
        handler: function (response) {
          resolve({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          })
        },
        modal: {
          ondismiss: function () {
            reject(new Error('Payment cancelled by user'))
          },
        },
      }
  
      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        reject(new Error(response.error.description || 'Payment failed'))
      })
      rzp.open()
    })
  }