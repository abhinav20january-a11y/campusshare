
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ensure } from '../utils/core.js';

export function configuration() {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;

  return {
    configured: Boolean(key?.startsWith('rzp_test_') && secret),
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
