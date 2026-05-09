let config = null;
let enviando = false;
let audioAtual = null;

// ===========================
// CONFIG
// ===========================
async function carregarConfig() {
  try {
    const res = await fetch("./keys.json", { cache: "no-store" });

    if (!res.ok) throw new Error("Erro config");

    config = await res.json();

    console.log("CONFIG OK");

  } catch (err) {
    console.error(err);
    adicionarMensagem("Erro ao carregar config", "bot");
  }
}

carregarConfig();

// ===========================
// CHAT
// ===========================
function adicionarMensagem(texto, tipo) {
  const chat = document.getElementById("chat");

  const div = document.createElement("div");
  div.className = `msg ${tipo}`;
  div.innerHTML = texto;

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// ===========================
// ENVIAR (TEXT + VOZ)
// ===========================
async function enviar() {

  if (enviando) return;

  const input = document.getElementById("input");
  const provider = document.getElementById("provider").value;

  const mensagem = input.value.trim();
  if (!mensagem) return;

  if (!config) {
    adicionarMensagem("Carregando config...", "bot");
    return;
  }

  enviando = true;

  adicionarMensagem(mensagem, "user");
  input.value = "";

  adicionarMensagem("Digitando...", "bot");

  const loading = document.querySelectorAll(".bot");
  const last = loading[loading.length - 1];

  let resposta = "";

  // ===========================
  // 🔥 DATA REAL DO SISTEMA (TRAVADA)
  // ===========================
  const agora = new Date();

  const dataHora = agora.toLocaleString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

  try {

    // ===========================
    // AZURE
    // ===========================
    if (provider === "azure") {

      const url = `${config.azure.endpoint}/openai/responses?api-version=${config.azure.apiVersion}`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": config.azure.apiKey
        },
        body: JSON.stringify({
          model: config.azure.model,
          input: mensagem,
          max_output_tokens: 500,

          instructions:
            "Você é um assistente chamado NovaGPT. Responda em português, curto e natural. " +
            "DATA OFICIAL DO SISTEMA: " + dataHora + ". " +
            "NUNCA invente datas, anos ou dia da semana. Use apenas essa data como verdade."
        })
      });

      const data = await res.json();

      console.log("AZURE:", data);

      let texto = "";

      if (data?.output) {
        for (const item of data.output) {
          if (item?.content) {
            for (const c of item.content) {
              if (c?.text) texto += c.text;
            }
          }
        }
      }

      resposta =
        texto ||
        data?.output_text ||
        data?.choices?.[0]?.message?.content ||
        "Sem resposta";

      if (data?.error) {
        resposta = "Erro Azure: " + data.error.message;
      }
    }

    // ===========================
    // GEMINI
    // ===========================
    else if (provider === "gemini") {

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text:
                "DATA OFICIAL DO SISTEMA: " + dataHora +
                "\n\n" + mensagem +
                "\n\nNUNCA invente data, ano ou dia da semana. Use apenas a data informada."
            }]
          }]
        })
      });

      const data = await res.json();

      console.log("GEMINI:", data);

      resposta =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sem resposta";

      if (data?.error) {
        resposta = "Erro Gemini: " + data.error.message;
      }
    }

    if (last) last.remove();

    adicionarMensagem(resposta, "bot");

    falarTexto(resposta);

  } catch (err) {
    console.error(err);

    if (last) last.remove();

    adicionarMensagem("Erro de conexão", "bot");

  } finally {
    enviando = false;
  }
}

// ===========================
// VOZ (TTS)
// ===========================
async function falarTexto(texto) {

  try {

    if (!config?.azureSpeech) return;

    if (audioAtual) {
      audioAtual.pause();
      audioAtual = null;
    }

    const ssml = `
<speak version='1.0' xml:lang='pt-BR'>
  <voice name='${config.azureSpeech.voice}'>
    ${texto}
  </voice>
</speak>`;

    const res = await fetch(config.azureSpeech.endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": config.azureSpeech.apiKey,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": config.azureSpeech.audioFormat
      },
      body: ssml
    });

    const blob = await res.blob();

    const url = URL.createObjectURL(blob);

    audioAtual = new Audio(url);

    await audioAtual.play();

  } catch (err) {
    console.error("TTS erro:", err);
  }
}

// ===========================
// MICROFONE
// ===========================
let reconhecimento;
let gravando = false;

function ativarVoz() {

  const btn = document.getElementById("btn-voz");

  if (!("webkitSpeechRecognition" in window)) {
    adicionarMensagem("Sem suporte de voz", "bot");
    return;
  }

  if (gravando) {
    reconhecimento.stop();
    return;
  }

  reconhecimento = new webkitSpeechRecognition();

  reconhecimento.lang = "pt-BR";
  reconhecimento.continuous = true;
  reconhecimento.interimResults = true;

  gravando = true;

  btn.innerHTML = "⏹️";
  btn.style.background = "#ff0000";

  reconhecimento.start();

  reconhecimento.onresult = (event) => {
    let texto = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      texto += event.results[i][0].transcript;
    }

    document.getElementById("input").value = texto;
  };

  reconhecimento.onend = async () => {

    gravando = false;

    btn.innerHTML = "🎤";
    btn.style.background = "#6c5ce7";

    const texto = document.getElementById("input").value.trim();

    if (texto) await enviar();
  };

  reconhecimento.onerror = () => {

    gravando = false;

    btn.innerHTML = "🎤";
    btn.style.background = "#6c5ce7";

    adicionarMensagem("Erro no microfone", "bot");
  };
}