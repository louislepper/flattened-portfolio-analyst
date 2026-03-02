import { getFirestore } from "firebase-admin/firestore";
import type { SecurityDoc } from "./types.js";

const COLLECTION = "securities";

export async function getSecurityDoc(
  ticker: string
): Promise<SecurityDoc | null> {
  const doc = await getFirestore()
    .collection(COLLECTION)
    .doc(ticker.toUpperCase())
    .get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as SecurityDoc;
}
