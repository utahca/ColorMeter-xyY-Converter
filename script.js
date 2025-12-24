const inputs = {
  x: document.getElementById('input-x'),
  y: document.getElementById('input-y'),
  Y: document.getElementById('input-Y')
};
const bulkInput = document.getElementById('bulk-input');
const convertButton = document.getElementById('convert');
const copyButton = document.getElementById('copy');
const hexValue = document.getElementById('hex-value');
const swatch = document.getElementById('swatch');
const status = document.getElementById('status');

const STORAGE_KEY = 'xyy-last-values';

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);

const formatHex = (value) => value.toString(16).padStart(2, '0').toUpperCase();

const xyYToXYZ = (x, y, Y) => {
  if (y === 0) {
    return { X: 0, Y: 0, Z: 0 };
  }
  const X = (x / y) * Y;
  const Z = ((1 - x - y) / y) * Y;
  return { X, Y, Z };
};

const xyzToSRGB = ({ X, Y, Z }) => {
  const rLinear = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
  const gLinear = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
  const bLinear = X * 0.0557 + Y * -0.2040 + Z * 1.0570;

  const gamma = (channel) => {
    if (channel <= 0.0031308) {
      return 12.92 * channel;
    }
    return 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
  };

  return {
    r: clamp(gamma(rLinear)),
    g: clamp(gamma(gLinear)),
    b: clamp(gamma(bLinear))
  };
};

const toHex = ({ r, g, b }) => {
  const rByte = Math.round(r * 255);
  const gByte = Math.round(g * 255);
  const bByte = Math.round(b * 255);
  return `#${formatHex(rByte)}${formatHex(gByte)}${formatHex(bByte)}`;
};

const updateStatus = (message) => {
  status.textContent = message;
};

const parseBulkInput = (text) => {
  const tokens = text.trim().split(/[\s,]+/).filter(Boolean);
  if (tokens.length < 3) {
    return null;
  }
  const [x, y, Y] = tokens.slice(0, 3).map((value) => Number.parseFloat(value));
  if (![x, y, Y].every(Number.isFinite)) {
    return null;
  }
  return { x, y, Y };
};

const applyValues = ({ x, y, Y }) => {
  inputs.x.value = x;
  inputs.y.value = y;
  inputs.Y.value = Y;
};

const readValues = () => ({
  x: Number.parseFloat(inputs.x.value),
  y: Number.parseFloat(inputs.y.value),
  Y: Number.parseFloat(inputs.Y.value)
});

const valuesAreValid = ({ x, y, Y }) => Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(Y);

const saveValues = (values, hex) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...values, hex }));
};

const loadValues = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const applyResult = (hex) => {
  hexValue.textContent = hex;
  swatch.style.background = hex;
  copyButton.disabled = false;
};

const convert = () => {
  const values = readValues();
  if (!valuesAreValid(values)) {
    updateStatus('x, y, Y の値を入力してください。');
    return;
  }

  const { X, Y, Z } = xyYToXYZ(values.x, values.y, values.Y);
  const rgb = xyzToSRGB({ X, Y, Z });
  const hex = toHex(rgb);

  applyResult(hex);
  saveValues(values, hex);
  updateStatus('変換結果を保存しました。');
};

const copyHex = async () => {
  const hex = hexValue.textContent;
  try {
    await navigator.clipboard.writeText(hex);
    updateStatus(`${hex} をコピーしました。`);
  } catch (error) {
    updateStatus('コピーできませんでした。手動でコピーしてください。');
  }
};

convertButton.addEventListener('click', convert);
copyButton.addEventListener('click', copyHex);

Object.values(inputs).forEach((input) => {
  input.addEventListener('input', () => {
    updateStatus('');
  });
});

if (bulkInput) {
  bulkInput.addEventListener('input', () => {
    const raw = bulkInput.value;
    if (!raw.trim()) {
      updateStatus('');
      return;
    }
    const parsed = parseBulkInput(raw);
    if (!parsed) {
      updateStatus('x y Y を空白区切りで入力してください。');
      return;
    }
    applyValues(parsed);
    convert();
  });
}

const stored = loadValues();
if (stored) {
  inputs.x.value = stored.x;
  inputs.y.value = stored.y;
  inputs.Y.value = stored.Y;
  if (stored.hex) {
    applyResult(stored.hex);
    updateStatus('前回の値を読み込みました。');
  }
}
