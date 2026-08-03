import fs from 'fs';
import path from 'path';

export interface AppStorageOptions {
  dataDir: string;
}

export class AppStorage {
  private root: string;
  private filePath: string;
  private backupPath: string;

  constructor(dataDir: string) {
    this.root = path.join(dataDir, 'komorebi');
    this.filePath = path.join(this.root, 'app-data.json');
    this.backupPath = path.join(this.root, 'app-data.bak.json');
  }

  async initialize() {
    if (!fs.existsSync(this.root)) {
      fs.mkdirSync(this.root, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({ schemaVersion: 1 }, null, 2), 'utf-8');
    }
  }

  read() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (error) {
      if (fs.existsSync(this.backupPath)) {
        const raw = fs.readFileSync(this.backupPath, 'utf-8');
        return JSON.parse(raw);
      }
      return { schemaVersion: 1 };
    }
  }

  write(data: unknown) {
    const next = JSON.stringify(data, null, 2);
    fs.writeFileSync(this.backupPath, JSON.stringify(this.read(), null, 2), 'utf-8');
    fs.writeFileSync(this.filePath, next, 'utf-8');
  }
}
