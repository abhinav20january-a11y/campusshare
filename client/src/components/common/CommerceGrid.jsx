// Three-item layout adapted from vercel/commerce (MIT), components/grid/three-items.tsx.
// See THIRD_PARTY_NOTICES.md for license and integration notes.
import {Link} from 'react-router-dom';
import {motion,useReducedMotion} from 'motion/react';
import {ArrowUpRight} from 'lucide-react';

export default function CommerceGrid({items}){
  const reduce=useReducedMotion();
  return <section className="commerce-grid" aria-label="Explore campus collections">
    {items.slice(0,3).map((item,index)=><motion.div key={item.title} className={index===0?'commerce-tile full':'commerce-tile half'} initial={reduce?false:{opacity:0,y:22}} animate={{opacity:1,y:0}} transition={{delay:index*.09,duration:.5}}>
      <Link to={item.to}>
        <img src={item.image} alt={item.alt} fetchPriority={index===0?'high':'auto'}/>
        <span className="collection-topline">{item.label}<ArrowUpRight size={22}/></span>
        <div className="collection-caption"><small>{item.subtitle}</small><h2>{item.title}</h2><span className="collection-cta">Explore collection <ArrowUpRight size={16}/></span></div>
      </Link>
    </motion.div>)}
  </section>;
}
