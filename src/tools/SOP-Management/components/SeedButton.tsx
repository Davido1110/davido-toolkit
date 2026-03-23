import { useState } from 'react';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import { SEED_SOPS } from '../data/seedData';

export default function SeedButton() {
  const { profile, user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);

  if (profile?.role !== 'admin') return null;

  async function handleSeed() {
    setStatus('running');
    setLog([]);
    const logs: string[] = [];

    try {
      // Check existing
      const existing = await getDocs(collection(db, 'sops'));
      if (existing.size > 0) {
        logs.push(`⚠️ Firestore đã có ${existing.size} SOP. Đang thêm mới (không xóa cũ)...`);
      }

      let count = 0;
      for (const sop of SEED_SOPS) {
        const steps = sop.steps.map((s, i) => ({
          ...s,
          id: `step-${i + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        }));

        await addDoc(collection(db, 'sops'), {
          ...sop,
          steps,
          createdBy: user?.uid ?? 'seed',
          createdByName: profile?.name ?? 'CMO',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        count++;
        logs.push(`✓ ${sop.title}`);
        setLog([...logs]);
      }

      logs.push(`\n✅ Hoàn thành! Đã tạo ${count} SOP.`);
      setLog([...logs]);
      setStatus('done');
    } catch (e) {
      logs.push(`❌ Lỗi: ${e instanceof Error ? e.message : String(e)}`);
      setLog([...logs]);
      setStatus('error');
    }
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-yellow-800 dark:text-yellow-300 text-sm">
            Seed dữ liệu SOP Marketing
          </div>
          <div className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
            Tạo {SEED_SOPS.length} SOP từ file Marketing SOP list vào Firestore. Chỉ admin mới thấy nút này.
          </div>
        </div>
        <span className="text-2xl">🌱</span>
      </div>

      {status === 'idle' && !confirm && (
        <button
          onClick={() => setConfirm(true)}
          className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
        >
          Seed {SEED_SOPS.length} SOPs vào Firestore
        </button>
      )}

      {confirm && status === 'idle' && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-yellow-800 dark:text-yellow-300">Xác nhận seed?</span>
          <button
            onClick={handleSeed}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Xác nhận
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Hủy
          </button>
        </div>
      )}

      {status === 'running' && (
        <div className="text-sm text-yellow-700 dark:text-yellow-400">Đang tạo SOPs...</div>
      )}

      {log.length > 0 && (
        <div className="bg-black/10 dark:bg-black/30 rounded-lg p-3 max-h-60 overflow-y-auto font-mono text-xs space-y-0.5">
          {log.map((l, i) => (
            <div key={i} className={l.startsWith('✅') ? 'text-green-600 dark:text-green-400 font-bold mt-2' : l.startsWith('❌') ? 'text-red-600 dark:text-red-400' : l.startsWith('⚠️') ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}>
              {l}
            </div>
          ))}
        </div>
      )}

      {status === 'done' && (
        <div className="text-sm text-green-700 dark:text-green-400 font-medium">
          Seed xong! Vào tab "Danh sách SOP" để xem.
        </div>
      )}
    </div>
  );
}
