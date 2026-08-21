export type OpenAIContent =
  | {
      type: "input_text";
      text: string;
    }
  | {
      type: "input_image";
      image_url: string;
    }
  | {
      type: "input_file";
      file_id: string;
    };

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

const OPENAI_API_BASE =
  process.env.OPENAI_API_BASE ||
  "https://api.openai.com/v1";

export function getOpenAIModel() {
  return (
    process.env.OPENAI_MODEL ||
    "gpt-5-mini"
  );
}

function getOpenAIKey() {
  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured on the server."
    );
  }

  return apiKey;
}

export async function uploadOpenAIFile(
  file: File
) {
  const apiKey = getOpenAIKey();
  const formData = new FormData();

  formData.append("purpose", "user_data");
  formData.append("file", file, file.name);

  const response = await fetch(
    `${OPENAI_API_BASE}/files`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        "Unable to upload file to OpenAI."
    );
  }

  if (typeof data.id !== "string") {
    throw new Error(
      "OpenAI did not return an uploaded file id."
    );
  }

  return data.id as string;
}

export async function deleteOpenAIFile(
  fileId: string
) {
  const apiKey = getOpenAIKey();

  await fetch(
    `${OPENAI_API_BASE}/files/${fileId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  ).catch(() => undefined);
}

export async function createOpenAITextResponse(
  content: OpenAIContent[]
) {
  const apiKey = getOpenAIKey();

  const response = await fetch(
    `${OPENAI_API_BASE}/responses`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getOpenAIModel(),
        input: [
          {
            role: "user",
            content,
          },
        ],
      }),
    }
  );

  const data =
    (await response.json()) as OpenAIResponse;

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
        "The AI request failed."
    );
  }

  if (data.output_text) {
    return data.output_text;
  }

  const text = data.output
    ?.flatMap((item) => item.content || [])
    .map((item) => item.text || "")
    .join("\n")
    .trim();

  if (!text) {
    throw new Error(
      "The AI response did not include text output."
    );
  }

  return text;
}
