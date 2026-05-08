const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const rgbToHsl = (red, green, blue) => {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let saturation = 0;
  const lightness = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
    if (max === g) hue = (b - r) / delta + 2;
    if (max === b) hue = (r - g) / delta + 4;
    hue *= 60;
  }

  return { hue, saturation, lightness };
};

const hslToRgb = (hue, saturation, lightness) => {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = lightness - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hue < 60) [red, green, blue] = [chroma, x, 0];
  else if (hue < 120) [red, green, blue] = [x, chroma, 0];
  else if (hue < 180) [red, green, blue] = [0, chroma, x];
  else if (hue < 240) [red, green, blue] = [0, x, chroma];
  else if (hue < 300) [red, green, blue] = [x, 0, chroma];
  else [red, green, blue] = [chroma, 0, x];

  return [
    Math.round((red + m) * 255),
    Math.round((green + m) * 255),
    Math.round((blue + m) * 255),
  ];
};

const tuneAccentColor = (red, green, blue) => {
  const { hue, saturation, lightness } = rgbToHsl(red, green, blue);
  const tunedSaturation = clamp(saturation, 0.36, 0.72);
  const tunedLightness = clamp(lightness, 0.42, 0.62);
  const [r, g, b] = hslToRgb(hue, tunedSaturation, tunedLightness);

  return `rgb(${r}, ${g}, ${b})`;
};

export const extractAccentColor = (imageUrl) => new Promise((resolve) => {
  if (!imageUrl || typeof window === 'undefined') {
    resolve(null);
    return;
  }

  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.decoding = 'async';

  image.onload = () => {
    try {
      const size = 48;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        resolve(null);
        return;
      }

      canvas.width = size;
      canvas.height = size;
      context.drawImage(image, 0, 0, size, size);

      const { data } = context.getImageData(0, 0, size, size);
      const buckets = new Map();

      for (let index = 0; index < data.length; index += 16) {
        const alpha = data[index + 3];
        if (alpha < 180) continue;

        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const { hue, saturation, lightness } = rgbToHsl(red, green, blue);

        if (saturation < 0.18 || lightness < 0.16 || lightness > 0.9) continue;

        const hueBucket = Math.round(hue / 12) * 12;
        const key = String(hueBucket);
        const current = buckets.get(key) || { red: 0, green: 0, blue: 0, score: 0, count: 0 };
        const score = saturation * (1 - Math.abs(lightness - 0.52));

        buckets.set(key, {
          red: current.red + red * score,
          green: current.green + green * score,
          blue: current.blue + blue * score,
          score: current.score + score,
          count: current.count + 1,
        });
      }

      const best = [...buckets.values()]
        .filter(bucket => bucket.score > 0)
        .sort((a, b) => (b.score * b.count) - (a.score * a.count))[0];

      if (!best) {
        resolve(null);
        return;
      }

      resolve(tuneAccentColor(
        best.red / best.score,
        best.green / best.score,
        best.blue / best.score
      ));
    } catch {
      resolve(null);
    }
  };

  image.onerror = () => resolve(null);
  image.src = imageUrl;
});
