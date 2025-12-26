# Checkers Webhook Service

Cloudflare Worker handling webhooks for the CheckMate Checkers platform.

## Endpoints

### POST /polls/webhook

Creates a new poll and dispatches vote requests to all active checkers.

#### Authentication

Requires API key in header:
```
x-api-key: <API_KEY>
```

For service binding calls from other Cloudflare Workers, include the same header.

#### Request

```http
POST /polls/webhook
Content-Type: application/json
x-api-key: <API_KEY>
```

**Body:**

```json
{
  "checkId": "string (required) - Unique identifier from CheckMate platform",
  "text": "string | null - Text content to be checked (mutually exclusive with imageUrl)",
  "imageUrl": "string | null - Image URL to be checked (mutually exclusive with text)",
  "caption": "string | null - Caption for image content",
  "longformResponse": {
    "en": "string | null - English long-form AI response",
    "cn": "string | null - Chinese long-form AI response",
    "links": "string[] | null - Supporting reference links",
    "timestamp": "string | null - ISO timestamp of response generation"
  },
  "shortformResponse": {
    "en": "string | null - English short-form AI response",
    "cn": "string | null - Chinese short-form AI response",
    "links": "string[] | null - Supporting reference links",
    "timestamp": "string | null - ISO timestamp",
    "downvoted": "boolean - Whether response was downvoted (default: false)"
  },
  "humanResponse": {
    "en": "string | null - English human-written response",
    "cn": "string | null - Chinese human-written response",
    "links": "string[] | null - Supporting reference links",
    "timestamp": "string | null - ISO timestamp",
    "updatedBy": "string | null - Identifier of human who wrote response"
  }
}
```

**Required fields:** `checkId`

**Validation rules:**
- `text` and `imageUrl` are mutually exclusive - both can be present in the request but only one can have a truthy value (the other must be `null` or omitted)

#### Responses

**Success (200):**
```json
{
  "message": "Poll created successfully",
  "id": "string - MongoDB ObjectId of created poll"
}
```

**Conflict (409) - Poll already exists:**
```json
{
  "error": "Poll with this checkId already exists",
  "id": "string - ID of existing poll"
}
```

**Bad Request (400):**
```json
{
  "error": "Missing 'checkId'"
}
```
```json
{
  "error": "Cannot provide both 'text' and 'imageUrl' - they are mutually exclusive"
}
```

**Unauthorized (401):**
```json
{
  "error": "Unauthorized"
}
```

**Server Error (500):**
```json
{
  "error": "Failed to create poll"
}
```

#### Example

```bash
curl -X POST https://checkers-webhook-service-production.<subdomain>.workers.dev/polls/webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "checkId": "check_abc123",
    "text": "Forward this to 10 people or bad luck for 7 years!",
    "shortformResponse": {
      "en": "This appears to be a chain message with no factual basis.",
      "cn": null,
      "links": [],
      "timestamp": "2024-01-15T10:30:00Z",
      "downvoted": false
    }
  }'
```

#### Service Binding Usage

From another Cloudflare Worker with a service binding to `checkers-webhook-service`:

```typescript
// wrangler.jsonc
{
  "services": [
    {
      "binding": "CHECKERS_WEBHOOK_SERVICE",
      "service": "checkers-webhook-service-production"
    }
  ]
}
```

```typescript
// In your worker code
const response = await env.CHECKERS_WEBHOOK_SERVICE.fetch(
  new Request("https://internal/polls/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.API_KEY,
    },
    body: JSON.stringify({
      checkId: "check_abc123",
      text: "Is this message legitimate?",
      shortformResponse: {
        en: "AI-generated response here",
        cn: null,
        links: ["https://example.com/source"],
        timestamp: new Date().toISOString(),
        downvoted: false,
      },
    }),
  })
);

if (!response.ok) {
  const error = await response.json();
  console.error("Failed to create poll:", error);
  return;
}

const result = await response.json();
console.log("Poll created with ID:", result.id);
```

#### Behavior

When a poll is created:
1. Poll record is inserted into the database
2. All active, onboarded checkers are fetched
3. A vote request is created for each checker
4. Telegram notification with "Vote" button is sent to each checker

---

## Other Endpoints

### GET /
Health check endpoint.

### POST /telegram
Telegram bot webhook for handling bot commands and callbacks.

### POST /typeform
Typeform webhook for quiz completion during onboarding.
