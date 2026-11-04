import React, { useState } from 'react';
import {
  Upload,
  FileCheck,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Database,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import defaultProfile from '../data/viknesh_profile.json';
import { PlayerProfile } from '../types/chess';

export const PgnImportPage: React.FC = () => {
  const profile = defaultProfile as unknown as PlayerProfile;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [importStats, setImportStats] = useState<{ total: number; errors: number } | null>(null);

  // Retrain state
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainSuccess, setRetrainSuccess] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pgn')) {
      setUploadStatus('error');
      setStatusMessage('Invalid file type: Please upload a file with .pgn extension.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');
    setStatusMessage('Uploading and parsing games...');

    const formData = new FormData();
    formData.append('file', file);

    const apiHost = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.DEV ? 'http://127.0.0.1:8000' : '';
    try {
      const res = await fetch(`${apiHost}/api/import-pgn`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Upload failed');
      }

      const data = await res.json();
      setUploadStatus('success');
      setStatusMessage(data.message || `Successfully parsed ${data.totalGames} games.`);
      setImportStats({ total: data.totalGames, errors: data.parseErrors });
    } catch (err: any) {
      setUploadStatus('error');
      setStatusMessage(`Error: ${err.message || 'Failed to connect to backend engine'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetrain = async () => {
    setIsRetraining(true);
    setRetrainSuccess(false);

    const apiHost = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.DEV ? 'http://127.0.0.1:8000' : '';
    try {
      const res = await fetch(`${apiHost}/api/retrain`, {
        method: 'POST',
      });

      if (res.ok) {
        setRetrainSuccess(true);
      }
    } catch {
      // ignore
    } finally {
      setIsRetraining(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2.5">
          <Upload className="w-7 h-7 text-[#81b64c]" />
          <span>PGN Dataset Import & AI Retraining</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-400">
          Upload new Chess.com or Lichess PGN files to expand Vicky's training dataset and update your personal chess profile.
        </p>
      </div>

      {/* Active Dataset Status Card */}
      <div className="p-6 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#81b64c] to-emerald-400 flex items-center justify-center text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Current Active Dataset</h3>
              <p className="text-xs text-gray-400 font-mono">chess_com_games_2026-11-04.pgn</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/40">
            {profile.overview.totalGames} Games Loaded
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center text-xs pt-2">
          <div className="p-3 rounded-xl bg-[#252528] border border-[#333]">
            <span className="text-gray-400">Parsed Successfully</span>
            <div className="text-lg font-bold text-emerald-400">{profile.overview.totalGames}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#252528] border border-[#333]">
            <span className="text-gray-400">Parsing Failures</span>
            <div className="text-lg font-bold text-gray-300">{profile.datasetInfo.parseErrorsCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#252528] border border-[#333]">
            <span className="text-gray-400">White / Black</span>
            <div className="text-lg font-bold text-white">
              {profile.overview.whiteGames} / {profile.overview.blackGames}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="p-8 rounded-2xl bg-[#1e1e1e] border-2 border-dashed border-[#38383e] hover:border-[#81b64c] transition-colors text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#27272a] mx-auto flex items-center justify-center text-gray-400">
          <Upload className="w-8 h-8 text-[#81b64c]" />
        </div>

        <div className="space-y-1">
          <h4 className="text-base font-bold text-white">Drag & Drop or Choose a PGN File</h4>
          <p className="text-xs text-gray-400">
            Supports multi-game PGN files. Existing games are safely preserved without duplicates.
          </p>
        </div>

        <div className="pt-2">
          <label className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-[#81b64c] hover:bg-[#95c65d] text-white font-bold text-xs cursor-pointer shadow-lg transition-transform transform active:scale-95">
            <Upload className="w-4 h-4" />
            <span>Select PGN File</span>
            <input
              type="file"
              accept=".pgn"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>

        {isUploading && (
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-400 pt-2 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-[#81b64c]" />
            <span>Parsing PGN and calculating chess features...</span>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs flex items-center justify-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs flex items-center justify-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Retrain AI Button Card */}
      <div className="p-6 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 text-purple-400" />
            <span>Retrain Vicky AI Decision Model</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Refits the XGBoost move preference ranker using the latest verified games and training positions.
          </p>
        </div>

        <button
          onClick={handleRetrain}
          disabled={isRetraining}
          className="px-6 py-3 rounded-xl bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white font-bold text-xs shadow-lg transition-all flex items-center space-x-2"
        >
          {isRetraining ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Retraining XGBoost...</span>
            </>
          ) : (
            <>
              <span>Retrain Model</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {retrainSuccess && (
        <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/50 text-purple-200 text-xs text-center">
          Vicky AI model has been successfully retrained and live weights updated!
        </div>
      )}
    </div>
  );
};

