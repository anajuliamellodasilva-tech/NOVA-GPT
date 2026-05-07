let config = null;


// carregar config
async function carregarConfig() {

  try {

    const res = await fetch("./keys.json", {
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error("keys.json não encontrado");
    }

    config = await res.json();

    console.log("CONFIG OK:", config);

  } catch (err) {

    console.error(err);

    document.getElementById("chat").innerHTML += `
      <div class="msg bot">
        Erro ao carregar keys.json
      </div>
    `;
  }
}

carregarConfig();


// enviar mensagem
async function enviar() {

  const input = document.getElementById("input");
  const chat = document.getElementById("chat");

  const mensagem = input.value.trim();

  if (!mensagem) return;

  // config ainda carregando
  if (!config) {

    chat.innerHTML += `
      <div class="msg bot">
        Config carregando...
      </div>
    `;

    return;
  }

  // mensagem usuário
  chat.innerHTML += `
    <div class="msg user">
      ${mensagem}
    </div>
  `;

  // limpa input
  input.value = "";

  // scroll
  chat.scrollTop = chat.scrollHeight;

  // loading
  const loading = document.createElement("div");

  loading.className = "msg bot";
  loading.innerHTML = "Digitando...";

  chat.appendChild(loading);

  chat.scrollTop = chat.scrollHeight;

  // URL Azure
  const url =
`${config.endpoint}/openai/responses?api-version=${config.apiVersion}`;

  try {

    const res = await fetch(url, {

      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },

      body: JSON.stringify({

        model: config.model,

        input: mensagem,

        max_output_tokens: 1000

      })

    });

    const data = await res.json();

    console.log("RESPOSTA AZURE:");
    console.log(data);

    let resposta = "Sem resposta";

    // formato novo
    if (data.output_text) {

      resposta = data.output_text;

    }

    // formato array
    else if (
      data.output &&
      data.output.length > 0
    ) {

      for (const item of data.output) {

        if (
          item.type === "message" &&
          item.content
        ) {

          for (const content of item.content) {

            if (
              content.type === "output_text" &&
              content.text
            ) {

              resposta = content.text;
              break;
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
        data.choices[0]?.message?.content ||
        "Sem resposta";
    }

    // remove loading
    loading.remove();

    // resposta bot
    chat.innerHTML += `
      <div class="msg bot">
        ${resposta}
      </div>
    `;

    // scroll
    chat.scrollTop = chat.scrollHeight;

  } catch (err) {

    console.error("ERRO:", err);

    loading.remove();

    chat.innerHTML += `
      <div class="msg bot">
        Erro de conexão com Azure
      </div>
    `;

    chat.scrollTop = chat.scrollHeight;
  }
}


// enviar com Enter
document
  .getElementById("input")
  .addEventListener("keypress", function(e) {

    if (e.key === "Enter") {
      enviar();
    }

});