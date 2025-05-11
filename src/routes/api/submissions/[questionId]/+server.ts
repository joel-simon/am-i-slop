import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getSubmissionsForQuestion } from "$lib/db/schema";

export const GET: RequestHandler = async ({ params }) => {
  try {
    const questionId = parseInt(params.questionId);

    if (isNaN(questionId)) {
      return json({ error: "Invalid question ID" }, { status: 400 });
    }

    const submissions = await getSubmissionsForQuestion(questionId);
    return json(submissions);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
};
