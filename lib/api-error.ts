export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiErrorResponse(
  error: unknown,
  message = "Unable to save the video. Please try again.",
) {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  // Do not expose provider responses, database details, or credentials.
  console.error("Video request failed", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return Response.json({ error: message }, { status: 500 });
}

export const submissionErrorResponse = apiErrorResponse;
