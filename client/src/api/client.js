import axios from 'axios';
export const api=axios.create({baseURL:'/api',withCredentials:true,timeout:15000});
export const errorMessage=e=>e.response?.data?.message||e.message||'Please try again.';
export async function get(url){return (await api.get(url)).data.data}
