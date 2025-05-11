import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { storeTextSubmission } from "$lib/db/schema";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { text, perplexity, questionId } = await request.json();

    if (
      !text ||
      typeof perplexity !== "number" ||
      typeof questionId !== "number"
    ) {
      return json(
        { error: "Invalid input. Required: text, perplexity, questionId" },
        { status: 400 }
      );
    }

    const submission = await storeTextSubmission(text, perplexity, questionId);
    return json(submission);
  } catch (error) {
    console.error("Error storing submission:", error);
    return json({ error: "Failed to store submission" }, { status: 500 });
  }
};
