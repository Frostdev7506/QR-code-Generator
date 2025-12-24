const form = document.getElementById("generate-form");
const qr = document.getElementById("qrcode");
const typeSelect = document.getElementById("data-type");
const sizeRange = document.getElementById("size");
const sizeValue = document.getElementById("size-value");
const payloadPreview = document.getElementById("payload-preview");
const statusEl = document.getElementById("status");
const downloadBtn = document.getElementById("download-btn");
const copyPayloadBtn = document.getElementById("copy-payload");
const copyImageBtn = document.getElementById("copy-image");
const resetBtn = document.getElementById("reset-btn");
const autoToggle = document.getElementById("auto-generate");
const placeholder = document.getElementById("qr-placeholder");
const typeGroups = document.querySelectorAll("[data-type-group]");

const debounce = (fn, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
};

const setStatus = (message, tone = "info") => {
  statusEl.textContent = message;
  statusEl.setAttribute("data-tone", tone);
};

const escapeWifi = (value) => value.replace(/([\\;,:\"])/g, "\\$1");

const buildPayload = () => {
  const type = typeSelect.value;

  if (type === "url") {
    return document.getElementById("url").value.trim();
  }

  if (type === "text") {
    return document.getElementById("text").value.trim();
  }

  if (type === "wifi") {
    const ssid = document.getElementById("wifi-ssid").value.trim();
    const password = document.getElementById("wifi-password").value.trim();
    const encryption = document.getElementById("wifi-encryption").value;
    const hidden = document.getElementById("wifi-hidden").checked;

    if (!ssid) return "";

    const hiddenPart = hidden ? "H:true;" : "";
    const passwordPart = password ? `P:${escapeWifi(password)};` : "";

    return `WIFI:T:${encryption};S:${escapeWifi(ssid)};${passwordPart}${hiddenPart};`;
  }

  if (type === "email") {
    const recipient = document.getElementById("email-to").value.trim();
    const subject = document.getElementById("email-subject").value.trim();
    const body = document.getElementById("email-body").value.trim();

    if (!recipient) return "";

    const params = new URLSearchParams();
    if (subject) params.append("subject", subject);
    if (body) params.append("body", body);

    const query = params.toString();
    return query ? `mailto:${recipient}?${query}` : `mailto:${recipient}`;
  }

  if (type === "sms") {
    const number = document.getElementById("sms-number").value.trim();
    const message = document.getElementById("sms-message").value.trim();

    if (!number) return "";

    return message ? `SMSTO:${number}:${message}` : `SMSTO:${number}`;
  }

  if (type === "phone") {
    const number = document.getElementById("phone-number").value.trim();
    return number ? `tel:${number}` : "";
  }

  return "";
};

const updatePayloadPreview = () => {
  const payload = buildPayload();
  payloadPreview.textContent = payload || "Add content to see the payload preview.";
};

const updateSizeLabel = () => {
  sizeValue.textContent = `${sizeRange.value}px`;
};

const updateTypeVisibility = () => {
  const currentType = typeSelect.value;
  typeGroups.forEach((group) => {
    const groupType = group.getAttribute("data-type-group");
    group.classList.toggle("hidden", groupType !== currentType);
  });
};

const getQrImageUrl = () => {
  const img = qr.querySelector("img");
  const canvas = qr.querySelector("canvas");

  if (img && img.src) return img.src;
  if (canvas) return canvas.toDataURL("image/png");

  return "";
};

const setDownloadState = (url) => {
  if (!url) {
    downloadBtn.classList.add("is-disabled");
    downloadBtn.setAttribute("aria-disabled", "true");
    downloadBtn.removeAttribute("href");
    return;
  }

  downloadBtn.classList.remove("is-disabled");
  downloadBtn.setAttribute("aria-disabled", "false");
  downloadBtn.setAttribute("href", url);
};

const clearQRCode = () => {
  qr.replaceChildren(placeholder);
  setDownloadState("");
};

const generateQRCode = (payload) => {
  clearQRCode();

  if (typeof QRCode === "undefined") {
    setStatus("QR library still loading. Try again in a moment.", "error");
    return;
  }

  const size = Number.parseInt(sizeRange.value, 10);
  const colorDark = document.getElementById("color-dark").value;
  const colorLight = document.getElementById("color-light").value;
  const correction = document.getElementById("error-level").value;

  const options = {
    text: payload,
    width: size,
    height: size,
    colorDark,
    colorLight,
    correctLevel: QRCode.CorrectLevel[correction] || QRCode.CorrectLevel.M,
  };

  qr.replaceChildren();
  new QRCode(qr, options);

  const url = getQrImageUrl();
  setDownloadState(url);
  setStatus("QR code ready to download.", "success");
};

const validatePayload = (payload) => {
  if (!payload) {
    setStatus("Add content to generate a QR code.", "error");
    return false;
  }
  return true;
};

const handleGenerate = () => {
  const payload = buildPayload();
  updatePayloadPreview();

  if (!validatePayload(payload)) return;

  setStatus("Generating QR code...", "info");
  generateQRCode(payload);
};

const handleCopyPayload = async () => {
  const payload = buildPayload();
  if (!payload) {
    setStatus("Add content before copying the payload.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(payload);
    setStatus("Payload copied to clipboard.", "success");
  } catch (error) {
    setStatus("Clipboard access failed.", "error");
  }
};

const handleCopyImage = async () => {
  if (!navigator.clipboard || !window.ClipboardItem) {
    setStatus("Image copy is not supported in this browser.", "error");
    return;
  }

  const canvas = qr.querySelector("canvas");
  if (!canvas) {
    setStatus("Generate a QR code before copying.", "error");
    return;
  }

  canvas.toBlob(async (blob) => {
    if (!blob) {
      setStatus("Unable to export QR image.", "error");
      return;
    }

    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setStatus("QR image copied to clipboard.", "success");
    } catch (error) {
      setStatus("Clipboard access failed.", "error");
    }
  });
};

const handleReset = () => {
  form.reset();
  updateTypeVisibility();
  updateSizeLabel();
  updatePayloadPreview();
  setStatus("Form reset. Ready for a new QR code.", "info");
  clearQRCode();
};

const handleFormInput = debounce(() => {
  updatePayloadPreview();
  if (autoToggle.checked) {
    handleGenerate();
  }
}, 200);

if (!navigator.clipboard || !window.ClipboardItem) {
  copyImageBtn.classList.add("is-disabled");
  copyImageBtn.textContent = "Copy image (unsupported)";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  handleGenerate();
});

form.addEventListener("input", handleFormInput);

typeSelect.addEventListener("change", () => {
  updateTypeVisibility();
  updatePayloadPreview();
});

sizeRange.addEventListener("input", updateSizeLabel);
copyPayloadBtn.addEventListener("click", handleCopyPayload);
copyImageBtn.addEventListener("click", handleCopyImage);
resetBtn.addEventListener("click", handleReset);

updateTypeVisibility();
updateSizeLabel();
updatePayloadPreview();
setStatus("Ready to generate your first QR code.", "info");
clearQRCode();
