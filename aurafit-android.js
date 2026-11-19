import { Capacitor } from 'https://esm.sh/@capacitor/core@7';
const $=id=>document.getElementById(id);
const apiBase=()=>String(window.AURAFIT_CONFIG?.apiBaseUrl||'').replace(/\/$/,'');
window.AuraFitPlatform={isNative:()=>Capacitor.isNativePlatform(),apiUrl:path=>`${apiBase()}${path}`};
for(const [id,fn] of [['cloudSignUp',()=>window.AuraFitCloud.cloudSignUp($('cloudEmail').value,$('cloudPassword').value)],['cloudSignIn',()=>window.AuraFitCloud.cloudSignIn($('cloudEmail').value,$('cloudPassword').value)],['cloudSignOut',()=>window.AuraFitCloud.cloudSignOut()],['cloudSync',()=>window.AuraFitCloud.syncCloud()]]){
 $(id)?.addEventListener('click',async()=>{const b=$(id);b.disabled=true;try{const result=await fn();$('cloudSyncStatus').textContent=id==='cloudSync'?`Sync finished: ${result.pushed} uploaded, ${result.pulled} downloaded.`:'Account action completed.';}catch(e){$('cloudSyncStatus').textContent=e.message||'Cloud action failed.';}finally{b.disabled=false;}});
}
