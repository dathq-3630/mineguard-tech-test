export type StoredDoc = {
  id: string;
  name: string;
  size: number;
  text: string;
  summary: string;
  keyPoints: string[];
  createdAt: string;
};

const KEY = "documents_v1";

export function listDocuments(): StoredDoc[] {
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as StoredDoc[]) : [];
}

export function saveDocument(doc: StoredDoc) {
  const docs = listDocuments();
  const idx = docs.findIndex((d) => d.id === doc.id);
  if (idx >= 0) docs[idx] = doc;
  else docs.unshift(doc);
  localStorage.setItem(KEY, JSON.stringify(docs));
}

export function getDocument(id: string): StoredDoc | undefined {
  return listDocuments().find((d) => d.id === id);
}

export function deleteDocument(id: string) {
  const next = listDocuments().filter((d) => d.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
}
