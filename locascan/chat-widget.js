const chatLauncher = document.querySelector("#chat-widget-launcher");
const chatWidgetPanel = document.querySelector("#chat-widget-panel");
const chatWidgetFrame = document.querySelector("#chat-widget-frame");
const chatWidgetClose = document.querySelector("#chat-widget-close");
let pointerStart = null;
let dragMoved = false;
let suppressClick = false;

function setChatOpen(open) {
  chatWidgetPanel.hidden = !open;
  chatLauncher.setAttribute("aria-expanded", String(open));
  chatLauncher.setAttribute(
    "aria-label",
    open ? "Close Ask LocaScan chat" : "Open Ask LocaScan chat"
  );

  if (open && !chatWidgetFrame.src) {
    chatWidgetFrame.src = "chat.html?embedded=1";
  }
  if (open) chatWidgetClose.focus();
  else chatLauncher.focus();
}

chatLauncher.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  const bounds = chatLauncher.getBoundingClientRect();
  pointerStart = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    left: bounds.left,
    top: bounds.top
  };
  dragMoved = false;
  chatLauncher.setPointerCapture(event.pointerId);
});

chatLauncher.addEventListener("pointermove", (event) => {
  if (!pointerStart || pointerStart.pointerId !== event.pointerId) return;
  const deltaX = event.clientX - pointerStart.x;
  const deltaY = event.clientY - pointerStart.y;
  if (!dragMoved && Math.hypot(deltaX, deltaY) < 6) return;

  dragMoved = true;
  const left = Math.max(8, Math.min(window.innerWidth - chatLauncher.offsetWidth - 8, pointerStart.left + deltaX));
  const top = Math.max(8, Math.min(window.innerHeight - chatLauncher.offsetHeight - 8, pointerStart.top + deltaY));
  chatLauncher.style.left = `${left}px`;
  chatLauncher.style.top = `${top}px`;
  chatLauncher.style.right = "auto";
  chatLauncher.style.bottom = "auto";
});

chatLauncher.addEventListener("pointerup", (event) => {
  if (!pointerStart || pointerStart.pointerId !== event.pointerId) return;
  if (dragMoved) {
    suppressClick = true;
    window.setTimeout(() => {
      suppressClick = false;
    }, 0);
  }
  pointerStart = null;
});

chatLauncher.addEventListener("pointercancel", () => {
  pointerStart = null;
});

chatLauncher.addEventListener("click", () => {
  if (suppressClick) return;
  setChatOpen(chatWidgetPanel.hidden);
});

chatWidgetClose.addEventListener("click", () => {
  setChatOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !chatWidgetPanel.hidden) {
    setChatOpen(false);
  }
});

window.addEventListener("resize", () => {
  if (!chatLauncher.style.left || !chatLauncher.style.top) return;
  const left = Math.min(window.innerWidth - chatLauncher.offsetWidth - 8, Number.parseFloat(chatLauncher.style.left));
  const top = Math.min(window.innerHeight - chatLauncher.offsetHeight - 8, Number.parseFloat(chatLauncher.style.top));
  chatLauncher.style.left = `${Math.max(8, left)}px`;
  chatLauncher.style.top = `${Math.max(8, top)}px`;
});
