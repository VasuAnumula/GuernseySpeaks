
import { Timestamp } from 'firebase/firestore';

// Helper to convert Firestore Timestamps to Dates for client-side usage
export const processDoc = (docSnap: any): any | null => { // Consider using a generic type for better type safety if possible
  const data = docSnap.data();
  if (!data) return null;

  const convertTimestamps = (obj: any): any => {
    for (const key in obj) {
      if (obj[key] instanceof Timestamp) {
        obj[key] = obj[key].toDate();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        // Check if any nested value is a Timestamp before recursing
        if (Object.values(obj[key]).some(v => v instanceof Timestamp)) {
           convertTimestamps(obj[key]);
        }
      }
    }
    return obj;
  };
  
  return { id: docSnap.id, ...convertTimestamps(data) };
};
