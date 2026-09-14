const items = [
  {id:1,name:'Casio FX-991ES Plus',image:'assets/calculator.webp',category:'Study',price:20,owner:'Arjun Mehta',distance:'180m',rating:4.9},
  {id:2,name:'Sony Alpha Camera',image:'assets/camera.webp',category:'Creator',price:120,owner:'Riya Kapoor',distance:'350m',rating:5.0},
  {id:3,name:'PS5 DualSense',image:'assets/controller.webp',category:'Gaming',price:60,owner:'Kabir Shah',distance:'500m',rating:4.8},
  {id:4,name:'65W Laptop Charger',image:'assets/powerbank.webp',category:'Electronics',price:35,owner:'Neha Singh',distance:'220m',rating:4.9},
  {id:5,name:'Engineering Drawing Kit',image:'assets/drawing.webp',category:'Study',price:15,owner:'Samar Roy',distance:'450m',rating:4.7},
  {id:6,name:'JBL Bluetooth Speaker',image:'assets/speaker.webp',category:'Electronics',price:50,owner:'Aditi Jain',distance:'700m',rating:4.8},
  {id:7,name:'Podcast Mic + Arm',image:'assets/ringlight.webp',category:'Creator',price:45,owner:'Mehak Das',distance:'300m',rating:4.9},
  {id:8,name:'Badminton Racquets',image:'assets/badminton.webp',category:'Daily',price:30,owner:'Varun Nair',distance:'600m',rating:4.6}
];
let activeCategory='All',query='',selected=null,currentRating=0,selectedRequestId=null;
let bookings=JSON.parse(localStorage.getItem('borrowboxBookings')||'[]');
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const authGate=$('#authGate'),authVideo=$('#authVideo'),authPanel=$('#authPanel');
let authRevealed=false;
function revealAuth(){if(authRevealed)return;authRevealed=true;authVideo.pause();authGate.classList.add('is-lit');authPanel.setAttribute('aria-hidden','false');setTimeout(()=>$('#loginEmail').focus(),700)}
function enterApp(){authGate.classList.add('is-complete');document.body.classList.remove('auth-locked');setTimeout(()=>authGate.hidden=true,700)}
document.body.classList.add('auth-locked');
authVideo.addEventListener('ended',revealAuth);authVideo.addEventListener('error',revealAuth);authVideo.play().catch(revealAuth);
setTimeout(revealAuth,matchMedia('(prefers-reduced-motion: reduce)').matches?0:900);
$('#showPassword').addEventListener('click',()=>{const field=$('#loginPassword'),visible=field.type==='text';field.type=visible?'password':'text';$('#showPassword').textContent=visible?'Show':'Hide'});
$('#loginForm').addEventListener('submit',e=>{e.preventDefault();if(!e.currentTarget.reportValidity())return;$('#authMessage').textContent='Identity verified. Opening campus network…';sessionStorage.setItem('borrowboxAuthenticated','true');setTimeout(enterApp,550)});
$('#forgotPassword').addEventListener('click',()=>{$('#authMessage').textContent='Demo mode: use any valid college email and 6-character password.'});
$('#createAccount').addEventListener('click',()=>{$('#authMessage').textContent='Registration will use your verified college email in production.'});
if(sessionStorage.getItem('borrowboxAuthenticated')==='true'){authGate.hidden=true;document.body.classList.remove('auth-locked')}
function renderItems(){
  const filtered=items.filter(i=>(activeCategory==='All'||i.category===activeCategory)&&i.name.toLowerCase().includes(query.toLowerCase()));
  $('#itemsGrid').innerHTML=filtered.map(i=>`<article class="item-card"><div class="item-image"><img src="${i.image}" alt="${i.name}" width="1200" height="900" loading="lazy" decoding="async"><button class="save-button" data-save="${i.id}" aria-label="Save ${i.name}">♡</button><small class="availability">AVAILABLE TODAY</small></div><div class="item-body"><div class="item-meta"><span class="item-category">${i.category}</span><span class="rating">★ ${i.rating}</span></div><h3>${i.name}</h3><div class="owner">From ${i.owner} · ${i.distance} away</div><div class="item-footer"><div class="item-price"><strong>₹${i.price}</strong> <small>/ day</small></div><button class="borrow-button" data-borrow="${i.id}">Request item →</button></div></div></article>`).join('');
  $('#emptyState').style.display=filtered.length?'none':'block';
}
function toast(message){const t=$('#toast');t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)}
function updateAmount(){const days=Number($('#duration').value), total=selected.price*days+5;$('#rentalAmount').textContent=`₹${selected.price*days}`;$('#totalAmount').textContent=`₹${total}`;$('#payAmount').textContent=`₹${total}`;$('#payButtonAmount').textContent=`₹${total}`}
function openRequest(id){selected=items.find(i=>i.id===id);$('#selectedItem').innerHTML=`<img src="${selected.image}" alt="${selected.name}" width="60" height="60"><div><b>${selected.name}</b><small>${selected.owner} · ₹${selected.price}/day</small></div>`;$('#borrowDate').value=new Date().toISOString().split('T')[0];updateAmount();$('#requestModal').setAttribute('aria-labelledby','modalTitle');$('#modalBackdrop').hidden=false;document.body.style.overflow='hidden';$('#requestStep').hidden=false;$('#requestStep').classList.remove('is-leaving');$('#paymentStep').hidden=true;$('#paymentStep').classList.remove('payment-enter','payment-exit');$('#successStep').hidden=true;$('#successStep').classList.remove('success-enter');$('#checkoutTransition').hidden=true;$('#requestModal').classList.remove('is-morphing');setTimeout(()=>$('#borrowDate').focus(),120)}
function closeModal(){$('#modalBackdrop').hidden=true;document.body.style.overflow=''}
function closeBackdrop(id){$('#'+id).hidden=true;document.body.style.overflow=''}
function openBackdrop(id){$('#'+id).hidden=false;document.body.style.overflow='hidden'}
function renderBookings(){
  $('#borrowCount').textContent=bookings.length;
  $('#savedCount').textContent=$$('.save-button.saved').length;
  $('#bookingList').innerHTML=bookings.length?bookings.map((b,index)=>`<div class="booking"><div class="booking-icon"><img src="${b.image||'assets/camera.webp'}" alt=""></div><div class="booking-info"><b>${b.name}</b><small>${b.days} day${b.days>1?'s':''} · Paid ₹${b.total}</small><small class="booking-status">READY FOR HANDOVER · OTP ${b.otp}</small></div><button class="return-button" data-return="${index}">Confirm return</button></div>`).join(''):'<div class="booking-empty">No active borrows yet. Choose an item and complete the test payment to see it here.</div>';
}
renderItems();
fetch('/api/items').then(r=>r.json()).then(data=>{if(!data.items)return;data.items.forEach(row=>{const existing=items.find(i=>i.name===row.name);if(existing){existing.id=row.id;existing.owner=row.owner_name;existing.rating=Number(row.owner_rating)}else items.unshift({id:row.id,name:row.name,image:{Electronics:'assets/powerbank.webp',Study:'assets/calculator.webp',Gaming:'assets/controller.webp',Creator:'assets/camera.webp',Daily:'assets/badminton.webp'}[row.category]||'assets/drawing.webp',category:row.category,price:Number(row.price_per_day),owner:row.owner_name,distance:row.location,rating:Number(row.owner_rating)})});renderItems()}).catch(()=>{});
$('#itemsGrid').addEventListener('click',e=>{const borrow=e.target.closest('[data-borrow]'),save=e.target.closest('[data-save]');if(borrow)openRequest(Number(borrow.dataset.borrow));if(save){save.classList.toggle('saved');save.textContent=save.classList.contains('saved')?'♥':'♡';toast(save.classList.contains('saved')?'Saved to your wishlist':'Removed from wishlist')}});
$$('.category').forEach(btn=>btn.addEventListener('click',()=>{$$('.category').forEach(b=>b.classList.remove('active'));btn.classList.add('active');activeCategory=btn.dataset.category;renderItems()}));
function runSearch(){query=$('#heroSearch').value.trim();renderItems();$('#explore').scrollIntoView({behavior:'smooth'});if(query&&!items.some(i=>i.name.toLowerCase().includes(query.toLowerCase())))toast('Try “camera”, “calculator” or “power bank”')}
$('#searchButton').addEventListener('click',runSearch);$('#heroSearch').addEventListener('keydown',e=>{if(e.key==='Enter')runSearch()});$$('[data-search]').forEach(b=>b.addEventListener('click',()=>{$('#heroSearch').value=b.dataset.search;runSearch()}));
$('#duration').addEventListener('change',updateAmount);$('#modalClose').addEventListener('click',closeModal);$('#modalBackdrop').addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
const digits=value=>value.replace(/\D/g,'');
$('#cardName').addEventListener('input',e=>$('#visualCardName').textContent=e.target.value.trim().toUpperCase()||'YOUR NAME');
$('#cardNumber').addEventListener('input',e=>{const value=digits(e.target.value).slice(0,16).replace(/(.{4})/g,'$1 ').trim();e.target.value=value;$('#visualCardNumber').textContent=value||'•••• •••• •••• ••••'});
$('#cardExpiry').addEventListener('input',e=>{let value=digits(e.target.value).slice(0,4);if(value.length>2)value=value.slice(0,2)+'/'+value.slice(2);e.target.value=value;$('#visualExpiry').textContent=value||'MM/YY'});
$('#cardCvc').addEventListener('input',e=>{e.target.value=digits(e.target.value).slice(0,3);$('#visualCvc').textContent=e.target.value||'•••'});
$('#cardCvc').addEventListener('focus',()=>$('#paymentCard').classList.add('is-flipped'));$('#cardCvc').addEventListener('blur',()=>$('#paymentCard').classList.remove('is-flipped'));
$$('[data-pay-method]').forEach(button=>button.addEventListener('click',()=>{$$('[data-pay-method]').forEach(b=>b.classList.remove('active'));button.classList.add('active');const card=button.dataset.payMethod==='card';$('#cardPayment').hidden=!card;$('#upiPayment').hidden=card}));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
$('#sendRequest').addEventListener('click',async()=>{
  if(!$('#borrowDate').value)return toast('Please choose a borrowing date');
  const button=$('#sendRequest'),start=$('#borrowDate').value,days=Number($('#duration').value),end=new Date(new Date(start).getTime()+days*86400000).toISOString().split('T')[0],total=selected.price*days+5;
  button.disabled=true;$('#requestStep').classList.add('is-leaving');$('#checkoutTransition').hidden=false;$('#requestModal').classList.add('is-morphing');selectedRequestId=null;
  const saveRequest=(async()=>{try{const response=await fetch('/api/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({itemId:selected.id,borrowerId:1,startDate:start,endDate:end,totalAmount:total,message:$('#requestMessage').value})});const data=await response.json();if(response.ok)selectedRequestId=data.id}catch{}})();
  await Promise.all([saveRequest,wait(850)]);
  $('#requestStep').hidden=true;$('#requestStep').classList.remove('is-leaving');$('#paymentStep').hidden=false;$('#requestModal').setAttribute('aria-labelledby','paymentTitle');$('#paymentStep').classList.remove('payment-enter');requestAnimationFrame(()=>$('#paymentStep').classList.add('payment-enter'));$('#checkoutTransition').hidden=true;$('#requestModal').classList.remove('is-morphing');button.disabled=false;setTimeout(()=>$('#cardName').focus(),650);
});
$('#payButton').addEventListener('click',async()=>{
  const cardMode=$('[data-pay-method].active').dataset.payMethod==='card';if(cardMode&&(digits($('#cardNumber').value).length!==16||digits($('#cardExpiry').value).length!==4||digits($('#cardCvc').value).length!==3))return toast('Enter the complete test-card details');if(!cardMode&&!$('#upiId').value.includes('@'))return toast('Enter a valid demo UPI ID');
  const btn=$('#payButton');btn.disabled=true;btn.classList.add('is-processing');$('.pay-label').innerHTML='<span class="pay-spinner"></span> Securing payment';
  await wait(1250);if(selectedRequestId){try{await fetch('/api/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:selectedRequestId,amount:selected.price*Number($('#duration').value)+5})})}catch{}}
  $('#paymentStep').classList.add('payment-exit');await wait(380);$('#paymentStep').hidden=true;$('#paymentStep').classList.remove('payment-exit','payment-enter');$('#successStep').hidden=false;$('#requestModal').setAttribute('aria-labelledby','successTitle');$('#successStep').classList.add('success-enter');$('#otpCode').textContent=`${Math.floor(100+Math.random()*900)} ${Math.floor(100+Math.random()*900)}`;btn.disabled=false;btn.classList.remove('is-processing');$('.pay-label').innerHTML='Authorize <b id="payButtonAmount"></b> →';updateAmount();
});
$('#doneButton').addEventListener('click',()=>{const otp=$('#otpCode').textContent;bookings.push({name:selected.name,image:selected.image,days:Number($('#duration').value),total:selected.price*Number($('#duration').value)+5,otp});localStorage.setItem('borrowboxBookings',JSON.stringify(bookings));closeModal();toast('Booking saved to “My Borrows”')});
$('#listButton').addEventListener('click',()=>openBackdrop('listBackdrop'));
$('.avatar').addEventListener('click',()=>{renderBookings();openBackdrop('dashboardBackdrop')});
$$('[data-close]').forEach(button=>button.addEventListener('click',()=>closeBackdrop(button.dataset.close)));
['listBackdrop','dashboardBackdrop','ratingBackdrop'].forEach(id=>$('#'+id).addEventListener('click',e=>{if(e.target===e.currentTarget)closeBackdrop(id)}));
$('#listForm').addEventListener('submit',async e=>{e.preventDefault();const category=$('#newItemCategory').value,payload={ownerId:1,name:$('#newItemName').value.trim(),category,price:Number($('#newItemPrice').value),location:$('#newItemLocation').value.trim(),description:$('#newItemDescription').value.trim()};let id=Date.now();try{const response=await fetch('/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await response.json();if(response.ok)id=data.id}catch{}const image={Electronics:'assets/powerbank.webp',Study:'assets/calculator.webp',Gaming:'assets/controller.webp',Creator:'assets/camera.webp',Daily:'assets/badminton.webp'}[category];items.unshift({id,name:payload.name,image,category,price:payload.price,owner:'You',distance:payload.location,rating:5.0});activeCategory='All';query='';renderItems();e.target.reset();closeBackdrop('listBackdrop');$('#explore').scrollIntoView({behavior:'smooth'});toast('Your item is now live and saved!')});
$('#bookingList').addEventListener('click',e=>{const button=e.target.closest('[data-return]');if(!button)return;const index=Number(button.dataset.return);bookings.splice(index,1);localStorage.setItem('borrowboxBookings',JSON.stringify(bookings));closeBackdrop('dashboardBackdrop');currentRating=0;$$('#ratingStars button').forEach(b=>b.classList.remove('active'));openBackdrop('ratingBackdrop')});
$('#ratingStars').addEventListener('click',e=>{const button=e.target.closest('[data-star]');if(!button)return;currentRating=Number(button.dataset.star);$$('#ratingStars button').forEach(b=>b.classList.toggle('active',Number(b.dataset.star)<=currentRating))});
$('#submitRating').addEventListener('click',()=>{if(!currentRating)return toast('Please select a star rating');closeBackdrop('ratingBackdrop');toast('Thank you — return completed and rating saved!')});
$('#viewAll').addEventListener('click',()=>{activeCategory='All';query='';$('#heroSearch').value='';$$('.category').forEach((b,i)=>b.classList.toggle('active',i===0));renderItems();toast('Showing all available items')});
const savedTheme=localStorage.getItem('borrowboxTheme');if(savedTheme==='light'){document.body.classList.add('light');$('#themeButton').textContent='Dark mode'}
$('#themeButton').addEventListener('click',()=>{document.body.classList.toggle('light');const light=document.body.classList.contains('light');$('#themeButton').textContent=light?'Dark mode':'Light mode';localStorage.setItem('borrowboxTheme',light?'light':'dark')});
$('#mobileMenu').addEventListener('click',()=>{const open=$('.nav-actions').classList.toggle('open');$('#mobileMenu').setAttribute('aria-expanded',String(open))});$('#heroListButton').addEventListener('click',()=>openBackdrop('listBackdrop'));
const dockItems=$$('.dock-item');function activateDock(item){if(!item)return;dockItems.forEach(node=>node.classList.toggle('active',node===item));$('#liquidDock').style.setProperty('--dock-index',item.dataset.dock)}
dockItems.forEach(item=>item.addEventListener('click',()=>activateDock(item)));$('#dockList').addEventListener('click',()=>openBackdrop('listBackdrop'));$('#dockProfile').addEventListener('click',()=>{renderBookings();openBackdrop('dashboardBackdrop')});
const sectionDock={home:'0',explore:'1',how:'3',safety:'3'};const sectionObserver=new IntersectionObserver(entries=>{entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio).slice(0,1).forEach(entry=>activateDock($(`.dock-item[data-dock="${sectionDock[entry.target.id]}"]`)))},{rootMargin:'-20% 0px -55%',threshold:[0,.25,.6]});Object.keys(sectionDock).forEach(id=>sectionObserver.observe(document.getElementById(id)));

// Progressive motion layer: the interface remains fully usable without it.
document.body.classList.add('motion-ready');
const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target)}}),{rootMargin:'0px 0px -10%',threshold:.12});
$$('.section-head,.protocol-intro,.protocol-flow article,.trust-visual,.trust-copy,.network-strip>div,footer .footer-grid').forEach((element,index)=>{element.classList.add('reveal-unit');element.style.setProperty('--reveal-order',index%4);revealObserver.observe(element)});
function primeInventoryMotion(){$$('#itemsGrid .item-card').forEach((card,index)=>{card.style.setProperty('--card-order',index%8);requestAnimationFrame(()=>card.classList.add('is-mounted'))})}
new MutationObserver(primeInventoryMotion).observe($('#itemsGrid'),{childList:true});primeInventoryMotion();
if(matchMedia('(hover:hover) and (pointer:fine)').matches){
  document.addEventListener('pointermove',event=>{document.body.style.setProperty('--pointer-x',`${event.clientX}px`);document.body.style.setProperty('--pointer-y',`${event.clientY}px`)},{passive:true});
  $('#itemsGrid').addEventListener('pointermove',event=>{const card=event.target.closest('.item-card');if(!card)return;const rect=card.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width-.5,y=(event.clientY-rect.top)/rect.height-.5;card.style.setProperty('--tilt-x',`${-y*4}deg`);card.style.setProperty('--tilt-y',`${x*5}deg`)});
  $('#itemsGrid').addEventListener('pointerout',event=>{const card=event.target.closest('.item-card');if(card&&!card.contains(event.relatedTarget)){card.style.setProperty('--tilt-x','0deg');card.style.setProperty('--tilt-y','0deg')}});
}
