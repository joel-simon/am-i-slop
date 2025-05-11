import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  getSubmissionsInRange,
  getSimilarPerplexitySubmissions,
} from "$lib/db/schema";

export const GET: RequestHandler = async ({ params, url }) => {
  try {
    const questionId = parseInt(params.questionId);

    if (isNaN(questionId)) {
      return json({ error: "Invalid question ID" }, { status: 400 });
    }

    // Get query parameters
    const minPerplexity = url.searchParams.get("min");
    const maxPerplexity = url.searchParams.get("max");
    const targetPerplexity = url.searchParams.get("target");
    const percentageRange = url.searchParams.get("range");

    let submissions;

    if (targetPerplexity) {
      // If target perplexity is provided, use percentage range
      const target = parseFloat(targetPerplexity);
      const range = percentageRange ? parseFloat(percentageRange) : 10;

      if (isNaN(target)) {
        return json({ error: "Invalid target perplexity" }, { status: 400 });
      }

      submissions = await getSimilarPerplexitySubmissions(
        questionId,
        target,
        range
      );
    } else if (minPerplexity && maxPerplexity) {
      // If min and max are provided, use absolute range
      const min = parseFloat(minPerplexity);
      const max = parseFloat(maxPerplexity);

      if (isNaN(min) || isNaN(max)) {
        return json({ error: "Invalid perplexity range" }, { status: 400 });
      }

      submissions = await getSubmissionsInRange(questionId, min, max);
    } else {
      return json(
        { error: "Either target perplexity or min/max range must be provided" },
        { status: 400 }
      );
    }

    return json(submissions);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
};
