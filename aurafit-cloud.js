/* AuraFit AI Ultra — private Supabase sync + Google Drive backup. */
import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { openAuraFitDB, STORES } from './aurafit-ultra-data-layer.js';
const cfg=window.AURAFIT_CONFIG||{};
const status=m=>{const el=document.getElementById('cloudSyncStatus');if(el)el.textContent=m;};
let client=null,googleAccessToken=null;
const excluded=new Set(['legacy_snapshots','migration_runs','ai_cache','app_cache']);
const stores=Object.keys(STORES).filter(n=>!excluded.has(n));
const nativeRedirect='com.aurafit.aiultra://login-callback';
export function cloudConfigured(){return Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey);}
export function getCloudClient(){
 if(!cloudConfigured())throw new Error('Supabase URL and publishable key are not configured.');
 if(!client){client=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'}});
 client.auth.onAuthStateChange((_event,session)=>{if(session?.provider_token)googleAccessToken=session.provider_token;if(session?.user)status('Signed in · '+(session.user.email||'Google account')+'. Cloud sync is ready.');});}
 return client;
}
const oauthRedirect=()=>Capacitor.isNativePlatform()?nativeRedirect:(location.origin+location.pathname);
async function captureOAuthCallback(url){
 if(!url)return false;
 const callback=new URL(url);
 const oauthError=callback.searchParams.get('error_description')||callback.searchParams.get('error');
 if(oauthError)throw new Error(oauthError);
 const code=callback.searchParams.get('code');
 if(!code)return false;
 const {data,error}=await getCloudClient().auth.exchangeCodeForSession(code);
 if(error)throw error;
 googleAccessToken=data?.session?.provider_token||googleAccessToken;
 status('Google account connected · '+(data?.session?.user?.email||'signed in')+'.');
 try{await Browser.close();}catch{}
 return true;
}
export async function initCloudAuth(){
 const c=getCloudClient();
 try{
  if(Capacitor.isNativePlatform()){
   App.addListener('appUrlOpen',async({url})=>{try{if(await captureOAuthCallback(url))history.replaceState({},document.title,'/');}catch(e){status('Google sign-in failed: '+e.message);}});
   const launch=await App.getLaunchUrl();if(launch?.url)await captureOAuthCallback(launch.url);
  }else if(new URLSearchParams(location.search).has('code')){await captureOAuthCallback(location.href);history.replaceState({},document.title,location.pathname);}
 }catch(e){status('Authentication callback: '+e.message);}
 const {data:{session}}=await c.auth.getSession();
 if(session?.provider_token)googleAccessToken=session.provider_token;
 if(session?.user)status('Signed in · '+(session.user.email||'account')+'. Cloud sync is ready.');
 else status('Not signed in. Use Continue with Google or email/password to enable private cloud sync.');
 return session;
}
async function startGoogleOAuth(scopes, prompt='select_account'){
 const native=Capacitor.isNativePlatform();
 const {data,error}=await getCloudClient().auth.signInWithOAuth({provider:'google',options:{redirectTo:oauthRedirect(),skipBrowserRedirect:native,scopes,queryParams:{access_type:'offline',prompt}}});
 if(error)throw error;
 if(native&&data?.url)await Browser.open({url:data.url});
 return data;
}
export async function googleSignIn(){
 return startGoogleOAuth('openid email profile','select_account');
}
export async function googleDriveSignIn(){
 return startGoogleOAuth('openid email profile https://www.googleapis.com/auth/drive.file','consent');
}
export async function cloudSignIn(email,password){const {data,error}=await getCloudClient().auth.signInWithPassword({email,password});if(error)throw error;return data;}
export async function cloudSignUp(email,password){const {data,error}=await getCloudClient().auth.signUp({email,password});if(error)throw error;return data;}
export async function cloudSignOut(){if(!client)return;const {error}=await client.auth.signOut();if(error)throw error;googleAccessToken=null;status('Signed out. Your local records remain on this device.');}
const stamp=row=>row?.updatedAt||row?.createdAt||row?.dateISO||'1970-01-01T00:00:00.000Z';
const time=value=>{const n=Date.parse(value||'');return Number.isFinite(n)?n:0;};
const tombstoneKey=(store,id)=>'__aurafit_deleted__:'+store+':'+encodeURIComponent(String(id));
const readAll=(db,store)=>new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly');const q=tx.objectStore(store).getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
const writeRows=(db,store,rows)=>new Promise((resolve,reject)=>{if(!rows.length){resolve();return;}const names=store==='settings'?[store]:[store,'settings'];const tx=db.transaction(names,'readwrite');for(const row of rows){tx.objectStore(store).put(row);if(store!=='settings'){const id=row?.[STORES[store].keyPath];if(id!==undefined&&id!==null)tx.objectStore('settings').delete(tombstoneKey(store,id));}}tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
const deleteRows=(db,store,rows)=>new Promise((resolve,reject)=>{if(!rows.length){resolve();return;}const tx=db.transaction([store,'settings'],'readwrite');for(const item of rows){tx.objectStore(store).delete(item.id);const deletedAt=item.deletedAt||new Date().toISOString();tx.objectStore('settings').put({key:tombstoneKey(store,item.id),syncTombstone:true,storeName:store,recordId:String(item.id),deletedAt,updatedAt:deletedAt});}tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
const clearTombstones=(db,store,ids)=>new Promise((resolve,reject)=>{if(!ids.length){resolve();return;}const tx=db.transaction('settings','readwrite');for(const id of ids)tx.objectStore('settings').delete(tombstoneKey(store,id));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
export async function syncCloud(){
 const c=getCloudClient();const {data:{user},error:authError}=await c.auth.getUser();if(authError)throw authError;if(!user)throw new Error('Please sign in before syncing.');
 const db=await openAuraFitDB();let pushed=0,pulled=0;
 try{
  const settingsRows=await readAll(db,'settings');
  const tombstones=settingsRows.filter(r=>r?.syncTombstone===true&&r.storeName&&r.recordId!=null);
  for(const store of stores){
   const keyPath=STORES[store].keyPath;
   const allLocal=await readAll(db,store);
   const localRows=store==='settings'?allLocal.filter(r=>r?.syncTombstone!==true):allLocal;
   const localById=new Map(localRows.map(r=>[String(r?.[keyPath]),r]));
   const localTombs=new Map(store==='settings'?[]:tombstones.filter(t=>t.storeName===store).map(t=>[String(t.recordId),t]));
   let remoteRows=[],offset=0;
   while(true){
    const {data,error}=await c.from('aurafit_records').select('record_id,payload,updated_at').eq('user_id',user.id).eq('store_name',store).order('record_id').range(offset,offset+999);
    if(error)throw error;
    const page=data||[];remoteRows.push(...page);if(page.length<1000)break;offset+=1000;
   }
   const remoteById=new Map(remoteRows.map(r=>[String(r.record_id),r]));
   const uploads=new Map(),downloads=[],deletions=[],clearIds=[];
   const addRecord=(id,row)=>uploads.set(String(id),{user_id:user.id,store_name:store,record_id:String(id),payload:row,updated_at:new Date(Math.max(time(stamp(row)),Date.now())).toISOString()});
   const addTombstone=(id,deletedAt)=>uploads.set(String(id),{user_id:user.id,store_name:store,record_id:String(id),payload:{__aurafit_deleted:true,storeName:store,recordId:String(id),deletedAt},updated_at:deletedAt});
   for(const [id,tomb] of localTombs){
    const remote=remoteById.get(id),remoteTime=time(remote?.updated_at),deletedAt=tomb.deletedAt||tomb.updatedAt||'';
    if(!remote||time(deletedAt)>=remoteTime)addTombstone(id,deletedAt||new Date().toISOString());
    else if(remote.payload?.__aurafit_deleted===true){deletions.push({id,deletedAt:remote.updated_at});}
    else{clearIds.push(id);if(remote.payload&&typeof remote.payload==='object')downloads.push(remote.payload);}
   }
   for(const row of localRows){
    const raw=row?.[keyPath];if(raw===undefined||raw===null||String(raw)==='')continue;
    const id=String(raw);if(localTombs.has(id))continue;
    const remote=remoteById.get(id);
    if(remote?.payload?.__aurafit_deleted===true){
     if(time(remote.updated_at)>=time(stamp(row)))deletions.push({id,deletedAt:remote.updated_at});
     else addRecord(id,row);
    }else if(!remote||time(stamp(row))>=time(remote.updated_at))addRecord(id,row);
   }
   for(const remote of remoteRows){
    const id=String(remote.record_id),local=localById.get(id),tomb=localTombs.get(id),remoteTime=time(remote.updated_at);
    if(remote.payload?.__aurafit_deleted===true){
     if(!local||remoteTime>=time(stamp(local)))deletions.push({id,deletedAt:remote.updated_at});
     else addRecord(id,local);
     continue;
    }
    if(tomb){
     if(time(tomb.deletedAt||tomb.updatedAt)>=remoteTime)addTombstone(id,tomb.deletedAt||tomb.updatedAt);
     else{clearIds.push(id);if(!local||remoteTime>time(stamp(local)))downloads.push(remote.payload);}
    }else if(remote.payload&&typeof remote.payload==='object'&&(!local||remoteTime>time(stamp(local))))downloads.push(remote.payload);
   }
   const upload=[...uploads.values()];
   for(let i=0;i<upload.length;i+=100){const batch=upload.slice(i,i+100);const {error:upsertError}=await c.from('aurafit_records').upsert(batch,{onConflict:'user_id,store_name,record_id'});if(upsertError)throw upsertError;pushed+=batch.length;}
   const uniqueDeletes=[...new Map(deletions.map(x=>[x.id,x])).values()];
   await deleteRows(db,store,uniqueDeletes);
   await clearTombstones(db,store,[...new Set(clearIds)]);
   const uniqueDownloads=[...new Map(downloads.map(row=>[String(row?.[keyPath]),row])).values()];
   await writeRows(db,store,uniqueDownloads);pulled+=uniqueDownloads.length;
  }
 }finally{db.close();}
 status('Cloud sync complete · '+pushed+' uploaded · '+pulled+' downloaded. Deletions are synced across devices.');
 return {pushed,pulled};
}
function driveToken(){if(googleAccessToken)return googleAccessToken;throw new Error('Google Drive permission is not active. Sign in again with Google, then retry.');}
async function driveRequest(url,options={}){const response=await fetch(url,{...options,headers:{...(options.headers||{}),Authorization:'Bearer '+driveToken()}});if(!response.ok){const detail=await response.text();if(response.status===401)googleAccessToken=null;throw new Error('Google Drive error ('+response.status+'). '+detail.slice(0,240));}return response;}
async function exportBackupData(){
 const db=await openAuraFitDB();try{const data={};for(const name of stores)data[name]=await readAll(db,name);return {appName:'AuraFit AI Ultra',backupFormat:'aurafit-ultra-backup',backupVersion:2,schemaVersion:2,exportedAt:new Date().toISOString(),recordCounts:Object.fromEntries(stores.map(n=>[n,data[n].length])),data};}finally{db.close();}
}
export async function backupToGoogleDrive(){
 const backup=await exportBackupData(),date=new Date().toISOString().slice(0,10),name='AuraFit-AI-Ultra-Backup-'+date+'.json';
 const metadata={name,mimeType:'application/json',description:'Personal AuraFit AI Ultra backup'};
 const form=new FormData();form.append('metadata',new Blob([JSON.stringify(metadata)],{type:'application/json'}));form.append('file',new Blob([JSON.stringify(backup)],{type:'application/json'}),name);
 const response=await driveRequest('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,webViewLink',{method:'POST',body:form});const file=await response.json();status('Google Drive backup saved: '+file.name);return file;
}
export async function restoreFromGoogleDrive(){
 const q=encodeURIComponent("name contains 'AuraFit-AI-Ultra-Backup-' and trashed = false");
 const listResponse=await driveRequest('https://www.googleapis.com/drive/v3/files?q='+q+'&orderBy=modifiedTime%20desc&pageSize=20&fields=files(id,name,modifiedTime)');
 const list=await listResponse.json();if(!list.files?.length)throw new Error('No AuraFit backup was found in this Google Drive.');
 const file=list.files[0],content=await driveRequest('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(file.id)+'?alt=media'),backup=await content.json();
 if(backup.backupFormat!=='aurafit-ultra-backup'||!backup.data||typeof backup.data!=='object')throw new Error('This Drive file is not a valid AuraFit backup.');
 const db=await openAuraFitDB();let restored=0;
 try{for(const store of stores){const rows=backup.data[store];if(!Array.isArray(rows)||!STORES[store])continue;await writeRows(db,store,rows);restored+=rows.length;}}finally{db.close();}
 status('Restored '+restored+' records from '+file.name+'. Existing matching records were updated; unrelated local records were kept.');return {restored,file};
}
window.AuraFitCloud={cloudConfigured,initCloudAuth,googleSignIn,googleDriveSignIn,cloudSignIn,cloudSignUp,cloudSignOut,syncCloud,backupToGoogleDrive,restoreFromGoogleDrive};
initCloudAuth().catch(e=>status('Cloud setup: '+e.message));
