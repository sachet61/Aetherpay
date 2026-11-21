import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  OfficialPartner,
  OfficialPartnerInput,
  PartnerPlatform,
} from '../../types';
import { dataService } from '../../services/dataService';
import {
  getMessageLink,
  validateOfficialPartnerInput,
  validatePartnerIconFile,
  validatePartnerIconUrl,
  validatePartnerUrl,
} from '../../utils/officialPartnersUtils';
import {
  PartnerIcon,
  getPlatformDisplayName,
} from '../common/PartnerVisuals';

interface OfficialPartnerDrawerProps {
  isOpen: boolean;
  editingPartner: OfficialPartner | null;
  defaultSortOrder: number;
  onClose: () => void;
  onSaved: (partner: OfficialPartner, isEdit: boolean) => void;
}

const PLATFORMS: PartnerPlatform[] = ['facebook', 'instagram', 'telegram'];

export const OfficialPartnerDrawer: React.FC<OfficialPartnerDrawerProps> = ({
  isOpen,
  editingPartner,
  defaultSortOrder,
  onClose,
  onSaved,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const catalog = useMemo(() => dataService.getGameCatalog(), []);

  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<PartnerPlatform>('facebook');
  const [pageUrl, setPageUrl] = useState('');
  const [messageLink, setMessageLink] = useState('');
  const [isMessageLinkOverridden, setIsMessageLinkOverridden] = useState(false);
  const [gameId, setGameId] = useState<string>('');
  const [note, setNote] = useState('');
  const [isVisible, setIsVisible] = useState(true);

  // Separate uploaded file URL vs pasted URL so newly uploaded file wins cleanly
  const [uploadedIconUrl, setUploadedIconUrl] = useState<string | null>(null);
  const [pastedIconUrl, setPastedIconUrl] = useState('');

  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [iconError, setIconError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingPartner) {
      setName(editingPartner.name);
      setPlatform(editingPartner.platform);
      setPageUrl(editingPartner.pageUrl);
      const hasOverride = Boolean(editingPartner.messageLink);
      setIsMessageLinkOverridden(hasOverride);
      setMessageLink(
        editingPartner.messageLink ||
          getMessageLink({
            platform: editingPartner.platform,
            pageUrl: editingPartner.pageUrl,
            messageLink: null,
          })
      );
      setGameId(editingPartner.gameId || '');
      setNote(editingPartner.note || '');
      setIsVisible(editingPartner.isVisible);
      // Existing icon URL can be edited or replaced via upload
      setUploadedIconUrl(null);
      setPastedIconUrl(editingPartner.iconUrl || '');
    } else {
      setName('');
      setPlatform('facebook');
      setPageUrl('');
      setMessageLink('');
      setIsMessageLinkOverridden(false);
      setGameId('');
      setNote('');
      setIsVisible(true);
      setUploadedIconUrl(null);
      setPastedIconUrl('');
    }
    setIconError(null);
    setSubmitError(null);
    setIsUploadingIcon(false);
    setIsSaving(false);
  }, [isOpen, editingPartner]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isSaving, onClose]);

  const derivedMessageLink = useMemo(() => {
    if (!pageUrl.trim()) return '';
    return getMessageLink({ platform, pageUrl: pageUrl.trim(), messageLink: null });
  }, [platform, pageUrl]);

  useEffect(() => {
    if (!isMessageLinkOverridden) {
      setMessageLink(derivedMessageLink);
    }
  }, [derivedMessageLink, isMessageLinkOverridden]);

  const effectiveIconUrl = useMemo(() => {
    if (uploadedIconUrl) return uploadedIconUrl;
    const trimmed = pastedIconUrl.trim();
    return trimmed ? trimmed : null;
  }, [uploadedIconUrl, pastedIconUrl]);

  const pageUrlCheck = useMemo(() => {
    if (!pageUrl.trim()) return null;
    return validatePartnerUrl(pageUrl, platform, { required: true, fieldLabel: 'Page URL' });
  }, [pageUrl, platform]);

  const messageUrlCheck = useMemo(() => {
    if (!isMessageLinkOverridden || !messageLink.trim()) return null;
    return validatePartnerUrl(messageLink, platform, { required: false, fieldLabel: 'Message link' });
  }, [isMessageLinkOverridden, messageLink, platform]);

  const pastedIconCheck = useMemo(() => {
    if (uploadedIconUrl || !pastedIconUrl.trim()) return null;
    return validatePartnerIconUrl(pastedIconUrl);
  }, [uploadedIconUrl, pastedIconUrl]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconError(null);

    const fileCheck = validatePartnerIconFile(file);
    if (!fileCheck.valid) {
      setIconError(fileCheck.error || 'Invalid icon file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploadingIcon(true);
    try {
      const uploadRes = await dataService.uploadOfficialPartnerIcon(file);
      if (!uploadRes.success || !uploadRes.url) {
        setIconError(uploadRes.error || 'Failed to upload partner icon.');
      } else {
        setUploadedIconUrl(uploadRes.url);
      }
    } catch (err: any) {
      setIconError(err?.message || 'Failed to upload partner icon.');
    } finally {
      setIsUploadingIcon(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (isUploadingIcon) {
      setSubmitError('Please wait for the icon upload to finish.');
      return;
    }
    if (iconError) {
      setSubmitError(iconError);
      return;
    }

    const input: OfficialPartnerInput = {
      name: name.trim(),
      iconUrl: effectiveIconUrl,
      platform,
      pageUrl: pageUrl.trim(),
      messageLink:
        isMessageLinkOverridden && messageLink.trim() ? messageLink.trim() : null,
      gameId: gameId.trim() || null,
      note: note.trim() ? note.trim() : null,
      isVisible,
    };

    const validation = validateOfficialPartnerInput(input);
    if (!validation.valid) {
      const firstError = Object.values(validation.errors).find(Boolean);
      setSubmitError(firstError || 'Please check the partner details.');
      return;
    }

    setIsSaving(true);
    try {
      const res = editingPartner
        ? await dataService.updateOfficialPartner(editingPartner.id, input)
        : await dataService.createOfficialPartner(input);

      if (!res.success || !res.partner) {
        setSubmitError(res.error || 'Unable to save partner.');
        return;
      }

      onSaved(res.partner, Boolean(editingPartner));
      onClose();
    } catch (err: any) {
      setSubmitError(err?.message || 'Unable to save partner.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="partner-drawer-title"
    >
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        onClick={() => !isSaving && onClose()}
      />

      <div className="relative z-10 w-full md:max-w-lg max-h-[92vh] md:max-h-full bg-[#0A0F1D] border-t md:border-t-0 md:border-l border-slate-800 rounded-t-3xl md:rounded-none shadow-2xl flex flex-col overflow-hidden">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-[#0E1726] flex items-center justify-between gap-3">
          <div>
            <h2 id="partner-drawer-title" className="text-lg font-bold text-white">
              {editingPartner ? 'Edit Official Partner' : 'Add Official Partner'}
            </h2>
            <p className="text-xs text-slate-400">
              Verified partner details appear immediately when visible.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close partner editor"
            className="min-w-[44px] min-h-[44px] rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 inline-flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {submitError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Partner Name */}
          <div className="space-y-1.5">
            <label htmlFor="partner-name" className="block text-sm font-semibold text-slate-200">
              Partner Name
            </label>
            <input
              id="partner-name"
              type="text"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Swift Official Desk"
              className="w-full min-h-[44px] rounded-xl bg-[#0E1726] border border-slate-700/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Platform Selector */}
          <div className="space-y-1.5">
            <span className="block text-sm font-semibold text-slate-200">Platform</span>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map((opt) => {
                const selected = platform === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPlatform(opt)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                      selected
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-[#0E1726] text-slate-200 border-slate-700/80 hover:border-slate-500'
                    }`}
                  >
                    {getPlatformDisplayName(opt)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Icon Upload + URL Override */}
          <div className="p-4 rounded-2xl bg-[#0E1726] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <PartnerIcon
                  name={name || 'Partner'}
                  iconUrl={effectiveIconUrl}
                  platform={platform}
                  size="lg"
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">Partner Icon</div>
                  <div className="text-xs text-slate-400">
                    PNG, JPG, or WebP only (max 512 KB). No SVG.
                  </div>
                </div>
              </div>

              {(uploadedIconUrl || pastedIconUrl.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    setUploadedIconUrl(null);
                    setPastedIconUrl('');
                    setIconError(null);
                  }}
                  aria-label="Clear icon"
                  className="min-h-[44px] px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-rose-300 inline-flex items-center gap-1.5 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              disabled={isUploadingIcon}
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm font-semibold text-slate-100 inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {isUploadingIcon ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Uploading icon...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>{uploadedIconUrl ? 'Replace Uploaded Icon' : 'Upload Icon File'}</span>
                </>
              )}
            </button>

            {uploadedIconUrl && (
              <div className="text-xs text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Uploaded file selected (takes priority over pasted link).</span>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="partner-icon-url" className="block text-xs text-slate-300 font-medium">
                Or paste HTTPS image URL
              </label>
              <input
                id="partner-icon-url"
                type="url"
                value={pastedIconUrl}
                onChange={(e) => {
                  setPastedIconUrl(e.target.value);
                  setIconError(null);
                }}
                placeholder="https://example.com/icon.png"
                className="w-full min-h-[44px] rounded-xl bg-[#0A0F1D] border border-slate-700/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              {pastedIconCheck && !pastedIconCheck.valid && (
                <p className="text-xs text-rose-400">{pastedIconCheck.error}</p>
              )}
            </div>

            {iconError && <p className="text-xs text-rose-400">{iconError}</p>}
          </div>

          {/* Page URL */}
          <div className="space-y-1.5">
            <label htmlFor="partner-page-url" className="block text-sm font-semibold text-slate-200">
              Page URL
            </label>
            <div className="relative">
              <input
                id="partner-page-url"
                type="url"
                required
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                placeholder={
                  platform === 'facebook'
                    ? 'https://www.facebook.com/yourpage'
                    : platform === 'instagram'
                    ? 'https://www.instagram.com/yourhandle'
                    : 'https://t.me/yourchannel'
                }
                className={`w-full min-h-[44px] rounded-xl bg-[#0E1726] border px-3.5 py-2.5 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none ${
                  pageUrlCheck
                    ? pageUrlCheck.valid
                      ? 'border-emerald-600/80 focus:border-emerald-500'
                      : 'border-rose-600/80 focus:border-rose-500'
                    : 'border-slate-700/80 focus:border-amber-500'
                }`}
              />
              {pageUrlCheck?.valid && (
                <CheckCircle2
                  aria-label="Valid URL"
                  className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2"
                />
              )}
            </div>
            {pageUrlCheck && !pageUrlCheck.valid && (
              <p className="text-xs text-rose-400">{pageUrlCheck.error}</p>
            )}
          </div>

          {/* Message Link (auto-filled unless overridden) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="partner-message-link" className="text-sm font-semibold text-slate-200">
                Direct Message Link
              </label>
              {isMessageLinkOverridden ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsMessageLinkOverridden(false);
                    setMessageLink(derivedMessageLink);
                  }}
                  className="text-xs font-medium text-amber-400 hover:text-amber-300"
                >
                  Use auto-derived link
                </button>
              ) : (
                <span className="text-xs text-slate-400">Auto-derived</span>
              )}
            </div>
            <input
              id="partner-message-link"
              type="url"
              value={messageLink}
              onChange={(e) => {
                setIsMessageLinkOverridden(true);
                setMessageLink(e.target.value);
              }}
              placeholder="Auto-filled from Page URL"
              className={`w-full min-h-[44px] rounded-xl bg-[#0E1726] border px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none ${
                messageUrlCheck && !messageUrlCheck.valid
                  ? 'border-rose-600/80 focus:border-rose-500'
                  : 'border-slate-700/80 focus:border-amber-500'
              }`}
            />
            {messageUrlCheck && !messageUrlCheck.valid && (
              <p className="text-xs text-rose-400">{messageUrlCheck.error}</p>
            )}
          </div>

          {/* Linked Game (Optional) */}
          <div className="space-y-1.5">
            <label htmlFor="partner-game-id" className="block text-sm font-semibold text-slate-200">
              Linked Game (Optional)
            </label>
            <select
              id="partner-game-id"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="w-full min-h-[44px] rounded-xl bg-[#0E1726] border border-slate-700/80 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">All games / General support</option>
              {catalog.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.title}
                </option>
              ))}
            </select>
          </div>

          {/* Short Note */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="partner-note" className="text-sm font-semibold text-slate-200">
                Short Note (Optional)
              </label>
              <span className="text-xs text-slate-400">{note.length}/80</span>
            </div>
            <input
              id="partner-note"
              type="text"
              maxLength={80}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Fast replies for deposits and bonuses"
              className="w-full min-h-[44px] rounded-xl bg-[#0E1726] border border-slate-700/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Visible Toggle */}
          <label className="min-h-[44px] px-4 py-3 rounded-xl bg-[#0E1726] border border-slate-800 flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <div className="text-sm font-semibold text-white">Visible to Players</div>
              <div className="text-xs text-slate-400">
                Hidden partners stay saved for admins only.
              </div>
            </div>
            <input
              type="checkbox"
              checked={isVisible}
              onChange={(e) => setIsVisible(e.target.checked)}
              className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500"
            />
          </label>
        </form>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-slate-800 bg-[#0E1726] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm font-semibold text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving || isUploadingIcon}
            onClick={(e) => void handleSubmit(e)}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{editingPartner ? 'Save Partner' : 'Add Partner'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
