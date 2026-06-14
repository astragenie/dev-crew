// @ts-nocheck — scripts/linear-sync/ is outside tsc rootDir; Bun runs directly.

import type { LinearWebhookPayload, LinearCommentData, CrewMention } from "./linear-types.mjs";
import { parseMention } from "./mention-parser.mjs";

/**
 * Route an inbound Linear webhook payload to a CrewMention action.
 *
 * Currently handles:
 *   - Comment / create: extract `@crew <cmd>` mention from comment body.
 *   - Issue / update: placeholder — assignment-to-crew-bot detection is a
 *     follow-on slice concern; returns null for now.
 *
 * All other payload types return null without throwing.
 */
export function handleLinearWebhook(payload: LinearWebhookPayload): CrewMention | null {
  if (payload.type === "Comment" && payload.action === "create") {
    const data = payload.data as LinearCommentData;
    if (data.body && data.issue) {
      return parseMention(data.body, data.issue.id, data.issue.identifier);
    }
  }
  if (payload.type === "Issue" && payload.action === "update") {
    // Detect assignment to crew bot — placeholder for future implementation.
    return null;
  }
  return null;
}
