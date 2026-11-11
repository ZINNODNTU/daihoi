/** Public policy value for *initial* delegate accounts and admin resets only.
 * Never use this as proof of someone's current password after they change it.
 * Keep the real password exclusively inside Supabase Auth; do not persist it in logs.
 */
export const DEFAULT_DELEGATE_PASSWORD="Abc@123456";
