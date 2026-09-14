import {Link,useNavigate} from 'react-router-dom';
import {motion,useReducedMotion} from 'motion/react';
import {Search,ArrowUpRight,ShieldCheck,Camera,BookOpen,Headphones,Wrench,Gamepad2,GraduationCap,Trophy,Cable,Repeat2,MapPin,Leaf,Users} from 'lucide-react';
import {useState} from 'react';
import {useData} from '../hooks/useData';
import {ItemGrid,DataState} from '../components/common/UI';
export const categoryIcons={Electronics:Headphones,Books:BookOpen,Photography:Camera,Sports:Trophy,Gaming:Gamepad2,Tools:Wrench,Academic:GraduationCap,Accessories:Cable};
const categories=[['Cameras','Capture more','Photography','/assets/camera-640.webp'],['Calculators','Solve together','Academic','/assets/calculator-640.webp'],['Controllers','Play on','Gaming','/assets/controller-640.webp'],['Sports','Go further','Sports','/assets/badminton-640.webp'],['Everyday gear','Make life easier','Accessories','/assets/powerbank-640.webp']];
export default function Home(){
 const nav=useNavigate(),reduce=useReducedMotion(),[q,setQ]=useState(''),[area,setArea]=useState('');
 const data=useData('/items?sort=recommended');
 const enter={initial:reduce?false:{opacity:0,y:18},animate:{opacity:1,y:0},transition:{duration:.55}};
 return <div className="objects-home">
   <section className="objects-hero">
     <div className="objects-hero-inner">
       <motion.div className="objects-copy" {...enter}>
         <p className="objects-eyebrow">SAME CAMPUS. A BRIGHTER TOMORROW.</p>
         <h1>Great plans.<br/><span>Less buying.</span></h1>
         <p className="objects-lede">Borrow what you need. Lend what you don't.<br/>A more affordable, sustainable campus for everyone.</p>
         <form className="objects-search" onSubmit={e=>{e.preventDefault();const params=new URLSearchParams();if(q.trim())params.set('q',q.trim());if(area)params.set('location',area);nav('/items?'+params)}}>
           <label><Search size={19}/><input aria-label="What do you need?" placeholder="What do you need?" value={q} onChange={e=>setQ(e.target.value)}/></label>
           <label className="objects-area"><MapPin size={18}/><select aria-label="Campus pickup area" value={area} onChange={e=>setArea(e.target.value)}><option value="">Your campus</option><option>North Campus</option><option>South Campus</option><option>Hostel Zone</option></select></label>
           <button type="submit">Search</button>
         </form>
         <div className="objects-benefits"><span><Leaf/>Save money</span><span><Users/>Stronger campus community</span><span><Repeat2/>A more sustainable tomorrow</span></div>
       </motion.div>
       <motion.div className="objects-art" initial={reduce?false:{opacity:0,x:24}} animate={{opacity:1,x:0}} transition={{duration:.8}}>
         <img src="/assets/generated/campus-objects-hero.jpg" alt="Orange headphones, a silver camera, books and a scientific calculator ready for a new project" fetchPriority="high" width="1200" height="800"/>
         <span className="objects-art-note">Good things<br/>go further<br/><em>together.</em></span>
       </motion.div>
     </div>
   </section>
   <section className="objects-categories" aria-label="Explore item categories">{categories.map(([title,sub,category,img])=><Link key={title} to={'/items?category='+category}><span className="objects-category-image"><img src={img} alt="" width="110" height="110" loading="lazy"/></span><strong>{title}</strong><small>{sub}</small></Link>)}</section>
   <section className="objects-featured">
     <div className="objects-section-title"><h2>Featured items near you</h2><Link to="/items">View all <ArrowUpRight size={17}/></Link></div>
     <DataState {...data}><ItemGrid items={data.data?.items.slice(0,8)} refresh={data.refresh}/></DataState>
   </section>
   <section className="objects-how"><div><p className="objects-eyebrow">LESS OWNERSHIP. MORE POSSIBILITY.</p><h2>Your next idea<br/>is already on campus.</h2><p>A simple way to turn things we own into things we share.</p><Link className="button" to="/items/new">Share your first item <ArrowUpRight size={17}/></Link></div><div className="objects-steps">{[['01','Find something useful','Explore what students nearby are happy to lend.'],['02','Agree on the details','Request your dates and connect with the owner.'],['03','Borrow, then pass it back','Confirm handover together, return on time and leave a review.']].map(([n,t,d])=><motion.article key={n} initial={reduce?false:{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.4}} transition={{duration:.4}}><span>{n}</span><div><h3>{t}</h3><p>{d}</p></div></motion.article>)}</div></section>
   <section className="objects-trust"><ShieldCheck size={36}/><div><h2>Good sharing starts with trust.</h2><p>Verified student accounts, clear exchange records and two-way reviews.</p></div><Link to="/safety">Meet your safety net <ArrowUpRight size={17}/></Link></section>
   <section className="objects-faq"><div><p className="objects-eyebrow">A FEW THINGS TO KNOW</p><h2>Before you borrow.</h2><Link to="/help">Visit the help centre <ArrowUpRight size={17}/></Link></div><div>{[['Who can borrow?','Students with a verified college account can request available items from their campus community.'],['How long can I keep an item?','Choose your borrowing dates when you request the item. The owner reviews the request and you agree on a return time.'],['What if something goes wrong?','Open a dispute from your exchange page and attach evidence. A campus administrator can review the exchange.']].map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>
 </div>;
}
