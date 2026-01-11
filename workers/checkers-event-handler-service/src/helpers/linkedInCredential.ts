interface LinkedInCredentialParams {
  certificateUrl: string;
  programmeId: string;
  completionDate: Date;
  linkedInOrgId: string;
}

/**
 * Generate a LinkedIn URL that launches the interface to add a credential
 * with prepopulated fields for the CheckMate Practitioner certification.
 */
export function generateLinkedInCredentialUrl(params: LinkedInCredentialParams): string {
  const { certificateUrl, programmeId, completionDate, linkedInOrgId } = params;

  // Prepare the issue date components
  const issueYear = completionDate.getFullYear();
  const issueMonth = completionDate.getMonth() + 1; // Months are zero-indexed

  // Encode certificate URL for use in query string
  const certificateUrlEncoded = encodeURIComponent(certificateUrl);

  // Define query parameters
  const queryParams: Record<string, string> = {
    startTask: "CERTIFICATION_NAME",
    name: "CheckMate Practitioner",
    organizationId: linkedInOrgId,
    issueYear: String(issueYear),
    issueMonth: String(issueMonth),
    certId: programmeId,
  };

  // Construct the query string
  const queryString = new URLSearchParams(queryParams).toString();

  // Append certUrl manually (already encoded)
  return `https://www.linkedin.com/profile/add?${queryString}&certUrl=${certificateUrlEncoded}`;
}
