const fs = require("fs");
const path = require("path");

const API_URL = "https://api-free.deepl.com/v2/translate";
const API_KEY = process.env.DEEPL_API_KEY;

if (!API_KEY) {
  console.error("DEEPL_API_KEY is not set");
  process.exit(1);
}

const localesDir = path.join(__dirname, "..", "client", "src", "locales");
const sourceLang = "ru";
const targets = ["uz", "tj", "kz"];

const loadJson = (lang) =>
  JSON.parse(fs.readFileSync(path.join(localesDir, `${lang}.json`), "utf8"));

const saveJson = (lang, data) => {
  fs.writeFileSync(
    path.join(localesDir, `${lang}.json`),
    JSON.stringify(data, null, 2),
    "utf8",
  );
};

const flatten = (obj, prefix = "", out = {}) => {
  Object.entries(obj).forEach(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flatten(value, nextKey, out);
    } else {
      out[nextKey] = String(value);
    }
  });
  return out;
};

const unflatten = (obj) => {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split(".");
    let current = result;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i];
      if (!current[part]) current[part] = {};
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
};

const translateBatch = async (texts, targetLang) => {
  const params = new URLSearchParams();
  texts.forEach((text) => params.append("text", text));
  params.append("source_lang", sourceLang.toUpperCase());
  params.append("target_lang", targetLang.toUpperCase());

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${API_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`DeepL error ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  return payload.translations.map((item) => item.text);
};

const run = async () => {
  const source = loadJson(sourceLang);
  const flatSource = flatten(source);
  const keys = Object.keys(flatSource);
  const values = Object.values(flatSource);

  for (const target of targets) {
    const translatedValues = await translateBatch(values, target);
    const translatedMap = {};
    keys.forEach((key, index) => {
      translatedMap[key] = translatedValues[index];
    });
    saveJson(target, unflatten(translatedMap));
    console.log(`Translated: ${target}`);
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
