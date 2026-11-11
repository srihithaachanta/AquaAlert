
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

export function ensureStorage() {
  fs.mkdirSync(dataDirectory, { recursive: true });

  files.forEach(file => {
    const filePath = path.join(dataDirectory, file);

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "[]", "utf8");
    }
  });
}

export function readData(filename) {
  const filePath = path.join(dataDirectory, filename);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, "utf8");
    return content.trim() ? JSON.parse(content) : [];
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
}

export function writeData(filename, data) {
  const filePath = path.join(dataDirectory, filename);

  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}
