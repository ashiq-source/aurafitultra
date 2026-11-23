/* AuraFit AI Ultra Android bridge.
 * Cloud controls are wired once by aurafit-ultra-app.js. Do not attach duplicate
 * listeners here: duplicate OAuth calls can overwrite the Supabase PKCE verifier.
 */
export const androidBridgeReady = true;
