
import { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  LockKeyhole,
  CheckCircle2,
  Wifi
} from 'lucide-react';

import { useData } from '../../hooks/useData';
import { useApp } from '../../context/AppContext';
import { api, errorMessage } from '../../api/client';
import { buildCheckoutOptions } from '../../payments/razorpayCheckout';
import { Button, Modal } from './UI';

let checkoutScript;

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();

  if (!checkoutScript) {
    checkoutScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');

      script.src = 'https://checkout.razorpay.com/v1/checkout.js';

      script.onload = () => {
        if (window.Razorpay) {
          resolve();
        } else {
          checkoutScript = null;
          reject(new Error('Razorpay failed to initialize.'));
        }
      };

      script.onerror = () => {
        checkoutScript = null;
        script.remove();
        reject(
          new Error('Could not load Razorpay. Check your connection.')
        );
      };

      document.head.appendChild(script);
    });
  }

  return checkoutScript;
}

function formatAmount(paise) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(Number(paise || 0) / 100);
}

export default function RazorpayPayment({ transaction, owner }) {
  const { user } = useApp();
  const gateway = useData(
    `/transactions/${transaction.id}/payment`
  );

  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState('ready');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [flipped, setFlipped] = useState(false);
  const [preferredMethod, setPreferredMethod] = useState('upi');
  const configured = Boolean(gateway.data?.configured);

  const paid =
    gateway.data?.payment_status === 'PAID' ||
    gateway.data?.order?.status === 'captured';

  const allowed = [
    'ACCEPTED',
    'HANDOVER_PENDING'
  ].includes(transaction.status);

  const amountPaise = Number(gateway.data?.amount || 0);

  const amount = formatAmount(amountPaise);

  if (!allowed && !gateway.data?.order) {
    return null;
  }

  function show() {
    setOpen(true);
    setStage('ready');
    setError('');
    setNotice('');
    setFlipped(false);
  }

  function close() {
    if (!['launching', 'processing'].includes(stage)) {
      setOpen(false);
    }
  }

  async function openRazorpay() {
    setStage('launching');
    setError('');
    setNotice('');

    try {
      if (!configured) {
        throw new Error('Razorpay Test Mode is not configured.');
      }

      if (amountPaise <= 0) {
        throw new Error('No payment amount is due for this transaction.');
      }

      await loadCheckout();

      setStage('processing');

      // Ask the backend to create or retrieve the Razorpay order.
      const response = await api.post(
        `/transactions/${transaction.id}/payment/order`,
        {}
      );

      const order = response.data.data;

      if (!order?.order_id || !order?.key) {
        throw new Error('Invalid Razorpay order response.');
      }

      // If the order is already captured, refresh the payment status.
      if (order.status === 'captured') {
        gateway.refresh();
        setStage('success');
        setOpen(true);
        return;
      }

      const payment = new window.Razorpay(buildCheckoutOptions({
        order: {
          ...order,
          transaction_id: transaction.id
        },
        user,
        preferredMethod,
        handler: async function (paymentResponse) {
          try {
            // Verify payment through our backend.
            const verification = await api.post(
              `/transactions/${transaction.id}/payment/verify`,
              paymentResponse
            );

            const result = verification.data.data;

            gateway.refresh();

            if (
              result.payment_status === 'PAID' ||
              result.status === 'captured'
            ) {
              setError('');
              setNotice('');
              setStage('success');
              setOpen(true);
            } else {
              setStage('ready');
              setError('Payment was not confirmed by the server.');
              setOpen(true);
            }
          } catch (e) {
            setStage('ready');

            setError(
              'Payment verification could not be completed. ' +
              'Do not attempt another payment until the Razorpay dashboard ' +
              'has been checked. ' +
              errorMessage(e)
            );

            setOpen(true);
            gateway.refresh();
          }
        },

        onDismiss: function () {
          setStage('ready');
          setNotice(
            'Razorpay Checkout was closed. Payment has not been confirmed.'
          );

          setOpen(true);
        }
      }));

      payment.on('payment.failed', function (response) {
        setStage('ready');

        setError(
          response?.error?.description ||
          'Payment failed. Please check Razorpay before retrying.'
        );

        setOpen(true);
        gateway.refresh();
      });

      // Close CampusShare's modal before launching Razorpay.
      setOpen(false);

      // Give React time to remove the custom modal from the screen.
      setTimeout(() => {
        try {
          payment.open();
        } catch (e) {
          setStage('ready');
          setError(
            'Could not open Razorpay Checkout. ' +
            errorMessage(e)
          );
          setOpen(true);
        }
      }, 400);

    } catch (e) {
      setStage('ready');
      setError(errorMessage(e));
      setOpen(true);
    }
  }

  return (
    <section className="payment-shell">

      <div className="payment-heading">

        <div className="payment-brand">
          <span>
            <CreditCard size={22} />
          </span>

          <div>
            <strong>Secure test payment</strong>
            <p>Powered by Razorpay Checkout</p>
          </div>
        </div>

        <span className="payment-mode">
          <i />
          TEST MODE
        </span>

      </div>

      {gateway.error && (
        <p className="error">{gateway.error}</p>
      )}

      {error && !open && (
        <p className="error">{error}</p>
      )}

      {paid ? (

        <div className="payment-complete">
          <CheckCircle2 />

          <div>
            <strong>Razorpay payment verified</strong>

            <p>
              Payment {gateway.data?.order?.payment_id || 'confirmed'}
              {' '}· Test Mode
            </p>
          </div>

          <Button
            variant="secondary"
            onClick={show}
          >
            View payment
          </Button>
        </div>

      ) : owner ? (

        <p className="payment-owner-note">
          Payment becomes available to the borrower after you accept the request.
        </p>

      ) : (

        <button
          className="payment-cta"
          disabled={gateway.loading || !configured}
          onClick={show}
        >
          <span>
            <LockKeyhole size={18} />
            {configured
              ? 'Continue with Razorpay'
              : 'Razorpay is temporarily unavailable'}
          </span>

          <b>
            {amount}
            <span> → </span>
          </b>
        </button>

      )}

      <div className="payment-trust">
        <span>
          <ShieldCheck size={15} />
          Server-verified
        </span>

        <span>
          <LockKeyhole size={15} />
          Card data never touches CampusShare
        </span>
      </div>

      {open && (

        <Modal
          title={
            stage === 'success'
              ? 'Payment confirmed'
              : 'Secure checkout'
          }
          onClose={close}
        >

          {stage === 'success' ? (

            <div className="gateway-success">

              <div className="success-orbit">
                <CheckCircle2 />
              </div>

              <p className="eyebrow">
                VERIFICATION COMPLETE
              </p>

              <h3>
                You're ready for handover.
              </h3>

              <p>
                Razorpay verified the payment and CampusShare matched it to this exchange.
              </p>

              <Button
                onClick={() => setOpen(false)}
              >
                Return to exchange
              </Button>

            </div>

          ) : (

            <div className={`gateway-stage ${stage}`}>

              <div className="gateway-rail">
                <span className="active">1 Preview</span>
                <i />
                <span className={stage !== 'ready' ? 'active' : ''}>
                  2 Secure
                </span>
                <i />
                <span>3 Verified</span>
              </div>

              <div className="gateway-portal">
                <div />
                <span>
                  RAZORPAY
                  <br />
                  <small>SECURE WINDOW</small>
                </span>
              </div>

              <div className="payment-card-scene">

                <button
                  type="button"
                  className={`payment-card ${flipped ? 'flipped' : ''}`}
                  onClick={() => setFlipped(!flipped)}
                  aria-label="Flip payment card preview"
                >

                  <span className="payment-card-front">

                    <span className="card-top">
                      <b>CampusShare</b>
                      <Wifi size={21} />
                    </span>

                    <CreditCard size={30} />

                    <strong>
                      RAZORPAY&nbsp; TEST&nbsp; CHECKOUT
                    </strong>

                    <span className="card-bottom">
                      <span>
                        CARD OR UPI
                        <small>PAYMENT METHOD</small>
                      </span>

                      <span>
                        INR
                        <small>CURRENCY</small>
                      </span>
                    </span>

                  </span>

                  <span className="payment-card-back">
                    <i />
                    <b>SECURE</b>
                    <span>HOSTED BY RAZORPAY</span>
                    <small>PAYMENT DETAILS ARE ENTERED IN THE RAZORPAY WINDOW</small>
                  </span>

                </button>

                <span className="flip-hint">
                  Tap the card to flip
                </span>

              </div>

              <div className="checkout-summary">

                <span>
                  CampusShare exchange payment

                  <small>
                    Borrowing fee + refundable security deposit
                  </small>
                </span>

                <strong>{amount}</strong>

              </div>

              <div className="payment-method-choice" role="group" aria-label="Preferred payment method">
                  <button
                    type="button"
                    className={preferredMethod === 'upi' ? 'active' : ''}
                    onClick={() => setPreferredMethod('upi')}
                    disabled={stage !== 'ready'}
                  >
                    <span>UPI</span>
                    <small>App or QR</small>
                  </button>
                  <button
                    type="button"
                    className={preferredMethod === 'card' ? 'active' : ''}
                    onClick={() => setPreferredMethod('card')}
                    disabled={stage !== 'ready'}
                  >
                    <span>Card</span>
                    <small>Credit or debit</small>
                  </button>
              </div>

              {error && (
                <p className="error">{error}</p>
              )}

              {notice && (
                <p className="notice">{notice}</p>
              )}

              {!configured && (
                <p className="gateway-note">
                  <ShieldCheck size={16} />
                  Razorpay Test Mode is not available. Ask the project administrator to check the server configuration.
                </p>
              )}

              <button
                className="button full payment-launch"
                disabled={stage !== 'ready' || !configured}
                onClick={openRazorpay}
              >

                <span>
                  {stage === 'launching'
                    ? 'Preparing secure checkout…'
                    : stage === 'processing'
                    ? 'Waiting for verification…'
                    : 'Open Razorpay Test Checkout'}
                </span>

                <i />

              </button>

              <p className="payment-legal">
                <LockKeyhole size={14} />

                {preferredMethod === 'upi'
                  ? 'UPI opens securely in Razorpay using an available app or QR flow.'
                  : 'Enter card details only inside the Razorpay-hosted checkout.'}
              </p>

            </div>

          )}

        </Modal>

      )}

    </section>
  );
}
