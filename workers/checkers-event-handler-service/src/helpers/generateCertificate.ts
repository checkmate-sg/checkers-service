import { CERTIFICATE_TEMPLATE } from "./certificateTemplate";

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

interface CertificateData {
  userName: string;
  programmeId: string;
  targets: {
    votes: number;
    accuracy: number;
    reports: number;
  };
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Upload to R2 with retry logic and exponential backoff
 */
async function uploadWithRetry(bucket: R2Bucket, fileName: string, html: string): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await bucket.put(fileName, html, {
        httpMetadata: {
          contentType: "text/html; charset=utf-8",
        },
      });
      return; // Success
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`R2 upload attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`);

      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Generate a certificate HTML file and upload to R2 bucket.
 * Includes retry logic with exponential backoff.
 * Returns the public URL of the certificate.
 */
export async function generateCertificate(
  env: Env,
  data: CertificateData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { userName, programmeId, targets } = data;

    // Format issuance date
    const issuanceDate = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Replace template placeholders
    let html = CERTIFICATE_TEMPLATE;
    html = html.replace(/{{userName}}/g, userName);
    html = html.replace("{{issuanceDate}}", issuanceDate);
    html = html.replace("{{certificateId}}", programmeId);
    html = html.replace("{{numVotesTarget}}", targets.votes.toFixed(0));
    html = html.replace("{{numReportTarget}}", targets.reports.toFixed(0));
    html = html.replace("{{accuracyTarget}}", targets.accuracy.toFixed(0));

    // Upload to R2 bucket with retry
    const fileName = `${programmeId}.html`;
    await uploadWithRetry(env.CERTIFICATES_BUCKET, fileName, html);

    const url = `${env.BUCKET_HOST}/${fileName}`;
    console.log(`Certificate generated and uploaded: ${url}`);

    return { success: true, url };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to generate certificate after retries:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
