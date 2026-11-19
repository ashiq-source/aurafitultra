import { Capacitor } from 'https://esm.sh/@capacitor/core@7';
const $=id=>document.getElementById(id);
const status=m=>{const el=$('cloudSyncStatus');if(el)el.textContent=m;};
const actions=[
 ['cloudGoogleSignIn',()=>window.AuraFitCloud.googleSignIn()],
 ['cloudSignUp',()=>window.AuraFitCloud.cloudSignUp($('cloudEmail').value,$('cloudPassword').value)],
 ['cloudSignIn',()=>window.AuraFitCloud.cloudSignIn($('cloudEmail').value,$('cloudPassword').value)],
 ['cloudSignOut',()=>window.AuraFitCloud.cloudSignOut()],
 ['cloudSync',()=>window.AuraFitCloud.syncCloud()],
 ['driveBackup',()=>window.AuraFitCloud.backupToGoogleDrive()],
 ['driveRestore',()=>window.AuraFitCloud.restoreFromGoogleDrive()]
];
for(const [id,fn] of actions){$(id)?.addEventListener('click',async()=>{const button=$(id);button.disabled=true;try{const result=await fn();if(id==='cloudSync')status('Sync complete: '+result.pushed+' uploaded, '+result.pulled+' downloaded.');else if(id==='driveBackup')status('Google Drive backup completed: '+result.name);else if(id==='driveRestore')status('Google Drive restore completed: '+result.restored+' records.');else if(id==='cloudSignOut')status('Signed out. Your local data remains on this device.');else if(id==='cloudSignUp')status('Account request sent. Check your email if confirmation is required.');else if(id==='cloudSignIn')status('Signed in. You can now sync your records.');}catch(error){status(error.message||'Cloud action failed.');}finally{button.disabled=false;}});}
