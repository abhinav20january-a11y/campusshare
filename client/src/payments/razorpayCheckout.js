const supportedMethods = ['upi', 'card'];

export function normalizePaymentMethod(method) {
  return supportedMethods.includes(method) ? method : 'upi';
}

export function validateDemoPayment(method, details = {}) {
  const selected = normalizePaymentMethod(method);

  if (selected === 'upi') {
    const upiId = String(details.upiId || '').trim().toLowerCase();
    if (!/^[a-z0-9._-]{2,}@[a-z0-9._-]{2,}$/.test(upiId)) {
      return { valid: false, message: 'Enter a valid demo UPI ID.' };
    }
    if (upiId === 'failure@campusshare') {
      return { valid: false, simulatedFailure: true, message: 'Demo UPI payment was declined.' };
    }
    return { valid: true, summary: upiId };
  }

  const cardNumber = String(details.cardNumber || '').replace(/\D/g, '');
  const expiry = String(details.expiry || '').trim();
  const cvv = String(details.cvv || '').replace(/\D/g, '');

  if (!/^\d{16}$/.test(cardNumber)) {
    return { valid: false, message: 'Enter a 16-digit demo card number.' };
  }
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
    return { valid: false, message: 'Enter expiry in MM/YY format.' };
  }
  if (!/^\d{3}$/.test(cvv)) {
    return { valid: false, message: 'Enter a 3-digit demo CVV.' };
  }
  if (cardNumber === '4000000000000002') {
    return { valid: false, simulatedFailure: true, message: 'Demo card payment was declined.' };
  }

  return { valid: true, summary: 'Card ending ' + cardNumber.slice(-4) };
}

export function buildCheckoutOptions({
  order,
  user,
  preferredMethod,
  handler,
  onDismiss
}) {
  const first = normalizePaymentMethod(preferredMethod);
  const second = first === 'upi' ? 'card' : 'upi';
  const prefill = {
    name: user?.name || '',
    email: user?.email || ''
  };

  if (user?.phone) prefill.contact = user.phone;

  // Razorpay can preselect a method only when both email and contact are
  // supplied. The display block still puts the chosen method first otherwise.
  const canPreselect = Boolean(prefill.email && prefill.contact);

  return {
    key: order.key,
    order_id: order.order_id,
    amount: Number(order.amount),
    currency: order.currency,
    name: 'CampusShare',
    description: 'Campus borrowing fee and refundable deposit',
    prefill,
    ...(canPreselect ? { method: first } : {}),
    notes: {
      transaction_id: String(order.transaction_id || ''),
      payment_mode: 'college_test'
    },
    retry: { enabled: true },
    timeout: 600,
    config: {
      display: {
        blocks: {
          campusshare: {
            name: 'Card or UPI',
            instruments: [
              { method: first },
              { method: second }
            ]
          }
        },
        sequence: ['block.campusshare'],
        preferences: { show_default_blocks: false }
      }
    },
    theme: { color: '#1769e0' },
    handler,
    modal: {
      confirm_close: true,
      escape: false,
      ondismiss: onDismiss
    }
  };
}
