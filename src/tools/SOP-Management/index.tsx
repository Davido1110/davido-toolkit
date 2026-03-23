import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import SOPList from './components/SOPList';
import SOPBuilder from './components/SOPBuilder';
import SOPViewer from './components/SOPViewer';
import OnboardingDashboard from './components/OnboardingDashboard';
import LearningPath from './components/LearningPath';
import AIChat from './components/AIChat';
import SeedButton from './components/SeedButton';
import type { SOP } from './types';

type Tab = 'list' | 'builder' | 'learning' | 'onboarding' | 'chat';

type View =
  | { type: 'tab'; tab: Tab }
  | { type: 'view'; sopId: string; prevTab: Tab }
  | { type: 'edit'; sopId: string }
  | { type: 'create' };

export default function SOPManagement() {
  const { profile } = useAuth();
  const isCMO = profile?.role === 'admin';
  const isLead = profile?.role === 'manager';

  const [view, setView] = useState<View>({ type: 'tab', tab: 'list' });

  const activeTab = view.type === 'tab' ? view.tab : view.type === 'view' ? view.prevTab : 'list';

  const allTabs: { id: Tab; label: string; icon: string; visible: boolean }[] = [
    { id: 'list', label: 'Danh sách SOP', icon: '📋', visible: true },
    { id: 'builder', label: 'Tạo SOP', icon: '✏️', visible: isCMO },
    { id: 'learning', label: 'Học SOP', icon: '📚', visible: !isCMO && !isLead },
    { id: 'onboarding', label: 'Onboarding', icon: '👥', visible: isCMO || isLead },
    { id: 'chat', label: 'AI Chat', icon: '🤖', visible: true },
  ];
  const tabs = allTabs.filter(t => t.visible);

  function goTab(tab: Tab) {
    setView({ type: 'tab', tab });
  }

  function handleViewSOP(sop: SOP) {
    setView({ type: 'view', sopId: sop.id, prevTab: activeTab });
  }

  function handleEditSOP(sop: SOP) {
    setView({ type: 'edit', sopId: sop.id });
  }

  function handleBack() {
    if (view.type === 'view') goTab(view.prevTab);
    else goTab('list');
  }

  return (
    <div className="flex flex-col h-full px-6 py-6">
      {/* Top navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-1 overflow-x-auto pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => goTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {/* SOP List */}
        {(view.type === 'tab' && view.tab === 'list') && (
          <div className="space-y-6">
            <SOPList
              onView={handleViewSOP}
              onEdit={handleEditSOP}
              onNew={() => setView({ type: 'create' })}
            />
            <SeedButton />
          </div>
        )}

        {/* SOP Builder — create */}
        {(view.type === 'create' || (view.type === 'tab' && view.tab === 'builder')) && (
          <SOPBuilder
            onDone={() => goTab('list')}
          />
        )}

        {/* SOP Builder — edit */}
        {view.type === 'edit' && (
          <SOPBuilder
            editingSopId={view.sopId}
            onDone={handleBack}
          />
        )}

        {/* SOP Viewer */}
        {view.type === 'view' && (
          <SOPViewer
            sopId={view.sopId}
            onBack={handleBack}
          />
        )}

        {/* Learning Path (staff) */}
        {(view.type === 'tab' && view.tab === 'learning') && (
          <LearningPath
            onStartSOP={sop => setView({ type: 'view', sopId: sop.id, prevTab: 'learning' })}
          />
        )}

        {/* Onboarding Dashboard */}
        {(view.type === 'tab' && view.tab === 'onboarding') && (
          <OnboardingDashboard isCMO={isCMO} />
        )}

        {/* AI Chat */}
        {(view.type === 'tab' && view.tab === 'chat') && (
          <AIChat />
        )}
      </div>
    </div>
  );
}
