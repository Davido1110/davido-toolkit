import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { SOP, LearningProgress } from '../types';

// ─── SOPs ────────────────────────────────────────────────────────────────────

export async function getSOPs(): Promise<SOP[]> {
  const snap = await getDocs(query(collection(db, 'sops'), orderBy('updatedAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as SOP));
}

export async function getPublishedSOPs(): Promise<SOP[]> {
  const snap = await getDocs(
    query(collection(db, 'sops'), where('status', '==', 'published'), orderBy('updatedAt', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as SOP));
}

export async function getSOPById(id: string): Promise<SOP | null> {
  const snap = await getDoc(doc(db, 'sops', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as SOP;
}

export async function createSOP(
  data: Omit<SOP, 'id' | 'createdAt' | 'updatedAt' | 'version'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'sops'), {
    ...data,
    version: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSOP(id: string, data: Partial<Omit<SOP, 'id'>>): Promise<void> {
  await updateDoc(doc(db, 'sops', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSOP(id: string): Promise<void> {
  await deleteDoc(doc(db, 'sops', id));
}

// ─── Learning Progress ────────────────────────────────────────────────────────

export async function getMyProgress(userId: string): Promise<LearningProgress[]> {
  const snap = await getDocs(
    query(collection(db, 'learning'), where('userId', '==', userId))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as LearningProgress));
}

export async function getAllProgress(): Promise<LearningProgress[]> {
  const snap = await getDocs(collection(db, 'learning'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as LearningProgress));
}

export async function upsertProgress(
  userId: string,
  sopId: string,
  data: Partial<Omit<LearningProgress, 'id' | 'userId' | 'sopId'>>
): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, 'learning'),
      where('userId', '==', userId),
      where('sopId', '==', sopId)
    )
  );
  if (snap.empty) {
    await addDoc(collection(db, 'learning'), {
      userId,
      sopId,
      status: 'in_progress',
      currentStep: 0,
      quizAttempts: 0,
      approvedByLead: false,
      approvedByCMO: false,
      startedAt: serverTimestamp(),
      ...data,
    });
  } else {
    await updateDoc(snap.docs[0].ref, data);
  }
}

export async function approveProgress(
  progressId: string,
  approvedBy: 'lead' | 'cmo'
): Promise<void> {
  const field = approvedBy === 'lead' ? 'approvedByLead' : 'approvedByCMO';
  await updateDoc(doc(db, 'learning', progressId), { [field]: true });
}
