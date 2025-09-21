import { DatabaseStorage } from '../../server/storage';

// Create singleton instance for database storage
let storage: DatabaseStorage;

export function getStorage(): DatabaseStorage {
  if (!storage) {
    storage = new DatabaseStorage();
  }
  return storage;
}