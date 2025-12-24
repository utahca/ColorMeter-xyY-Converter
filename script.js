const inputs = {
  x: document.getElementById('input-x'),
  y: document.getElementById('input-y'),
  Y: document.getElementById('input-Y')
};
const bulkInput = document.getElementById('bulk-input');
const formatSelect = document.getElementById('format');
const formatHint = document.getElementById('format-hint');
const labels = {
  x: document.getElementById('label-x'),
  y: document.getElementById('label-y'),
  Y: document.getElementById('label-Y')
};
const convertButton = document.getElementById('convert');
const copyButton = document.getElementById('copy');
const hexValue = document.getElementById('hex-value');
const swatch = document.getElementById('swatch');
const status = document.getElementById('status');

const STORAGE_KEY = 'xyy-last-values';

const FORMAT_CONFIG = {
  srgb: {
    hint: 'sRGB の xyY を想定しています。Y は 0〜100（または 0〜1）で入力してください。',
    labels: { x: 'x', y: 'y', Y: 'Y' },
    placeholders: { x: '0.3127', y: '0.3290', Y: '50' },
    bulkPlaceholder: '0.3127 0.3290 50',
    normalizeY: (value) => (value > 1 ? value / 100 : value)
  },
  srgb_rgb: {
    hint: 'Digital Color Meter の sRGB (0〜1) 値を貼り付ける場合はこちら。',
    labels: { x: 'R', y: 'G', Y: 'B' },
    placeholders: { x: '0.09', y: '0.41', Y: '1.00' },
    bulkPlaceholder: '0.092 0.413 0.998'
  },
  xyy: {
    hint: 'Digital Color Meter の xyY を想定しています。Y は 0〜1 で入力してください。',
    labels: { x: 'x', y: 'y', Y: 'Y' },
    placeholders: { x: '0.3127', y: '0.3290', Y: '0.50' },
    bulkPlaceholder: '0.3127 0.3290 0.50',
    normalizeY: (value) => value
  }
};

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

const srgbChannelsToHex = ({ r, g, b }) => {
  const rByte = Math.round(clamp(r) * 255);
  const gByte = Math.round(clamp(g) * 255);
  const bByte = Math.round(clamp(b) * 255);
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

const saveValues = (values, hex, format) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...values, hex, format }));
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

const applyFormat = (formatKey) => {
  const format = FORMAT_CONFIG[formatKey] ?? FORMAT_CONFIG.srgb;
  formatSelect.value = formatKey;
  if (labels.x) {
    labels.x.textContent = format.labels.x;
  }
  if (labels.y) {
    labels.y.textContent = format.labels.y;
  }
  if (labels.Y) {
    labels.Y.textContent = format.labels.Y;
  }
  inputs.x.placeholder = format.placeholders.x;
  inputs.y.placeholder = format.placeholders.y;
  inputs.Y.placeholder = format.placeholders.Y;
  if (bulkInput) {
    bulkInput.placeholder = format.bulkPlaceholder;
  }
  if (formatHint) {
    formatHint.textContent = format.hint;
  }
};

const getFormatConfig = () => FORMAT_CONFIG[formatSelect.value] ?? FORMAT_CONFIG.srgb;

const convertValuesToHex = (values, formatConfig) => {
  if (formatConfig === FORMAT_CONFIG.srgb_rgb) {
    return srgbChannelsToHex({
      r: values.x,
      g: values.y,
      b: values.Y
    });
  }

  const normalizedY = formatConfig.normalizeY(values.Y);
  const { X, Y, Z } = xyYToXYZ(values.x, values.y, normalizedY);
  const rgb = xyzToSRGB({ X, Y, Z });
  return toHex(rgb);
};

const convert = ({ silent = false } = {}) => {
  const values = readValues();
  if (!valuesAreValid(values)) {
    const hasAnyInput = Object.values(inputs).some((input) => input.value.trim() !== '');
    if (!silent && hasAnyInput) {
      updateStatus('x, y, Y の値を入力してください。');
    }
    return;
  }

  const formatConfig = getFormatConfig();
  const hex = convertValuesToHex(values, formatConfig);

  applyResult(hex);
  saveValues(values, hex, formatSelect.value);
  updateStatus(silent ? '' : '変換結果を保存しました。');
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

if (formatSelect) {
  formatSelect.addEventListener('change', () => {
    applyFormat(formatSelect.value);
    convert({ silent: true });
  });
}

Object.values(inputs).forEach((input) => {
  input.addEventListener('input', () => {
    convert({ silent: true });
  });
});

if (bulkInput) {
  const handleBulkInput = () => {
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
    convert({ silent: true });
  };

  bulkInput.addEventListener('input', handleBulkInput);
  bulkInput.addEventListener('paste', () => {
    requestAnimationFrame(handleBulkInput);
  });
}

const stored = loadValues();
applyFormat(stored?.format ?? 'srgb');
if (stored) {
  inputs.x.value = stored.x;
  inputs.y.value = stored.y;
  inputs.Y.value = stored.Y;
  if (stored.hex) {
    applyResult(stored.hex);
    updateStatus('前回の値を読み込みました。');
  }
}
