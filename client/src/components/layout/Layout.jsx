import {Link,NavLink,useNavigate,Outlet,useLocation} from 'react-router-dom';
import {ArrowUpRight,Bell,Search,Plus,MessageCircle,LayoutDashboard,Heart,Package,CalendarDays,Users,ShieldCheck,Settings,HelpCircle,LogOut,Home,Repeat2,ChevronDown} from 'lucide-react';
import {useState,useEffect} from 'react';
import {motion} from 'motion/react';
import {useApp} from '../../context/AppContext';
import {api,get} from '../../api/client';
import {Avatar} from '../common/UI';

export function Layout(){
  const {user,setUser,setToast}=useApp();
  const navigate=useNavigate(),location=useLocation();
  const [search,setSearch]=useState('');
  const [menu,setMenu]=useState(false);
  const [unread,setUnread]=useState(0);

  useEffect(()=>setMenu(false),[location.pathname]);
  useEffect(()=>{
    if(!user){setUnread(0);return}
    let active=true;
    const poll=()=>{
      if(document.hidden)return;
      get('/notifications/unread-count').then(data=>{if(active)setUnread(data.count)}).catch(()=>{});
    };
    poll();const timer=setInterval(poll,12000);
    return()=>{active=false;clearInterval(timer)};
  },[user]);

  const accountLinks=[
    ['Dashboard','/dashboard',LayoutDashboard],['My items','/my-items',Package],
    ['My requests','/my-requests',Repeat2],['Incoming requests','/requests/incoming',ArrowUpRight],
    ['My borrowings','/borrowings',Repeat2],['My lending','/lending',Package],
    ['Saved items','/saved',Heart],['Calendar','/calendar',CalendarDays],
    ['Borrow circles','/circles',Users],['Settings','/settings',Settings],['Help & safety','/help',HelpCircle]
  ];

  async function signOut(){
    try{await api.post('/auth/logout');setMenu(false);setUser(null);navigate('/login')}
    catch{setToast('Could not sign out. Try again.')}
  }

  return <>
    <a className="skip" href="#content">Skip to content</a>
    <div className="announcement"><span><span className="live-dot"/> SMALL THINGS. STRONGER CAMPUS.</span><Link to="/safety">A community built on trust <ArrowUpRight size={13}/></Link></div>
    <header className="header">
      <Link to="/" className="logo"><span className="logo-mark"><Repeat2 size={23}/></span>Campus<span>Share</span><i/></Link>
      <nav className="desktop-links" aria-label="Primary navigation">
        <NavLink to="/items">Explore</NavLink><NavLink to="/how-it-works">How it works</NavLink><NavLink to="/circles">Community</NavLink>
      </nav>
      <form className="nav-search" onSubmit={event=>{event.preventDefault();navigate('/items?q='+encodeURIComponent(search))}}>
        <Search size={17}/><input aria-label="Search campus items" placeholder="Find something useful" value={search} onChange={event=>setSearch(event.target.value)}/><kbd>↵</kbd>
      </form>
      <div className="header-actions">{user?<>
        <Link className="icon-button notifications" to="/notifications" aria-label={`Notifications, ${unread} unread`}><Bell size={20}/>{unread>0&&<i>{unread}</i>}</Link>
        <Link to="/items/new" className="button compact"><Plus size={16}/>List an item</Link>
        <button className="profile-trigger" aria-label="Account menu" aria-expanded={menu} onClick={()=>setMenu(open=>!open)}><Avatar name={user.name} src={user.avatar}/><ChevronDown size={14}/></button>
      </>:<><Link className="header-login" to="/login">Log in</Link><Link className="button compact" to="/register">Sign up</Link></>}</div>

      {menu&&user&&<div className="profile-menu">
        <strong>{user.name}</strong><small>{user.university}</small>
        {accountLinks.map(([label,to,Icon])=><Link key={to} to={to}><Icon size={17}/>{label}</Link>)}
        <Link to={`/users/${user.id}`}><Users size={17}/>My profile</Link>
        {user.role==='ADMIN'&&<Link to="/admin"><ShieldCheck size={17}/>Admin center</Link>}
        <button onClick={signOut}><LogOut size={17}/>Sign out</button>
      </div>}
    </header>

    <main id="content"><Outlet/></main>
    <footer>
      <div><Link to="/" className="logo"><span className="logo-mark"><Repeat2 size={20}/></span>CampusShare</Link><p>Why buy it when someone on<br/>campus already has it?</p><small>Made for a more connected campus.</small></div>
      <div><h4>Discover</h4><Link to="/items">Browse items</Link><Link to="/circles">Borrow circles</Link><Link to="/how-it-works">How it works</Link></div>
      <div><h4>Community</h4><Link to="/about">About CampusShare</Link><Link to="/safety">Safety center</Link><Link to="/community-guidelines">Community guidelines</Link></div>
      <div><h4>Here to help</h4><Link to="/help">Help center</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms of use</Link><Link to="/contact">Contact</Link></div>
    </footer>
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {[["Home","/",Home],["Explore","/items",Search],["Borrow","/borrowings",Repeat2],["Messages","/messages",MessageCircle],["You","/dashboard",Users]].map(([label,to,Icon])=><NavLink key={to} to={to} end={to==='/'}>{({isActive})=><>{isActive&&<motion.i className="dock-active" layoutId="mobile-active" transition={{type:'spring',stiffness:410,damping:34}}/>}<Icon size={20}/><span>{label}</span></>}</NavLink>)}
    </nav>
  </>;
}
