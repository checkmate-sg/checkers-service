/**
 * Get the number of messages reported by a checker to the WhatsApp service.
 * Used for programme progress tracking.
 */
export async function getReportCount(
  env: CloudflareEnv,
  whatsappId: string,
  fromDate?: Date
): Promise<{ count: number; error?: string }> {
  try {
    if (!env.WHATSAPP_CHECKER_HANDLER_SERVICE) {
      console.warn("WHATSAPP_CHECKER_HANDLER_SERVICE not available");
      throw new Error("Service not available");
    }

    const result = await env.WHATSAPP_CHECKER_HANDLER_SERVICE.checkUserReports(
      whatsappId,
      fromDate
    );

    return { count: result.count };
  } catch (err) {
    // Mock data for local development
    if (process.env.NODE_ENV === "development") {
      return { count: 2 };
    }
    const error = err instanceof Error ? err.message : "Unknown error";
    console.error(`Failed to get report count: ${error}`);
    return { count: 0, error };
  }
}
