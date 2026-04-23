function send() {
  const input = document.getElementById("input");
  const chat = document.getElementById("chat");

  let text = input.value;
  if (!text) return;

  chat.innerHTML += `<div class="msg user">${text}</div>`;
  input.value = "";

  setTimeout(() => {
    chat.innerHTML += `<div class="msg bot">Resposta do NovaGPT 🤖</div>`;
    chat.scrollTop = chat.scrollHeight;
  }, 500);
}