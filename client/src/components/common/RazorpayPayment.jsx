
import { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  LockKeyhole,
  CheckCircle2,
  Wifi
} from 'lucide-react';

import { useData } from '../../hooks/useData';
import { api, errorMessage } from '../../api/client';
import { Button, Modal } from './UI';
import './demo-payment.css';

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
  const gateway = useData(
    `/transactions/${transaction.id}/payment`
  );

  const demo = useData(
    `/transactions/${transaction.id}/demo-payment`
  );

  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState('ready');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [flipped, setFlipped] = useState(false);

  const configured = Boolean(gateway.data?.configured);

  const paid =
    gateway.data?.payment_status === 'PAID' ||
    gateway.data?.order?.status === 'captured';

  const demoPaid = Boolean(demo.data);

  const complete = paid || demoPaid;

  const allowed = [
    'ACCEPTED',
    'HANDOVER_PENDING'
  ].includes(transaction.status);

  const amountPaise = Number(gateway.data?.amount || 0);

  const amount = formatAmount(amountPaise);

  if (!allowed && !gateway.data?.order && !demo.data) {
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

  async function runDemo() {
    setStage('launching');
    setError('');

    try {
      await new Promise(resolve => setTimeout(resolve, 900));

      setStage('processing');

      if (!demo.data) {
        await api.post(
          `/transactions/${transaction.id}/demo-payment`,
          {}
        );
      }

      await new Promise(resolve => setTimeout(resolve, 1250));

      demo.refresh();
      setStage('success');
    } catch (e) {
      setError(errorMessage(e));
      setStage('ready');
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

      const payment = new window.Razorpay({
        key: order.key,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,

        name: 'CampusShare',

        description: 'Verified campus exchange',

        theme: {
          color: '#4f7cff'
        },

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

        modal: {
          ondismiss: function () {
            setStage('ready');
            setNotice(
              'Razorpay Checkout was closed. Payment has not been confirmed.'
            );

            setOpen(true);
          }
        }
      });

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
            <p>
              {configured
                ? 'Powered by Razorpay Checkout'
                : 'Animated college demonstration'}
            </p>
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

      {complete ? (

        <div className="payment-complete">
          <CheckCircle2 />

          <div>
            <strong>
              {paid
                ? 'Razorpay payment verified'
                : 'Test payment completed'}
            </strong>

            <p>
              {paid
                ? `Payment ${gateway.data?.order?.payment_id || ''}`
                : `Demo receipt ${demo.data?.reference || 'saved'}`}
              {' '}· no live charge
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
          disabled={gateway.loading || demo.loading}
          onClick={show}
        >
          <span>
            <LockKeyhole size={18} />
            Continue to secure payment
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
                {paid
                  ? 'Razorpay payment has been verified successfully by CampusShare.'
                  : 'A demonstration receipt was saved. No real payment was made.'}
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
                      4242&nbsp; 4242&nbsp; 4242&nbsp; 4242
                    </strong>

                    <span className="card-bottom">
                      <span>
                        DEMO STUDENT
                        <small>CARD HOLDER</small>
                      </span>

                      <span>
                        12/30
                        <small>EXPIRES</small>
                      </span>
                    </span>

                  </span>

                  <span className="payment-card-back">
                    <i />
                    <b>123</b>
                    <span>TEST SECURITY CODE</span>
                    <small>NO REAL PAYMENT DETAILS</small>
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

              {error && (
                <p className="error">{error}</p>
              )}

              {notice && (
                <p className="notice">{notice}</p>
              )}

              {!configured && (
                <p className="gateway-note">
                  <ShieldCheck size={16} />
                  Razorpay Test keys are not configured.
                  This runs only the demonstration animation.
                </p>
              )}

              <button
                className="button full payment-launch"
                disabled={stage !== 'ready'}
                onClick={configured ? openRazorpay : runDemo}
              >

                <span>
                  {stage === 'launching'
                    ? 'Preparing secure checkout…'
                    : stage === 'processing'
                    ? 'Waiting for verification…'
                    : configured
                    ? 'Open Razorpay Test Checkout'
                    : 'Run animated test payment'}
                </span>

                <i />

              </button>

              <p className="payment-legal">
                <LockKeyhole size={14} />

                {configured
                  ? 'Enter card or UPI details only inside Razorpay hosted checkout.'
                  : 'Demonstration only · no bank, card network, or payment gateway is contacted.'}
              </p>

            </div>

          )}

        </Modal>

      )}

    </section>
  );
}
