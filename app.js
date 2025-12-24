const inputs = {
  x: document.getElementById("input-x"),
  y: document.getElementById("input-y"),
  Y: document.getElementById("input-Y"),
};
const validation = document.getElementById("validation");
const outputHex = document.getElementById("output-hex");
const swatch = document.getElementById("swatch");
const copyButton = document.getElementById("copy");
const copyStatus = document.getElementById("copy-status");

const copyTimeoutMs = 2400;
let copyTimer = null;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizeY = (value) => {
  if (value <= 1) {
    return value;
  }
  return value / 100;
};

const gammaCorrect = (value) => {
  if (value <= 0.0031308) {
    return 12.92 * value;
  }
  return 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
};

const toHex = (value) => {
  const rounded = Math.round(clamp(value, 0, 1) * 255);
  return rounded.toString(16).padStart(2, "0").toUpperCase();
};

const xyyToHex = (x, y, Y) => {
  const normalizedY = normalizeY(Y);
  const X = (x * normalizedY) / y;
  const Z = ((1 - x - y) * normalizedY) / y;

  const rLinear = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
  const gLinear = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
  const bLinear = 0.0557 * X - 0.204 * Y + 1.057 * Z;

  const r = gammaCorrect(clamp(rLinear, 0, 1));
  const g = gammaCorrect(clamp(gLinear, 0, 1));
  const b = gammaCorrect(clamp(bLinear, 0, 1));

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const parseValue = (input) => {
  const value = Number.parseFloat(input.value);
  return Number.isFinite(value) ? value : null;
};

const validate = (x, y, Y) => {
  if (x === null || y === null || Y === null) {
    return "すべての値を入力してください。";
  }
  if (x <= 0 || x >= 1 || y <= 0 || y >= 1) {
    return "x, y は 0〜1 の範囲で入力してください。";
  }
  if (Y < 0) {
    return "Y は 0 以上で入力してください。";
  }
  if (Y > 100) {
    return "Y は 0〜100 または 0〜1 の範囲で入力してください。";
  }
  return "";
};

const updateOutput = () => {
  const x = parseValue(inputs.x);
  const y = parseValue(inputs.y);
  const Y = parseValue(inputs.Y);
  const message = validate(x, y, Y);

  if (message) {
    validation.textContent = message;
    outputHex.value = "-";
    swatch.style.background = "#ffffff";
    return;
  }

  validation.textContent = "";
  const hex = xyyToHex(x, y, Y);
  outputHex.value = hex;
  swatch.style.background = hex;
};

const copyHex = async () => {
  const value = outputHex.value;
  if (!value || value === "-") {
    copyStatus.textContent = "先に有効な値を入力してください。";
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    copyStatus.textContent = `${value} をコピーしました。`;
  } catch (error) {
    const temp = document.createElement("textarea");
    temp.value = value;
    temp.style.position = "fixed";
    temp.style.left = "-9999px";
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
    copyStatus.textContent = `${value} をコピーしました。`;
  }

  if (copyTimer) {
    window.clearTimeout(copyTimer);
  }
  copyTimer = window.setTimeout(() => {
    copyStatus.textContent = "";
  }, copyTimeoutMs);
};

Object.values(inputs).forEach((input) => {
  input.addEventListener("input", updateOutput);
});

copyButton.addEventListener("click", copyHex);

updateOutput();
