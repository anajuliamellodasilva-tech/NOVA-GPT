let config = null;

// carregar config
async function carregarConfig() {

  try {

    const res = await fetch("./keys.json", {
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error("Erro ao carregar keys.json");
    }

    config = await res.json();

    console.log("CONFIG:", config);

  } catch (err) {

    console.error(err);

    adicionarMensagem(
      "Erro ao carregar keys.json",
      "bot"
    );
  }
}

carregarConfig();


// adicionar mensagem
function adicionarMensagem(texto, tipo) {

  const chat =
    document.getElementById("chat");

  chat.innerHTML += `
    <div class="msg ${tipo}">
      ${texto}
    </div>
  `;

  chat.scrollTop =
    chat.scrollHeight;
}


// ENTER envia
document.addEventListener("DOMContentLoaded", () => {

  const input =
    document.getElementById("input");

  input.addEventListener("keydown", (e) => {

    if (e.key === "Enter") {
      enviar();
    }
  });
});


// enviar
async function enviar() {

  const input =
    document.getElementById("input");

  const providerEl =
    document.getElementById("provider");

  // compatível com html antigo e novo
  const provider =
    providerEl ? providerEl.value : "azure";

  const mensagem =
    input.value.trim();

  if (!mensagem) return;

  // config
  if (!config) {

    adicionarMensagem(
      "Config carregando...",
      "bot"
    );

    return;
  }

  // usuário
  adicionarMensagem(
    `Você: ${mensagem}`,
    "user"
  );

  input.value = "";

  // loading
  adicionarMensagem(
    "Digitando...",
    "bot"
  );

  const loading =
    document.querySelectorAll(".bot");

  const ultimoLoading =
    loading[loading.length - 1];

  let resposta = "Sem resposta";

  try {

    // =================================
    // AZURE / CHATGPT
    // =================================
    if (provider === "azure") {

      const url =
        `${config.azure.endpoint}/openai/responses?api-version=${config.azure.apiVersion}`;

      const res = await fetch(url, {

        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "api-key": config.azure.apiKey
        },

        body: JSON.stringify({
          model: config.azure.model,
          input: mensagem,
          max_output_tokens: 500
        })
      });

      const data = await res.json();

      console.log("AZURE:");
      console.log(data);

      // responses api
      if (data.output) {

        for (const item of data.output) {

          if (
            item.type === "message" &&
            item.content
          ) {

            for (const content of item.content) {

              if (
                content.type === "output_text"
              ) {

                resposta =
                  content.text;
              }
            }
          }
        }
      }

      // fallback antigo
      else if (
        data.choices &&
        data.choices.length > 0
      ) {

        resposta =
          data.choices[0]
          ?.message
          ?.content ||
          "Sem resposta";
      }

      // erro
      if (data.error) {

        resposta =
          "Erro Azure: " +
          data.error.message;
      }
    }

    // =================================
    // GEMINI
    // =================================
    else if (provider === "gemini") {

      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;

      const res = await fetch(url, {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: mensagem
                }
              ]
            }
          ]
        })
      });

      const data = await res.json();

      console.log("GEMINI:");
      console.log(JSON.stringify(data, null, 2));

      // resposta
      if (
        data.candidates &&
        data.candidates.length > 0
      ) {

        resposta =
          data.candidates[0]
          ?.content
          ?.parts?.[0]
          ?.text ||
          "Sem resposta";
      }

      // erro
      if (data.error) {

        resposta =
          "Erro Gemini: " +
          data.error.message;
      }
    }

    // remove loading
    if (ultimoLoading) {
      ultimoLoading.remove();
    }

    // resposta final
    adicionarMensagem(
      `Bot: ${resposta}`,
      "bot"
    );

  } catch (err) {

    console.error(err);

    if (ultimoLoading) {
      ultimoLoading.remove();
    }

    adicionarMensagem(
      "Erro de conexão",
      "bot"
    );
  }
}