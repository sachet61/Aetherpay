import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { OfficialPartner, UserProfile } from '../../types';
import { dataService } from '../../services/dataService';
import {
  getPartnerDisplayDomain,
  movePartnerByStep,
  reorderPartnerList,
  sortOfficialPartners,
} from '../../utils/officialPartnersUtils';
import {
  PartnerIcon,
  PlatformBadge,
  getPlatformDisplayName,
} from '../common/PartnerVisuals';
import { OfficialPartnerDrawer } from './OfficialPartnerDrawer';
import { OfficialPartnersPreviewModal } from './OfficialPartnersPreviewModal';

interface AdminOfficialPartnersTabProps {
  currentUser: UserProfile;
}

type SortMode = 'manual' | 'name' | 'platform';

export const AdminOfficialPartnersTab: React.FC<AdminOfficialPartnersTabProps> = ({
  currentUser,
}) => {
  const [partners, setPartners] = useState<OfficialPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [sortMode, setSortMode] = useState<SortMode>('manual');
  const [hasPendingOrder, setHasPendingOrder] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<OfficialPartner | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OfficialPartner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const catalog = useMemo(() => dataService.getGameCatalog(), []);

  const loadPartners = useCallback(async (background = false) => {
    if (!background) setIsLoading(true);
    setError(null);
    const res = await dataService.fetchOfficialPartners({ includeHidden: true });
    if (res.success) {
      setPartners(sortOfficialPartners(res.partners));
      setHasPendingOrder(false);
    } else {
      setError(res.error || 'Failed to load official partners.');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser.role !== 'admin') return;
    void loadPartners(false);
  }, [currentUser.role, loadPartners]);

  const displayedPartners = useMemo(() => {
    if (sortMode === 'manual') return partners;
    const copy = [...partners];
    if (sortMode === 'name') {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'platform') {
      copy.sort(
        (a, b) =>
          a.platform.localeCompare(b.platform) ||
          a.sortOrder - b.sortOrder ||
          a.name.localeCompare(b.name)
      );
    }
    return copy;
  }, [partners, sortMode]);

  if (currentUser.role !== 'admin') {
    return (
      <div className="p-8 text-center rounded-2xl border border-amber-800 bg-amber-950/30 text-amber-300 space-y-2">
        <ShieldAlert className="w-8 h-8 mx-auto text-amber-400" />
        <h2 className="font-bold text-base">Admin Exclusive Area</h2>
        <p className="text-sm text-amber-300/90">
          Only administrators can manage Official Partners.
        </p>
      </div>
    );
  }

  const showTempNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    window.setTimeout(() => {
      setNotice((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  const handleToggleVisibility = async (partner: OfficialPartner) => {
    setTogglingId(partner.id);
    const nextVisible = !partner.isVisible;
    const res = await dataService.updateOfficialPartner(partner.id, {
      isVisible: nextVisible,
    });
    setTogglingId(null);
    if (!res.success || !res.partner) {
      showTempNotice('error', res.error || 'Unable to update visibility.');
      return;
    }
    setPartners((prev) =>
      prev.map((item) => (item.id === partner.id ? res.partner! : item))
    );
    showTempNotice(
      'success',
      `${partner.name} is now ${nextVisible ? 'visible' : 'hidden'} to players.`
    );
  };

  const handleDropOnRow = (targetId: string) => {
    if (sortMode !== 'manual' || !draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const next = reorderPartnerList(partners, draggingId, targetId);
    setPartners(next);
    setHasPendingOrder(true);
    setDraggingId(null);
  };

  const handleStepMove = (id: string, direction: 'up' | 'down') => {
    if (sortMode !== 'manual') {
      setSortMode('manual');
    }
    const next = movePartnerByStep(partners, id, direction);
    setPartners(next);
    setHasPendingOrder(true);
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    const orderedIds = partners.map((p) => p.id);
    const res = await dataService.reorderOfficialPartners(orderedIds);
    setIsSavingOrder(false);
    if (!res.success) {
      showTempNotice('error', res.error || 'Failed to save display order.');
      return;
    }
    if (res.partners) {
      setPartners(sortOfficialPartners(res.partners));
    }
    setHasPendingOrder(false);
    showTempNotice('success', 'Display order saved.');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const target = deleteTarget;
    const res = await dataService.deleteOfficialPartner(target.id);
    setIsDeleting(false);
    if (!res.success) {
      showTempNotice('error', res.error || 'Failed to delete partner.');
      return;
    }
    setPartners((prev) => prev.filter((p) => p.id !== target.id));
    setDeleteTarget(null);
    showTempNotice('success', `${target.name} removed.`);
  };

  const nextSortOrder =
    partners.length > 0 ? Math.max(...partners.map((p) => p.sortOrder)) + 1 : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-[#0E1726] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Official Partners Directory</h2>
          <p className="text-sm text-slate-300 mt-0.5">
            Add, edit, reorder, or hide verified Facebook, Instagram, and Telegram partners.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm font-semibold text-slate-200 inline-flex items-center gap-2 transition-colors"
          >
            <Eye className="w-4 h-4 text-slate-300" />
            <span>Preview as customer</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingPartner(null);
              setDrawerOpen(true);
            }}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm inline-flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add partner</span>
          </button>
        </div>
      </div>

      {/* Notices */}
      {notice && (
        <div
          role="status"
          className={`p-3.5 rounded-xl border text-sm flex items-center gap-2.5 ${
            notice.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/60 border-rose-800 text-rose-200'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Sort & Order Toolbar */}
      <div className="p-4 rounded-2xl bg-[#0E1726] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label htmlFor="partners-sort-select" className="text-sm font-medium text-slate-300">
            Sort view
          </label>
          <select
            id="partners-sort-select"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="min-h-[44px] rounded-xl bg-[#0A0F1D] border border-slate-700/80 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
          >
            <option value="manual">Manual display order</option>
            <option value="name">Name (A–Z)</option>
            <option value="platform">Platform</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {hasPendingOrder && (
            <>
              <button
                type="button"
                onClick={() => void loadPartners(false)}
                disabled={isSavingOrder}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm font-medium text-slate-300"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => void handleSaveOrder()}
                disabled={isSavingOrder}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm inline-flex items-center gap-2 disabled:opacity-60"
              >
                {isSavingOrder ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save order</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => void loadPartners(false)}
            disabled={isLoading}
            aria-label="Refresh partners list"
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm font-medium text-slate-200 inline-flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="p-5 rounded-2xl border border-rose-800/70 bg-rose-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-white">Failed to load partners</div>
              <p className="text-sm text-rose-200/90 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadPartners(false)}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm font-semibold text-white inline-flex items-center gap-2 shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading official partners table">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-[#0E1726] border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && displayedPartners.length === 0 && (
        <div className="p-8 rounded-2xl bg-[#0E1726] border border-slate-800 text-center space-y-3">
          <p className="text-sm text-slate-300">No official partners added yet.</p>
          <button
            type="button"
            onClick={() => {
              setEditingPartner(null);
              setDrawerOpen(true);
            }}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add first partner</span>
          </button>
        </div>
      )}

      {/* Desktop Table */}
      {!isLoading && displayedPartners.length > 0 && (
        <div className="hidden md:block rounded-2xl border border-slate-800 bg-[#0E1726] overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-950/50">
                <th className="py-3.5 px-4 w-12">Order</th>
                <th className="py-3.5 px-4">Partner</th>
                <th className="py-3.5 px-4">Platform</th>
                <th className="py-3.5 px-4">Page Link</th>
                <th className="py-3.5 px-4">Visibility</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-sm">
              {displayedPartners.map((partner, index) => {
                const domain = getPartnerDisplayDomain(partner.pageUrl);
                const linkedGame = partner.gameId
                  ? catalog.find((g) => g.id === partner.gameId)
                  : undefined;

                return (
                  <tr
                    key={partner.id}
                    draggable={sortMode === 'manual'}
                    onDragStart={() => setDraggingId(partner.id)}
                    onDragOver={(e) => {
                      if (sortMode === 'manual') e.preventDefault();
                    }}
                    onDrop={() => handleDropOnRow(partner.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className={`transition-colors ${
                      draggingId === partner.id
                        ? 'bg-amber-500/10'
                        : 'hover:bg-slate-800/35'
                    }`}
                  >
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-center gap-1">
                        <span
                          title={
                            sortMode === 'manual'
                              ? 'Drag to reorder'
                              : 'Switch to Manual order to drag'
                          }
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${
                            sortMode === 'manual'
                              ? 'cursor-grab text-slate-400 hover:text-white'
                              : 'text-slate-600'
                          }`}
                        >
                          <GripVertical className="w-4 h-4" />
                        </span>
                        <span className="text-xs font-mono text-slate-400">{index + 1}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-center gap-3 min-w-0">
                        <PartnerIcon
                          name={partner.name}
                          iconUrl={partner.iconUrl}
                          platform={partner.platform}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">
                            {partner.name}
                          </div>
                          {(partner.note || linkedGame) && (
                            <div className="text-xs text-slate-400 truncate max-w-[260px]">
                              {linkedGame ? `${linkedGame.title} · ` : ''}
                              {partner.note || ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-middle">
                      <PlatformBadge platform={partner.platform} />
                    </td>

                    <td className="py-3.5 px-4 align-middle">
                      <a
                        href={partner.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-slate-200 hover:text-amber-300 transition-colors"
                      >
                        <span className="truncate max-w-[180px]">
                          {domain || getPlatformDisplayName(partner.platform)}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      </a>
                    </td>

                    <td className="py-3.5 px-4 align-middle">
                      <button
                        type="button"
                        disabled={togglingId === partner.id}
                        onClick={() => void handleToggleVisibility(partner)}
                        aria-label={`Toggle visibility for ${partner.name}`}
                        className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                          partner.isVisible
                            ? 'bg-emerald-950/60 border-emerald-700/70 text-emerald-300 hover:bg-emerald-950'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {togglingId === partner.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : partner.isVisible ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                        <span>{partner.isVisible ? 'Visible' : 'Hidden'}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 align-middle text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPartner(partner);
                            setDrawerOpen(true);
                          }}
                          aria-label={`Edit ${partner.name}`}
                          className="min-h-[44px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(partner)}
                          aria-label={`Delete ${partner.name}`}
                          className="min-w-[44px] min-h-[44px] px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-950/80 border border-rose-800/60 text-rose-300 inline-flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Stacked Cards */}
      {!isLoading && displayedPartners.length > 0 && (
        <div className="md:hidden space-y-3">
          {displayedPartners.map((partner, index) => {
            const domain = getPartnerDisplayDomain(partner.pageUrl);
            return (
              <div
                key={partner.id}
                className="p-4 rounded-2xl bg-[#0E1726] border border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <PartnerIcon
                      name={partner.name}
                      iconUrl={partner.iconUrl}
                      platform={partner.platform}
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="text-sm font-bold text-white truncate">{partner.name}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <PlatformBadge platform={partner.platform} />
                        {domain && <span className="text-xs text-slate-400">{domain}</span>}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={togglingId === partner.id}
                    onClick={() => void handleToggleVisibility(partner)}
                    aria-label={`Toggle visibility for ${partner.name}`}
                    className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 ${
                      partner.isVisible
                        ? 'bg-emerald-950/60 border-emerald-700/70 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {partner.isVisible ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                    <span>{partner.isVisible ? 'Visible' : 'Hidden'}</span>
                  </button>
                </div>

                {partner.note && (
                  <p className="text-sm text-slate-300">{partner.note}</p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleStepMove(partner.id, 'up')}
                      aria-label={`Move ${partner.name} up`}
                      className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-900 border border-slate-700 text-slate-200 disabled:opacity-40 inline-flex items-center justify-center"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === displayedPartners.length - 1}
                      onClick={() => handleStepMove(partner.id, 'down')}
                      aria-label={`Move ${partner.name} down`}
                      className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-900 border border-slate-700 text-slate-200 disabled:opacity-40 inline-flex items-center justify-center"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPartner(partner);
                        setDrawerOpen(true);
                      }}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm font-semibold text-white inline-flex items-center gap-1.5"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(partner)}
                      aria-label={`Delete ${partner.name}`}
                      className="min-w-[44px] min-h-[44px] px-3 py-2 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 inline-flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Drawer */}
      <OfficialPartnerDrawer
        isOpen={drawerOpen}
        editingPartner={editingPartner}
        defaultSortOrder={nextSortOrder}
        onClose={() => setDrawerOpen(false)}
        onSaved={(saved, isEdit) => {
          setPartners((prev) => {
            const exists = prev.some((p) => p.id === saved.id);
            const updated = exists
              ? prev.map((p) => (p.id === saved.id ? saved : p))
              : [...prev, saved];
            return sortOfficialPartners(updated);
          });
          showTempNotice(
            'success',
            isEdit ? `${saved.name} updated.` : `${saved.name} added to Official Partners.`
          );
        }}
      />

      {/* Customer Preview Modal */}
      <OfficialPartnersPreviewModal
        isOpen={previewOpen}
        partners={partners}
        onClose={() => setPreviewOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-partner-title"
        >
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeleteTarget(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-[#0E1726] border border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 id="delete-partner-title" className="text-lg font-bold text-white">
              Remove Official Partner
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to permanently remove <strong className="text-white">{deleteTarget.name}</strong> from Official Partners?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm font-semibold text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleConfirmDelete()}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm inline-flex items-center gap-2 disabled:opacity-60"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Delete Partner</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
