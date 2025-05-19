import { useState, useEffect, useCallback } from 'react';
import { 
  DatabaseReference, 
  DataSnapshot, 
  onValue, 
  set, 
  push, 
  update, 
  remove, 
  ref as dbRef,
  query as dbQuery,
  QueryConstraint,
  getDatabase,
  Query
} from 'firebase/database';
import { database } from '@/lib/firebase';

type UseDatabaseOptions<T> = {
  path: string;
  transform?: (data: any) => T;
  once?: boolean;
};

export function useDatabase<T = any>(options: string | UseDatabaseOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const path = typeof options === 'string' ? options : options.path;
  const transform = typeof options === 'object' ? options.transform : undefined;
  const once = typeof options === 'object' ? options.once : false;

  // Fetch data from the database
  const fetchData = useCallback((dbPath: string) => {
    setLoading(true);
    setError(null);

    try {
      const db = getDatabase();
      const dbRefInstance = dbRef(db, dbPath);
      const queryRef = dbQuery(dbRefInstance);
      
      const handleData = (snapshot: DataSnapshot) => {
        const value = snapshot.val();
        const transformedValue = transform ? transform(value) : value;
        setData(transformedValue);
        setLoading(false);
      };

      const handleError = (error: Error) => {
        console.error('Database error:', error);
        setError(error);
        setLoading(false);
      };

      if (once) {
        // Only fetch once
        onValue(queryRef, handleData, { onlyOnce: true });
      } else {
        // Subscribe to changes
        const unsubscribe = onValue(queryRef, handleData, handleError);
        return () => unsubscribe();
      }
    } catch (error) {
      console.error('Error setting up database listener:', error);
      setError(error instanceof Error ? error : new Error(String(error)));
      setLoading(false);
    }
  }, [transform, once]);

  // Set up the database listener
  useEffect(() => {
    if (!path) return;
    return fetchData(path);
  }, [path, fetchData]);

  // Create a new record
  const create = useCallback(async (value: any, customPath?: string) => {
    try {
      const db = getDatabase();
      const recordRef = push(dbRef(db, customPath || path));
      await set(recordRef, value);
      return { key: recordRef.key, ...value };
    } catch (error) {
      console.error('Error creating record:', error);
      throw error;
    }
  }, [path]);

  // Update an existing record
  const updateRecord = useCallback(async (id: string, updates: any) => {
    try {
      const db = getDatabase();
      const recordRef = dbRef(db, `${path}/${id}`);
      await update(recordRef, updates);
      return { id, ...updates };
    } catch (error) {
      console.error('Error updating record:', error);
      throw error;
    }
  }, [path]);

  // Delete a record
  const removeRecord = useCallback(async (id: string) => {
    try {
      const db = getDatabase();
      const recordRef = dbRef(db, `${path}/${id}`);
      await remove(recordRef);
      return true;
    } catch (error) {
      console.error('Error removing record:', error);
      throw error;
    }
  }, [path]);

  // Query the database
  const queryData = useCallback(async (queryPath: string, ...queryConstraints: QueryConstraint[]) => {
    try {
      const db = getDatabase();
      const ref = dbRef(db, queryPath);
      const q = queryConstraints.length > 0 
        ? dbQuery(ref, ...queryConstraints) 
        : dbQuery(ref);
      
      return new Promise((resolve, reject) => {
        const unsubscribe = onValue(
          q,
          (snapshot) => {
            const value = snapshot.val();
            const transformedValue = transform ? transform(value) : value;
            unsubscribe(); // Unsubscribe after getting the data once
            resolve(transformedValue);
          },
          (error) => {
            console.error('Query error:', error);
            reject(error);
          },
          { onlyOnce: true }
        );
      });
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }, [transform]);

  return {
    data,
    loading,
    error,
    create,
    update: updateRecord,
    remove: removeRecord,
    query: queryData,
    ref: (path: string) => dbRef(database, path)
  };
}

// Example usage:
/*
const { data, loading, error, create, update, remove } = useDatabase({
  path: 'users',
  transform: (data) => {
    if (!data) return [];
    return Object.entries(data).map(([id, value]) => ({
      id,
      ...(value as object)
    }));
  }
});
*/
