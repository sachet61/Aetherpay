import React, { useState, useEffect } from 'react';
import { UserProfile, GameCatalogItem, GameLink } from '../../types';
import { dataService } from '../../services/dataService';
import { LOCAL_GAME_IMAGES, resolveGameImageUrl } from '../../utils/imageUtils';
import {
  Gamepad2,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Save,
  X,
  AlertTriangle,
  Link as LinkIcon,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Upload,
} from 'lucide-react';

interface AdminGameCatalogProps {
  currentUser: UserProfile;
}

// Preset icon avatars for quick selection by admin
const PRESET_GAME_ICONS = [
  { label: 'Neon Cyber', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80' },
  { label: 'Retro Arcade', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=128&auto=format&fit=crop&q=80' },
  { label: 'Gold Vault', url: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=128&auto=format&fit=crop&q=80' },
  { label: 'Action Arena', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=128&auto=format&fit=crop&q=80' },
  { label: 'Lucky Controller', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=128&auto=format&fit=crop&q=80' },
];

export const AdminGameCatalog: React.FC<AdminGameCatalogProps> = ({ currentUser }) => {
  const isAdmin = currentUser.role === 'admin';
  const [catalog, setCatalog] = useState<GameCatalogItem[]>(dataService.getGameCatalog());
  const [editingItem, setEditingItem] = useState<GameCatalogItem | null>(null);
  const [isNewItem, setIsNewItem] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Deletion modal state
  const [gameToDelete, setGameToDelete] = useState<GameCatalogItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [gameId, setGameId] = useState('');
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const dataUrl = evt.target?.result as string;
      try {
        const res = await fetch('/api/upload-qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl,
            filename: file.name.replace(/\.[^/.]+$/, ''),
          }),
        });
        const data = await res.json();
        if (data.url) {
          setIconUrl(data.url);
        } else {
          setIconUrl(dataUrl);
        }
      } catch {
        setIconUrl(dataUrl);
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Multiple links for a specific game
  const [links, setLinks] = useState<GameLink[]>([
    { label: 'Web Play', url: 'https://games.swiftsweeps.com' },
  ]);

  // Keep catalog synchronized in real-time with Supabase changes
  useEffect(() => {
    const handleSync = () => {
      setCatalog(dataService.getGameCatalog());
    };
    window.addEventListener('aetherpay_state_changed', handleSync);
    return () => window.removeEventListener('aetherpay_state_changed', handleSync);
  }, []);

  const handleOpenNewGameModal = () => {
    setIsNewItem(true);
    setEditingItem(null);
    setGameId(`gc_${Date.now()}`);
    setTitle('');
    setPlatform('Sweepstakes Web');
    setIconUrl('/images/Firekirin.png');
    setDescription('');
    setLinks([
      { label: 'Web Play', url: 'http://start.firekirin.xyz:8580/index.html' },
      { label: 'Download Link', url: 'http://start.firekirin.xyz:8580/index.html' },
    ]);
    setEnabled(true);
  };

  const handleOpenEditGameModal = (game: GameCatalogItem) => {
    setIsNewItem(false);
    setEditingItem(game);
    setGameId(game.id);
    setTitle(game.title);
    setPlatform(game.platform);
    setIconUrl(game.iconUrl || game.imageUrl || '/images/Firekirin.png');
    setDescription(game.description);
    setLinks(
      game.links && game.links.length > 0
        ? [...game.links]
        : [
            { label: 'Web Play', url: game.gameUrl || '' },
            ...(game.downloadUrl ? [{ label: 'Download Link', url: game.downloadUrl }] : []),
          ]
    );
    setEnabled(game.enabled);
  };

  const handleAddLink = () => {
    setLinks([...links, { label: `Mirror ${links.length + 1}`, url: 'https://' }]);
  };

  const handleRemoveLink = (index: number) => {
    if (links.length <= 1) {
      alert('A game must have at least one link.');
      return;
    }
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleUpdateLink = (index: number, field: 'label' | 'url', val: string) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: val };
    setLinks(updated);
  };

  const handleSaveGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only Administrators can modify the master game catalog.');
      return;
    }

    if (!title.trim()) {
      alert('Please enter a Game Name.');
      return;
    }

    const primaryGameUrl = links[0]?.url || 'https://games.swiftsweeps.com';
    const downloadLink = links.find((l) => l.label.toLowerCase().includes('download'))?.url || links[1]?.url || primaryGameUrl;
    const normalizedIcon = resolveGameImageUrl(iconUrl.trim());

    dataService.saveGameCatalogItem(
      {
        id: editingItem?.id || (isNewItem && gameId ? gameId : undefined),
        title: title.trim(),
        platform: platform.trim(),
        gameUrl: primaryGameUrl,
        downloadUrl: downloadLink,
        links: links.filter((l) => l.url.trim().length > 0),
        iconUrl: normalizedIcon,
        imageUrl: normalizedIcon,
        description: description.trim(),
        enabled,
      },
      currentUser.id,
      currentUser.displayName
    );

    setCatalog(dataService.getGameCatalog());
    setEditingItem(null);
    setIsNewItem(false);
    setCatalog(dataService.getGameCatalog());
    setEditingItem(null);
    setIsNewItem(false);
    setNotificationMsg(`Game title "${title}" successfully saved with ${links.length} link(s) to Supabase.`);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  const handleConfirmDelete = async () => {
    if (!gameToDelete) return;
    if (!isAdmin) {
      alert('Only Administrators can remove games from the catalog.');
      return;
    }

    setIsDeleting(true);
    try {
      await dataService.deleteGameCatalogItem(gameToDelete.id, currentUser.id, currentUser.displayName);
      setCatalog(dataService.getGameCatalog());
      setNotificationMsg(`Game title "${gameToDelete.title}" permanently removed from catalog and Supabase.`);
      setTimeout(() => setNotificationMsg(null), 3500);
      setGameToDelete(null);
    } catch (err) {
      console.error('Failed to delete game:', err);
      alert('Error deleting game from Supabase. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-indigo-400" />
              <span>Master Game Catalog Management</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/60 font-semibold">
              Admin Exclusive
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure game titles, customize local or remote icons, manage separate Game and Download links, and sync changes to Supabase PostgreSQL database.
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={handleOpenNewGameModal}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Game</span>
          </button>
        ) : (
          <div className="text-xs text-amber-400 flex items-center gap-1.5 p-2 rounded-lg bg-amber-950/30 border border-amber-800/40">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>View Only (Admin Permission Required to Edit)</span>
          </div>
        )}
      </div>

      {notificationMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Catalog Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase text-[10px] font-semibold tracking-wider font-mono">
                <th className="py-3 px-4">Icon &amp; Game</th>
                <th className="py-3 px-4">Game ID</th>
                <th className="py-3 px-4">Platform</th>
                <th className="py-3 px-4">Active Play &amp; Download Links</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {catalog.map((game) => {
                const iconSrc = resolveGameImageUrl(game.iconUrl || game.imageUrl);
                return (
                  <tr key={game.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={iconSrc}
                          alt={game.title}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/Firekirin.png';
                          }}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-700 bg-slate-800 shrink-0 shadow-sm"
                        />
                        <div>
                          <div className="font-bold text-white text-sm">{game.title}</div>
                          <div className="text-[11px] text-slate-400 line-clamp-1">{game.description}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-indigo-400">
                      {game.id}
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      {game.platform}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {game.links && game.links.length > 0 ? (
                          game.links.map((link, idx) => (
                            <a
                              key={idx}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 text-[10px] font-medium border border-slate-700"
                            >
                              <span>{link.label}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ))
                        ) : (
                          <a
                            href={game.gameUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 text-[10px]"
                          >
                            <span>Web Play</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          game.enabled
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {game.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {isAdmin && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditGameModal(game)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Edit Game Title"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setGameToDelete(game)}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 transition-colors border border-rose-800/40"
                            title="Delete Game Title"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* In-App Delete Confirmation Modal */}
      {gameToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-rose-900/50 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Game Title</h3>
                <p className="text-xs text-slate-400">Permanently remove from catalog</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <img
                src={resolveGameImageUrl(gameToDelete.iconUrl || gameToDelete.imageUrl)}
                alt={gameToDelete.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/Firekirin.png';
                }}
                className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0"
              />
              <div className="min-w-0">
                <div className="font-bold text-white text-sm truncate">{gameToDelete.title}</div>
                <div className="text-xs text-slate-400 truncate">{gameToDelete.platform}</div>
                <div className="text-[10px] font-mono text-indigo-400 truncate">{gameToDelete.id}</div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-white font-mono">"{gameToDelete.title}"</span>? This will permanently remove the game title and all its play &amp; download links from the master platform catalog and the Supabase database.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setGameToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Modal */}
      {(editingItem || isNewItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">
                  {isNewItem ? 'Add New Game to Catalog' : `Edit Game: ${editingItem?.title}`}
                </h2>
              </div>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setIsNewItem(false);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGame} className="space-y-4 text-xs">
              {/* Game Name & Game ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Name of Game (Required)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Orion Stars Elite"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Game ID</label>
                  <input
                    type="text"
                    disabled={!isNewItem}
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-400 font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
              </div>

              {/* Game Icon that can be changed in Admin */}
              <div className="space-y-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                    <span>Game Icon (Supports Local Image Paths &amp; URLs)</span>
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    ✓ Accepts /src/images/..., /images/..., or filename
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={resolveGameImageUrl(iconUrl)}
                      alt="Preview"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/Firekirin.png';
                      }}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-700 bg-slate-900 shadow-md"
                    />
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                    <input
                      type="text"
                      value={iconUrl}
                      onChange={(e) => setIconUrl(e.target.value)}
                      placeholder="/src/images/Firekirin.png, /images/Firekirin.png, or https://..."
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-[11px] focus:outline-none focus:border-indigo-500"
                    />

                    {/* Direct Image File Upload Button */}
                    <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shrink-0 transition-colors">
                      {uploadingImage ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-indigo-400" />
                      )}
                      <span>{uploadingImage ? 'Uploading...' : 'Upload File'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                </div>

                {/* Available Local Game Assets Selector */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Select From Available Local Game Assets:</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Click to select asset</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-slate-900/60 rounded-xl border border-slate-800/80">
                    {LOCAL_GAME_IMAGES.map((asset) => {
                      const isSelected =
                        iconUrl === asset.path ||
                        iconUrl === `/src/images/${asset.filename}` ||
                        iconUrl === asset.filename;
                      return (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => setIconUrl(asset.path)}
                          className={`p-1.5 rounded-lg text-left flex items-center gap-2 border transition-all ${
                            isSelected
                              ? 'bg-indigo-950 border-indigo-500 text-indigo-200'
                              : 'bg-slate-950 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          <img
                            src={asset.path}
                            alt={asset.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/Firekirin.png';
                            }}
                            className="w-6 h-6 rounded-md object-cover shrink-0 border border-slate-700"
                          />
                          <span className="text-[10px] truncate font-medium">{asset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Preset quick icons */}
                <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                  <span className="text-[10px] text-slate-400 shrink-0">Other Web Presets:</span>
                  {PRESET_GAME_ICONS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setIconUrl(p.url)}
                      className={`px-2 py-1 rounded-lg text-[10px] flex items-center gap-1.5 border shrink-0 transition-colors ${
                        iconUrl === p.url
                          ? 'bg-indigo-950 border-indigo-500 text-indigo-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <img src={p.url} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Multiple Links to Game */}
              <div className="space-y-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-indigo-400" />
                    <label className="text-slate-300 font-semibold">
                      Play &amp; Download Links (Game Link and Download Link supported)
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-semibold border border-indigo-500/40 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Link</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {links.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Label (e.g. Web Play, Download Link, Android APK)"
                        value={link.label}
                        onChange={(e) => handleUpdateLink(idx, 'label', e.target.value)}
                        className="w-1/3 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-medium focus:outline-none focus:border-indigo-500"
                        required
                      />
                      <input
                        type="text"
                        placeholder="https://..."
                        value={link.url}
                        onChange={(e) => handleUpdateLink(idx, 'url', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono text-[11px] focus:outline-none focus:border-indigo-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(idx)}
                        disabled={links.length <= 1}
                        className="p-2 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 disabled:opacity-40"
                        title="Remove link"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Game Platform / Provider</label>
                  <input
                    type="text"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    placeholder="e.g. Orion Play, FireKirin, GameVault"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <label className="flex items-center gap-2 text-slate-300 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    <span>Active in Player Portal</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Game Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Fish battles, sweepstakes reels, progressive jackpots..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setIsNewItem(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-md shadow-indigo-600/20"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Game Title</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
