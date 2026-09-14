import {useState} from 'react';
import {CreditCard,ShieldCheck,LockKeyhole,CheckCircle2,Wifi} from 'lucide-react';
import {useData} from '../../hooks/useData';
import {api,errorMessage} from '../../api/client';
import {Button,Modal} from './UI';
import './demo-payment.css';

let checkoutScript;
function loadCheckout(){
  if(window.Razorpay)return Promise.resolve();
  if(!checkoutScript)checkoutScript=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://checkout.razorpay.com/v1/checkout.js';
    script.onload=()=>window.Razorpay?resolve():reject(Error('Razorpay failed to load'));
    script.onerror=()=>{checkoutScript=null;script.remove();reject(Error('Could not load Razorpay. Check your connection.'))};
    document.head.append(script);
  });
  return checkoutScript;
}

export default function RazorpayPayment({transaction,owner}){
  const gateway=useData(`/transactions/${transaction.id}/payment`);
  const demo=useData(`/transactions/${transaction.id}/demo-payment`);
  const [open,setOpen]=useState(false),[stage,setStage]=useState('ready'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[flipped,setFlipped]=useState(false);
  const configured=Boolean(gateway.data?.configured),paid=gateway.data?.order?.status==='captured',demoPaid=Boolean(demo.data);
  const allowed=['ACCEPTED','HANDOVER_PENDING'].includes(transaction.status);
  if(!allowed&&!gateway.data?.order&&!demo.data)return null;

  function show(){setOpen(true);setStage('ready');setError('');setNotice('');setFlipped(false)}
  function close(){if(!['launching','processing'].includes(stage))setOpen(false)}

  async function runDemo(){
    setStage('launching');setError('');
    await new Promise(r=>setTimeout(r,900));
    setStage('processing');
    try{
      if(!demo.data)await api.post(`/transactions/${transaction.id}/demo-payment`,{});
      await new Promise(r=>setTimeout(r,1250));
      demo.refresh();setStage('success');
    }catch(e){setError(errorMessage(e));setStage('ready')}
  }

  async function openRazorpay(){
    setStage('launching');setError('');setNotice('');
    try{
      await Promise.all([loadCheckout(),new Promise(r=>setTimeout(r,900))]);
      setStage('processing');
      const {data:{data:order}}=await api.post(`/transactions/${transaction.id}/payment/order`);
      if(order.status==='captured'){gateway.refresh();setStage('success');return}
      const payment=new window.Razorpay({
        key:order.key,order_id:order.order_id,amount:order.amount,currency:order.currency,
        name:'CampusShare',description:'Verified campus exchange · Test Mode',
        theme:{color:'#4f7cff'},
        handler:async response=>{
          try{
            const {data:{data:result}}=await api.post(`/transactions/${transaction.id}/payment/verify`,response);
            gateway.refresh();
            if(result.status==='captured')setStage('success');
            else{setStage('ready');setNotice('Payment is authorized but not captured yet. Check Razorpay before retrying.')}
          }catch(e){setStage('ready');setError('Verification did not finish. Do not pay again until the Razorpay dashboard is checked. '+errorMessage(e))}
        },
        modal:{ondismiss:()=>{setStage('ready');setNotice('Checkout closed. No successful payment was recorded.')}}
      });
      payment.on('payment.failed',response=>{setStage('ready');setError(response?.error?.description||'Payment failed. No successful payment was recorded.')});
      payment.open();
    }catch(e){setStage('ready');setError(errorMessage(e))}
  }

  const complete=paid||demoPaid;
  return <section className="payment-shell">
    <div className="payment-heading">
      <div className="payment-brand"><span><CreditCard size={22}/></span><div><strong>Secure test payment</strong><p>{configured?'Powered by Razorpay Checkout':'Animated college demonstration'}</p></div></div>
      <span className="payment-mode"><i/> TEST MODE</span>
    </div>
    {gateway.error&&<p className="error">{gateway.error}</p>}{error&&<p className="error">{error}</p>}{notice&&<p className="notice">{notice}</p>}
    {complete?<div className="payment-complete"><CheckCircle2/><div><strong>{paid?'Razorpay payment verified':'Test payment completed'}</strong><p>{paid?`Payment ${gateway.data.order.payment_id}`:`Demo receipt ${demo.data?.reference||'saved'}`} · no live charge</p></div><Button variant="secondary" onClick={show}>Replay animation</Button></div>
      :owner?<p className="payment-owner-note">Payment becomes available to the borrower after you accept the request.</p>
      :<button className="payment-cta" disabled={gateway.loading||demo.loading} onClick={show}><span><LockKeyhole size={18}/>Continue to secure payment</span><b>₹100 <span>→</span></b></button>}
    <div className="payment-trust"><span><ShieldCheck size={15}/>Server-verified</span><span><LockKeyhole size={15}/>Card data never touches CampusShare</span></div>

    {open&&<Modal title={stage==='success'?'Payment confirmed':'Secure checkout'} onClose={close}>
      {stage==='success'?<div className="gateway-success"><div className="success-orbit"><CheckCircle2/></div><p className="eyebrow">VERIFICATION COMPLETE</p><h3>You’re ready for handover.</h3><p>{configured?'Razorpay returned a verified payment signature.':'A safe demonstration receipt was saved. No gateway or bank was contacted.'}</p><Button onClick={()=>setOpen(false)}>Return to exchange</Button></div>
      :<div className={`gateway-stage ${stage}`}>
        <div className="gateway-rail"><span className="active">1 Preview</span><i/><span className={stage!=='ready'?'active':''}>2 Secure</span><i/><span>3 Verified</span></div>
        <div className="gateway-portal"><div/><span>RAZORPAY<br/><small>SECURE WINDOW</small></span></div>
        <div className="payment-card-scene">
          <button type="button" className={`payment-card ${flipped?'flipped':''}`} onClick={()=>setFlipped(!flipped)} aria-label="Flip payment card preview">
            <span className="payment-card-front">
              <span className="card-top"><b>CampusShare</b><Wifi size={21}/></span>
              <CreditCard size={30}/><strong>4242&nbsp; 4242&nbsp; 4242&nbsp; 4242</strong>
              <span className="card-bottom"><span>DEMO STUDENT<small>CARD HOLDER</small></span><span>12/30<small>EXPIRES</small></span></span>
            </span>
            <span className="payment-card-back"><i/><b>123</b><span>TEST SECURITY CODE</span><small>NO REAL PAYMENT DETAILS</small></span>
          </button>
          <span className="flip-hint">Tap the card to flip</span>
        </div>
        <div className="checkout-summary"><span>CampusShare exchange deposit<small>Test Mode · actual charge depends on your Razorpay test setup</small></span><strong>₹100</strong></div>
        {error&&<p className="error">{error}</p>}{notice&&<p className="notice">{notice}</p>}
        {!configured&&<p className="gateway-note"><ShieldCheck size={16}/>Razorpay Test keys are not configured, so this safely runs the complete animation in demonstration mode.</p>}
        <button className="button full payment-launch" disabled={stage!=='ready'} onClick={configured?openRazorpay:runDemo}>
          <span>{stage==='launching'?'Sending card to secure checkout…':stage==='processing'?'Waiting for verification…':configured?'Open Razorpay Test Checkout':'Run animated test payment'}</span><i/>
        </button>
        <p className="payment-legal"><LockKeyhole size={14}/>{configured?'Enter card or UPI details only inside Razorpay’s hosted checkout.':'Demonstration only · no bank, card network, or payment gateway is contacted.'}</p>
      </div>}
    </Modal>}
  </section>;
}
