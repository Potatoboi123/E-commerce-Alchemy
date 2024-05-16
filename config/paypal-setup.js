const paypal = require('@paypal/checkout-server-sdk');

// Configure PayPal environment
let environment = new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
let client = new paypal.core.PayPalHttpClient(environment);

module.exports = { client };
