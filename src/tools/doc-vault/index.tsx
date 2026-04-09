import { useState, useEffect } from 'react';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { DocRecord } from './types';
import { DocumentLibrary } from './components/DocumentLibrary';
import { UploadWizard } from './components/UploadWizard';
import { DocumentDetail } from './components/DocumentDetail';
import { ApprovalQueue } from './components/ApprovalQueue';
import { BundleView } from './components/BundleView';
import { NamingGuide } from './components/NamingGuide';
import { ChangeRequestPanel } from './components/ChangeRequestPanel';

type Tab = 'library' | 'upload' | 'approvals' | 'bundles' | 'guide';
type View =
  | { type: 'tab'; tab: Tab }
  | { type: 'detail'; doc: DocRecord; prevTab: Tab }
  | { type: 'change-request'; doc: DocRecord; prevTab: Tab };

export default function DocVault() {
  const { profile } = useAuth();
  const [view, setView] = useState<View>({ type: 'tab', tab: 'library' });
  const [approvalCount, setApprovalCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'admin';
  const currentTab = view.type === 'tab' ? view.tab : view.type === 'detail' ? view.prevTab : view.prevTab;

  // Fetch approval count badge
  useEffect(() => {
    if (!isManagerOrAdmin) return;
    getCountFromServer(query(collection(db, 'doc_vault'), where('status', '==', 'review')))
      .then((snap) => setApprovalCount(snap.data().count))
      .catch(() => setApprovalCount(0));
  }, [isManagerOrAdmin, reloadKey]);

  const goTab = (tab: Tab) => setView({ type: 'tab', tab });
  const triggerReload = () => setReloadKey((k) => k + 1);

  const tabs: { id: Tab; label: string; icon: string; hidden?: boolean }[] = [
    { id: 'library', label: 'Kho Tài Liệu', icon: '📁' },
    { id: 'upload', label: 'Tải Lên', icon: '⬆' },
    { id: 'approvals', label: 'Phê Duyệt', icon: '✅', hidden: !isManagerOrAdmin },
    { id: 'bundles', label: 'Bộ Tài Liệu', icon: '📦' },
    { id: 'guide', label: 'Hướng Dẫn', icon: '📖' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 pt-5 pb-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">🗂️ Kho Tài Liệu</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Quản lý vòng đời tài liệu: tạo, duyệt, phân quyền, lưu trữ, hủy.</p>

          {/* Tab navigation */}
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.filter((t) => !t.hidden).map((t) => {
              const isActive = currentTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => goTab(t.id)}
                  className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                  {t.id === 'approvals' && approvalCount > 0 && (
                    <span className="ml-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                      {approvalCount > 99 ? '99+' : approvalCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {/* Detail view */}
        {view.type === 'detail' && (
          <DocumentDetail
            doc={view.doc}
            onBack={() => setView({ type: 'tab', tab: view.prevTab })}
            onRequestChange={(d) => setView({ type: 'change-request', doc: d, prevTab: view.prevTab })}
            onReload={() => { triggerReload(); setView({ type: 'tab', tab: view.prevTab }); }}
          />
        )}

        {/* Change request view */}
        {view.type === 'change-request' && (
          <ChangeRequestPanel
            docId={view.doc.id}
            docCanonicalName={view.doc.canonicalName}
            dept={view.doc.dept}
            loai={view.doc.loai}
            tenTaiLieu={view.doc.tenTaiLieu}
            format={view.doc.format}
            currentVersionMajor={view.doc.versionMajor}
            currentVersionMinor={view.doc.versionMinor}
            onDone={() => { triggerReload(); setView({ type: 'tab', tab: view.prevTab }); }}
            onCancel={() => setView({ type: 'detail', doc: view.doc, prevTab: view.prevTab })}
          />
        )}

        {/* Tab content */}
        {view.type === 'tab' && (
          <>
            {view.tab === 'library' && (
              <DocumentLibrary
                onView={(d) => setView({ type: 'detail', doc: d, prevTab: 'library' })}
              />
            )}
            {view.tab === 'upload' && (
              <UploadWizard
                onDone={() => { triggerReload(); goTab('library'); }}
                onCancel={() => goTab('library')}
              />
            )}
            {view.tab === 'approvals' && isManagerOrAdmin && (
              <ApprovalQueue />
            )}
            {view.tab === 'bundles' && <BundleView />}
            {view.tab === 'guide' && <NamingGuide />}
          </>
        )}
      </div>
    </div>
  );
}
