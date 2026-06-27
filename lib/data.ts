import fs from 'fs/promises';
import path from 'path';
import { Mutex } from 'async-mutex';
import type { User, Group, Expense, Settlement, Month } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  groups: path.join(DATA_DIR, 'groups.json'),
  expenses: path.join(DATA_DIR, 'expenses.json'),
  settlements: path.join(DATA_DIR, 'settlements.json'),
  months: path.join(DATA_DIR, 'months.json'),
};

// One mutex per file path to prevent concurrent write corruption
const mutexes = new Map<string, Mutex>();
function getMutex(filePath: string): Mutex {
  if (!mutexes.has(filePath)) mutexes.set(filePath, new Mutex());
  return mutexes.get(filePath)!;
}

export async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  for (const filePath of Object.values(FILES)) {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, '[]', 'utf8');
    }
  }
}

async function readJson<T>(filePath: string): Promise<T[]> {
  const mutex = getMutex(filePath);
  return mutex.runExclusive(async () => {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content) as T[];
    } catch {
      return [];
    }
  });
}

async function writeJson<T>(filePath: string, data: T[]): Promise<void> {
  const mutex = getMutex(filePath);
  return mutex.runExclusive(async () => {
    const tmpPath = filePath + '.tmp';
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmpPath, filePath);
  });
}

export async function readUsers(): Promise<User[]> {
  await ensureDataDir();
  return readJson<User>(FILES.users);
}
export async function writeUsers(data: User[]): Promise<void> {
  return writeJson(FILES.users, data);
}

export async function readGroups(): Promise<Group[]> {
  await ensureDataDir();
  return readJson<Group>(FILES.groups);
}
export async function writeGroups(data: Group[]): Promise<void> {
  return writeJson(FILES.groups, data);
}

export async function readExpenses(): Promise<Expense[]> {
  await ensureDataDir();
  return readJson<Expense>(FILES.expenses);
}
export async function writeExpenses(data: Expense[]): Promise<void> {
  return writeJson(FILES.expenses, data);
}

export async function readSettlements(): Promise<Settlement[]> {
  await ensureDataDir();
  return readJson<Settlement>(FILES.settlements);
}
export async function writeSettlements(data: Settlement[]): Promise<void> {
  return writeJson(FILES.settlements, data);
}

export async function readMonths(): Promise<Month[]> {
  await ensureDataDir();
  return readJson<Month>(FILES.months);
}
export async function writeMonths(data: Month[]): Promise<void> {
  return writeJson(FILES.months, data);
}

export { UPLOADS_DIR };
