/**
 * Wraps env.WHATSAPP_CHECKER_HANDLER_SERVICE.checkUser so local dev doesn't
 * crash when the whatsapp-checker-event-handler worker isn't running.
 * In local, treat every user as already existing in the WhatsApp service.
 */
export async function checkWhatsAppUser(
  env: Env,
  whatsappId: string | null
): Promise<{ exists: boolean }> {
  if (!whatsappId) {
    return { exists: false };
  }
  if (env.ENVIRONMENT === "local") {
    return { exists: true };
  }
  return env.WHATSAPP_CHECKER_HANDLER_SERVICE.checkUser(whatsappId);
}
