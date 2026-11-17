
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ensure } from '../utils/core.js';

export function configuration() {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const testKey = /^rzp_test_[a-zA-Z0-9]{8,}$/.test(key || '');
  const usableSecret = typeof secret === 'string' &&
    secret.length >= 8 &&
    !/replace|your[_-]?test/i.test(secret);

  return {
    configured: Boolean(testKey && usableSecret),
    mode: 'test',
    currency: 'INR'
  };
}

export function validSignature(order, payment, signature, secret) {
  if (
    typeof signature !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(signature) ||
    !secret
  ) {
    return false;
  }

  const expected = createHmac('sha256', secret)
    .update(order + '|' + payment)
    .digest();

  const received = Buffer.from(signature, 'hex');

  return timingSafeEqual(expected, received);
}

export async function razorpay(path, method = 'GET', body) {
  ensure(
    configuration().configured,
    503,
    'Configure Razorpay Test Mode keys on the server to enable checkout'
  );

  const response = await fetch(
    'https://api.razorpay.com/v1' + path,
    {
      method,
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(
            process.env.RAZORPAY_KEY_ID +
            ':' +
            process.env.RAZORPAY_KEY_SECRET
          ).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000)
    }
  );

  const data = await response.json();

  ensure(
    response.ok,
    502,
    data?.error?.description ||
      'Razorpay could not complete this request. Check your payment dashboard before retrying.'
  );

  return data;
}

// Fetch a payment from Razorpay, validate it against the order stored by
// CampusShare and capture it when the merchant account uses manual capture.
// Card and UPI payments can therefore complete under either capture setting.
export async function confirmedPayment(paymentId, expected) {
  ensure(
    typeof paymentId === 'string' && /^pay_[a-zA-Z0-9]+$/.test(paymentId),
    400,
    'Invalid payment ID'
  );

  let payment = await razorpay('/payments/' + paymentId);

  ensure(
    payment.order_id === expected.orderId &&
      Number(payment.amount) === Number(expected.amount) &&
      payment.currency === expected.currency,
    400,
    'Payment details do not match'
  );

  if (payment.status === 'authorized') {
    payment = await razorpay(
      '/payments/' + paymentId + '/capture',
      'POST',
      {
        amount: Number(expected.amount),
        currency: expected.currency
      }
    );
  }

  ensure(
    payment.status === 'captured',
    409,
    'Payment is not captured. Check the Razorpay dashboard before retrying.'
  );

  return payment;
}
