export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Méthode non autorisée"
    });
  }

  try {
    const { prompt, images = [] } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        error: "Le prompt est obligatoire."
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY n'est pas configurée."
      });
    }

    const content = [
      {
        type: "input_text",
        text: prompt
      }
    ];

    for (const image of images) {
      if (
        typeof image === "string" &&
        image.startsWith("data:image/")
      ) {
        content.push({
          type: "input_image",
          image_url: image
        });
      }
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Authorization":
            `Bearer ${process.env.OPENAI_API_KEY}`,

          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          model: "gpt-5.6",
          input: [
            {
              role: "user",
              content
            }
          ],

          tools: [
            {
              type: "image_generation",
              model: "gpt-image-2.5-sunburst",
              quality: "high",
              size: "1024x1536"
            }
          ],

          tool_choice: {
            type: "image_generation"
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "OpenAI error:",
        JSON.stringify(data)
      );

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Erreur lors de la génération."
      });
    }

    const imageCall = data.output?.find(
      item =>
        item.type ===
        "image_generation_call"
    );

    if (!imageCall?.result) {
      console.error(
        "No image returned:",
        JSON.stringify(data)
      );

      return res.status(500).json({
        error:
          "Aucune image n'a été retournée."
      });
    }

    return res.status(200).json({
      image:
        `data:image/png;base64,${imageCall.result}`
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error:
        "Erreur interne pendant la génération."
    });
  }
}
