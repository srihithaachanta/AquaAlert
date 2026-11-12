
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDirectory = path.join(__dirname, "..", "data");

const files = [
  "users.json",
  "complaints.json",
  "workers.json",
  "schedules.json",
  "alerts.json",
  "waterQuality.json",
  "waterSupply.json"
];

function isAllowedFile(filename) {
  return files.includes(filename);
}

export function ensureStorage() {
  fs.mkdirSync(dataDirectory, { recursive: true });

  files.forEach(file => {
    const filePath = path.join(dataDirectory, file);

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "[]", "utf8");
    }
  });

  console.log("JSON storage initialized successfully.");
}

export function readData(filename) {
  if (!isAllowedFile(filename)) {
    throw new Error(`Invalid storage filename: ${filename}`);
  }

  const filePath = path.join(dataDirectory, filename);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]", "utf8");
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, "utf8");

    if (!content.trim()) {
      return [];
    }

    const data = JSON.parse(content);

    if (!Array.isArray(data)) {
      throw new Error(`${filename} must contain a JSON array.`);
    }

    return data;
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    throw new Error(`Could not read ${filename}. Check its JSON format.`);
  }
}

export function writeData(filename, data) {
  if (!isAllowedFile(filename)) {
    throw new Error(`Invalid storage filename: ${filename}`);
  }

  if (!Array.isArray(data)) {
    throw new Error("Storage data must be an array.");
  }

  fs.mkdirSync(dataDirectory, { recursive: true });

  const filePath = path.join(dataDirectory, filename);

  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}
