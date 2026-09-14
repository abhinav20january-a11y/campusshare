import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';

// Preserve native wheel/touch scrolling. Route-level motion lives in each page.
export default function RouteEffects(){
  const {pathname}=useLocation();
  useEffect(()=>{
    window.scrollTo({top:0,behavior:'instant'});
    const page=pathname.split('/').filter(Boolean)[0];
    document.title=page? `${page.replaceAll('-',' ')} · CampusShare`:'CampusShare · Great plans. Less buying.';
  },[pathname]);
  return null;
}
