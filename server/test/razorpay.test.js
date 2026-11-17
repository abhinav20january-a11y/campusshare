import { createHmac } from 'node:crypto';
import {
  configuration,
  confirmedPayment,
  validSignature
} from '../src/services/razorpay.js';
import {
  buildCheckoutOptions,
  normalizePaymentMethod,
  validateDemoPayment
} from '../../client/src/payments/razorpayCheckout.js';

const originalKey = process.env.RAZORPAY_KEY_ID;
const originalSecret = process.env.RAZORPAY_KEY_SECRET;
const originalFetch = global.fetch;

beforeEach(() => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_campusshare';
  process.env.RAZORPAY_KEY_SECRET = 'test_secret';
});

afterEach(() => {
  global.fetch = originalFetch;
});

afterAll(() => {
  if (originalKey === undefined) delete process.env.RAZORPAY_KEY_ID;
  else process.env.RAZORPAY_KEY_ID = originalKey;
  if (originalSecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
  else process.env.RAZORPAY_KEY_SECRET = originalSecret;
});

test('accepts a correct Razorpay signature and rejects altered values', () => {
  const order = 'order_abc123';
  const payment = 'pay_abc123';
  const signature = createHmac('sha256', 'test_secret')
    .update(order + '|' + payment)
    .digest('hex');

  expect(validSignature(order, payment, signature, 'test_secret')).toBe(true);
  expect(validSignature('order_wrong', payment, signature, 'test_secret')).toBe(false);
  expect(validSignature(order, 'pay_wrong', signature, 'test_secret')).toBe(false);
  expect(validSignature(order, payment, 'bad', 'test_secret')).toBe(false);
});

test('only enables configured Razorpay test-mode keys', () => {
  expect(configuration()).toMatchObject({ configured: true, mode: 'test', currency: 'INR' });
  process.env.RAZORPAY_KEY_ID = 'rzp_live_not_allowed';
  expect(configuration().configured).toBe(false);
});

test('captures an authorized card or UPI payment before confirming it', async () => {
  const authorized = {
    id: 'pay_abc123',
    order_id: 'order_abc123',
    amount: 12500,
    currency: 'INR',
    status: 'authorized'
  };
  const captured = { ...authorized, status: 'captured' };

  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => authorized })
    .mockResolvedValueOnce({ ok: true, json: async () => captured });

  await expect(confirmedPayment('pay_abc123', {
    orderId: 'order_abc123',
    amount: 12500,
    currency: 'INR'
  })).resolves.toEqual(captured);

  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(global.fetch.mock.calls[1][0]).toContain('/payments/pay_abc123/capture');
  expect(global.fetch.mock.calls[1][1]).toMatchObject({ method: 'POST' });
});

test('accepts a payment that Razorpay already marked as captured', async () => {
  const captured = {
    id: 'pay_captured123',
    order_id: 'order_abc123',
    amount: 12500,
    currency: 'INR',
    status: 'captured'
  };
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => captured
  });

  await expect(confirmedPayment('pay_captured123', {
    orderId: 'order_abc123',
    amount: 12500,
    currency: 'INR'
  })).resolves.toEqual(captured);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('rejects a payment whose order, amount, or currency does not match', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      id: 'pay_wrong123',
      order_id: 'order_other',
      amount: 999,
      currency: 'USD',
      status: 'captured'
    })
  });

  await expect(confirmedPayment('pay_wrong123', {
    orderId: 'order_abc123',
    amount: 12500,
    currency: 'INR'
  })).rejects.toMatchObject({ status: 400 });
});

test('rejects uncaptured and invalid payment references', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      id: 'pay_failed123',
      order_id: 'order_abc123',
      amount: 12500,
      currency: 'INR',
      status: 'failed'
    })
  });

  await expect(confirmedPayment('pay_failed123', {
    orderId: 'order_abc123',
    amount: 12500,
    currency: 'INR'
  })).rejects.toMatchObject({ status: 409 });
  await expect(confirmedPayment('not-a-payment', {}))
    .rejects.toMatchObject({ status: 400 });
});

test('checkout exposes both UPI and card and puts the selected method first', () => {
  const options = buildCheckoutOptions({
    order: {
      key: 'rzp_test_campusshare',
      order_id: 'order_abc123',
      transaction_id: 7,
      amount: 12500,
      currency: 'INR'
    },
    user: { name: 'Student', email: 'student@example.com' },
    preferredMethod: 'card',
    handler: jest.fn(),
    onDismiss: jest.fn()
  });

  expect(options.amount).toBe(12500);
  expect(options.retry.enabled).toBe(true);
  expect(options.config.display.blocks.campusshare.instruments).toEqual([
    { method: 'card' },
    { method: 'upi' }
  ]);
  expect(options.config.display.preferences.show_default_blocks).toBe(false);
  expect(normalizePaymentMethod('unknown')).toBe('upi');
});

test('local sandbox validates successful and declined Card and UPI scenarios', () => {
  expect(validateDemoPayment('upi', {
    upiId: 'success@campusshare'
  })).toMatchObject({ valid: true });
  expect(validateDemoPayment('upi', {
    upiId: 'failure@campusshare'
  })).toMatchObject({ valid: false, simulatedFailure: true });
  expect(validateDemoPayment('card', {
    cardNumber: '4242 4242 4242 4242',
    expiry: '12/30',
    cvv: '123'
  })).toMatchObject({ valid: true, summary: 'Card ending 4242' });
  expect(validateDemoPayment('card', {
    cardNumber: '4000 0000 0000 0002',
    expiry: '12/30',
    cvv: '123'
  })).toMatchObject({ valid: false, simulatedFailure: true });
});
