import RazorpayPayment from '../components/common/RazorpayPayment';
import {useParams,Link} from 'react-router-dom';
import {useState} from 'react';
import {Check,MessageCircle,ShieldCheck} from 'lucide-react';
import {useData} from '../hooks/useData';
import {useApp} from '../context/AppContext';
import {api,errorMessage} from '../api/client';
import {DataState,PageHead,Badge,Button,Field,Modal,formatDate} from '../components/common/UI';
import Uploads from '../components/common/Uploads';

export default function Transaction(){
  const {id}=useParams();
  const data=useData('/transactions/'+id);
  const {user,act}=useApp();
  const [modal,setModal]=useState('');
  const [evidence,setEvidence]=useState([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const transaction=data.data;
  const owner=transaction?.owner_id===user?.id;

  function open(type){setModal(type);setEvidence([]);setError('')}

  async function submit(event){
    event.preventDefault();setBusy(true);setError('');
    const fields=Object.fromEntries(new FormData(event.currentTarget));
    const body={...fields,evidence:evidence.map(item=>item.id)};
    try{
      const route=modal==='review'?'/reviews':modal==='dispute'?'/disputes':`/transactions/${id}/${modal}`;
      if(modal==='review'||modal==='dispute')body.transactionId=Number(id);
      if(modal==='extension'&&body.endTime)body.endTime=new Date(body.endTime).toISOString();
      await act(()=>api.post(route,body),'Exchange updated');
      setModal('');data.refresh();
    }catch(caught){setError(errorMessage(caught))}
    finally{setBusy(false)}
  }

  async function extensionDecision(accept){
    try{await act(()=>api.post(`/transactions/${id}/extension`,{accept}),'Extension decision saved');data.refresh()}
    catch{/* The shared toast already explains the failure. */}
  }

  return <div className="container">
    <Link className="back" to="/borrowings">← Your exchanges</Link>
    <DataState {...data}>{transaction&&<>
      <PageHead eyebrow={`EXCHANGE #${transaction.id}`} title={transaction.item.name} description={transaction.participants.map(person=>person.name).join(' ↔ ')}>
        <Badge tone={transaction.status==='OVERDUE'?'red':'green'}>{transaction.status}</Badge>
      </PageHead>
      <div className="workspace-grid">
        <section className="panel">
          <div className="section-title"><h2>The exchange</h2><ShieldCheck size={22}/></div>
          <div className="facts">
            <div><small>EXPECTED RETURN</small><strong>{formatDate(transaction.expected_return)}</strong></div>
            <div><small>PICKUP</small><strong>{transaction.item.location}</strong></div>
            <div><small>HANDED OVER</small><strong>{formatDate(transaction.handover_time)}</strong></div>
            <div><small>ACTUAL RETURN</small><strong>{formatDate(transaction.actual_return)}</strong></div>
          </div>
          <p>{transaction.item.pickup_instructions}</p>
          <div className="inline wrap">
            {['ACCEPTED','HANDOVER_PENDING'].includes(transaction.status)&&!(owner?transaction.owner_handover:transaction.borrower_handover)&&<Button onClick={()=>open('handover')}>{owner?'Confirm item given':'Confirm item received'}</Button>}
            {!owner&&['ACTIVE','OVERDUE'].includes(transaction.status)&&<Button onClick={()=>open('return')}>Start return</Button>}
            {owner&&transaction.status==='RETURN_PENDING'&&<Button onClick={()=>open('return')}>Confirm return & condition</Button>}
            {!owner&&['ACTIVE','OVERDUE'].includes(transaction.status)&&<Button variant="secondary" onClick={()=>open('extension')}>Request extension</Button>}
            <Link className="button secondary" to={`/messages?conversation=${transaction.conversationId}`}><MessageCircle size={16}/>Message</Link>
            {['ACTIVE','OVERDUE','RETURN_PENDING'].includes(transaction.status)&&<Button variant="danger" onClick={()=>open('dispute')}>Report a problem</Button>}
            {transaction.status==='COMPLETED'&&!transaction.reviews.some(review=>review.reviewer_id===user?.id)&&<Button onClick={()=>open('review')}>Leave a review</Button>}
          </div>
          {owner&&transaction.extension_status==='REQUESTED'&&<div className="notice"><p>Extension requested until {formatDate(transaction.extension_time)}</p><Button onClick={()=>extensionDecision(true)}>Accept extension</Button><Button variant="secondary" onClick={()=>extensionDecision(false)}>Decline</Button></div>}
          {transaction.return_condition&&<div className="notice"><h3>Return condition: {transaction.return_condition}</h3><p>{transaction.return_notes}</p></div>}
          <RazorpayPayment transaction={transaction} owner={owner}/>
          <h3>Evidence</h3>
          <div className="evidence-gallery">{[...transaction.handoverEvidence,...transaction.returnEvidence].map((item,index)=><a href={item.url} key={index} target="_blank" rel="noreferrer"><img src={item.url} alt="Exchange condition evidence"/></a>)}</div>
          {transaction.reviews.map((review,index)=><blockquote key={index}>★ {review.rating} — {review.comment}</blockquote>)}
        </section>
        <section className="panel">
          <h2>Every step, together.</h2>
          <ol className="timeline">{transaction.events.map(item=><li key={item.id}><i><Check size={13}/></i><div><strong>{item.state.replaceAll('_',' ')}</strong><small>{formatDate(item.created_at)} · {item.actor_name||'System'}</small><p>{item.note}</p></div></li>)}</ol>
        </section>
      </div>
    </>}</DataState>

    {modal&&<Modal title={{handover:'Confirm the handover',return:'Check and return',extension:'A little more time?',review:'How was your exchange?',dispute:'Tell us what happened'}[modal]} onClose={()=>setModal('')}>
      <form onSubmit={submit}>
        {modal==='handover'&&<p>Only confirm after {owner?'giving the item to the borrower':'receiving and checking the item'}. The exchange becomes active after both sides confirm.</p>}
        {modal==='return'&&<><Field label="Return condition"><select name="condition"><option>EXCELLENT</option><option>GOOD</option><option>USED</option><option>DAMAGED</option></select></Field><Field label="Condition and accessory notes"><textarea name="notes" rows="3"/></Field></>}
        {['return','handover','dispute'].includes(modal)&&<Uploads value={evidence} onChange={setEvidence}/>} 
        {modal==='extension'&&<Field label="New expected return" name="endTime" type="datetime-local" required/>}
        {modal==='review'&&<><Field label="Rating"><select name="rating">{[5,4,3,2,1].map(number=><option key={number} value={number}>{number} stars</option>)}</select></Field><Field label="Your review"><textarea name="comment" required rows="4" maxLength="1500"/></Field></>}
        {modal==='dispute'&&<><Field label="Reason"><select name="reason">{['Damaged Item','Missing Item','Missing Accessory','Incorrect Condition','Late Return','Other'].map(reason=><option key={reason}>{reason}</option>)}</select></Field><Field label="What happened?"><textarea name="description" minLength="20" rows="4" required/></Field></>}
        {error&&<p className="error">{error}</p>}
        <Button busy={busy} type="submit">Confirm {modal}</Button>
      </form>
    </Modal>}
  </div>;
}
