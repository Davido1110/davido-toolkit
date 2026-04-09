import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import { DocRecord, DocStatus, DeptCode, BundleType } from '../types';

interface UseDocumentsOptions {
  statusFilter?: DocStatus | DocStatus[];
  deptFilter?: DeptCode;
  bundleFilter?: BundleType;
}

interface UseDocumentsResult {
  docs: DocRecord[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useDocuments(opts: UseDocumentsOptions = {}): UseDocumentsResult {
  const { profile } = useAuth();
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!profile) {
      setDocs([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const fetchDocs = async () => {
      try {
        let q = query(
          collection(db, 'doc_vault'),
          orderBy('updatedAt', 'desc')
        );

        if (opts.bundleFilter) {
          q = query(q, where('bundles', 'array-contains', opts.bundleFilter));
        }

        if (opts.deptFilter) {
          q = query(q, where('dept', '==', opts.deptFilter));
        }

        if (opts.statusFilter) {
          const statuses = Array.isArray(opts.statusFilter)
            ? opts.statusFilter
            : [opts.statusFilter];
          if (statuses.length === 1) {
            q = query(q, where('status', '==', statuses[0]));
          }
          // For multiple statuses, filter client-side below
        }

        const snap = await getDocs(q);
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DocRecord));

        // Multiple status filter (client-side)
        const statuses = opts.statusFilter
          ? Array.isArray(opts.statusFilter)
            ? opts.statusFilter
            : [opts.statusFilter]
          : null;

        const filtered = all.filter((doc) => {
          // Status filter (multi)
          if (statuses && statuses.length > 1 && !statuses.includes(doc.status)) return false;

          // ACL filter
          const uid = profile.uid;
          const isAdmin = profile.role === 'admin';
          if (isAdmin) return true;

          const { viewers, editors, approvers, isSensitive } = doc.acl;
          const inAny = viewers.includes(uid) || editors.includes(uid) || approvers.includes(uid);

          if (isSensitive) return approvers.includes(uid);
          return inAny;
        });

        if (active) {
          setDocs(filtered);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError('Không thể tải danh sách tài liệu');
          setLoading(false);
        }
      }
    };

    fetchDocs();
    return () => { active = false; };
  }, [profile, opts.statusFilter, opts.deptFilter, opts.bundleFilter, tick]);

  return { docs, loading, error, reload };
}
