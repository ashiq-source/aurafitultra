/* AuraFit Cloud Sync foundation. Local IndexedDB remains the source of truth while offline. */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { openAuraFitDB, STORES } from './aurafit-ultra-data-layer.js';
const cfg = window.AURAFIT_CONFIG || {};
const status = (message) => { const el=document.getElementById('cloudSyncStatus'); if(el) el.textContent=message; };
let client=null;
export function cloudConfigured(){return Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey);}
export function getCloudClient(){ if(!cloudConfigured()) throw new Error('Supabase URL and anon key are not configured.'); return client ||= createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}); }
export async function cloudSignIn(email,password){const {data,error}=await getCloudClient().auth.signInWithPassword({email,password});if(error)throw error;return data;}
export async function cloudSignUp(email,password){const {data,error}=await getCloudClient().auth.signUp({email,password});if(error)throw error;return data;}
export async function cloudSignOut(){if(!client)return;const {error}=await client.auth.signOut();if(error)throw error;}
const stores=Object.keys(STORES).filter(n=>!['legacy_snapshots','migration_runs','ai_cache','app_cache'].includes(n));
const keyOf=(store,row)=>row?.id??row?.key??row?.dateISO;
export async function syncCloud(){
 const c=getCloudClient();const {data:{user},error:authError}=await c.auth.getUser();if(authError)throw authError;if(!user)throw new Error('Please sign in before syncing.');
 const db=await openAuraFitDB();let pushed=0,pulled=0;
 try{
  for(const store of stores){const tx=db.transaction(store,'readonly');const rows=await new Promise((resolve,reject)=>{const q=tx.objectStore(store).getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
   for(const row of rows){const recordId=String(keyOf(store,row));if(!recordId)continue;const updatedAt=row.updatedAt||row.createdAt||row.dateISO||new Date().toISOString();const {error}=await c.from('aurafit_records').upsert({user_id:user.id,store_name:store,record_id:recordId,payload:row,updated_at:updatedAt},{onConflict:'user_id,store_name,record_id'});if(error)throw error;pushed++;}
   const {data,error}=await c.from('aurafit_records').select('record_id,payload,updated_at').eq('user_id',user.id).eq('store_name',store).limit(5000);if(error)throw error;
   const write=db.transaction(store,'readwrite');for(const remote of data||[]){const local=await new Promise((resolve,reject)=>{const q=write.objectStore(store).get(remote.record_id);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});const localTime=local?.updatedAt||local?.createdAt||local?.dateISO||'';if(!local||String(remote.updated_at)>String(localTime)){write.objectStore(store).put(remote.payload);pulled++;}}
   await new Promise((resolve,reject)=>{write.oncomplete=resolve;write.onerror=()=>reject(write.error);write.onabort=()=>reject(write.error)});
  }
 } finally {db.close();}
 status(`Cloud sync complete · ${pushed} uploaded · ${pulled} downloaded`);return {pushed,pulled};
}
window.AuraFitCloud={cloudConfigured,cloudSignIn,cloudSignUp,cloudSignOut,syncCloud};
