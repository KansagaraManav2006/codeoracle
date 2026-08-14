import React, { useState } from 'react';
import { Upload, Github, FolderArchive, ArrowRight, FileCheck, X, AlertCircle, Sparkles } from 'lucide-react';
import { IngestionMode } from '../types';

const MAX_ZIP_BYTES = 200 * 1024 * 1024;

interface InputSectionProps {
  onAnalyzeZip: (file: File) => void;
  onAnalyzeGithub: (url: string) => void;
  onLoadDemo: () => void;
  disabled?: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({
  onAnalyzeZip,
  onAnalyzeGithub,
  onLoadDemo,
  disabled = false,
}) => {
  const [mode, setMode] = useState<IngestionMode>('zip');
  const [githubUrl, setGithubUrl] = useState('');
  const [githubUrlError, setGithubUrlError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (file: File) => {
    setFileError(null);

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setFileError('Only .zip archive files are supported.');
      setSelectedFile(null);
      return;
    }

    if (file.size === 0) {
      setFileError('Selected ZIP file is empty.');
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_ZIP_BYTES) {
      setFileError('ZIP compressed file size exceeds maximum limit of 200MB.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const validateGithubUrl = (url: string): boolean => {
    setGithubUrlError(null);
    if (!url.trim()) {
      setGithubUrlError('GitHub URL is required.');
      return false;
    }

    const regex = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\.git)?$/;
    if (!regex.test(url.trim())) {
      setGithubUrlError('Enter a valid public GitHub HTTPS URL (e.g. https://github.com/owner/repo)');
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'zip') {
      if (!selectedFile) {
        setFileError('Please select or drop a valid .zip file.');
        return;
      }
      onAnalyzeZip(selectedFile);
    } else {
      if (!validateGithubUrl(githubUrl)) return;
      onAnalyzeGithub(githubUrl.trim());
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl max-w-4xl mx-auto mb-5 sm:mb-8">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Codebase Ingestion</h2>
          <p className="text-xs text-slate-400">Select a ZIP archive or public GitHub repo (up to 100,000 source lines)</p>
        </div>
        <div className="grid w-full grid-cols-3 bg-slate-950 p-1 rounded-xl border border-slate-800 sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setMode('zip');
              setFileError(null);
            }}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2 text-[11px] sm:text-xs font-medium rounded-lg transition-all ${
              mode === 'zip' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span>ZIP Upload</span>
          </button>
          <button type="button" onClick={onLoadDemo} disabled={disabled} className="flex items-center justify-center gap-1.5 rounded-lg px-2 sm:px-4 py-2 text-[11px] sm:text-xs font-medium text-amber-300 transition-all hover:bg-amber-500/10 disabled:opacity-50">
            <Sparkles className="w-4 h-4"/><span>Try Demo</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('github');
              setGithubUrlError(null);
            }}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2 text-[11px] sm:text-xs font-medium rounded-lg transition-all ${
              mode === 'github' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-4 h-4" />
            <span>GitHub Repo</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === 'zip' ? (
          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-5 sm:p-8 text-center bg-slate-950/40 transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : selectedFile
                  ? 'border-emerald-500/50 bg-emerald-950/20'
                  : 'border-slate-700 hover:border-indigo-500/50'
              }`}
            >
              {selectedFile ? (
                <div className="flex min-w-0 items-center justify-between gap-3 bg-slate-900 border border-emerald-500/30 p-3 sm:p-4 rounded-xl max-w-lg mx-auto">
                  <div className="flex min-w-0 items-center space-x-3 text-left">
                    <FileCheck className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
                      <p className="text-xs text-slate-400">{formatBytes(selectedFile.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 mx-auto text-indigo-400 mb-3" />
                  <p className="text-sm font-medium text-slate-200">
                    Drag and drop your legacy codebase <code className="text-indigo-400">.zip</code> archive here
                  </p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Supports Python (.py) and JavaScript (.js, .jsx) projects</p>
                  <label className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg cursor-pointer transition-colors shadow-md">
                    <span>Browse File</span>
                    <input type="file" accept=".zip" onChange={handleFileInputChange} className="hidden" />
                  </label>
                </>
              )}
            </div>

            {fileError && (
              <div className="flex items-center space-x-2 text-xs text-red-400 bg-red-950/40 p-3 rounded-lg border border-red-800/40">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{fileError}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block text-xs font-medium text-slate-300">Public GitHub Repository Link</label>
            <div className="relative">
              <Github className="w-5 h-5 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="url"
                placeholder="https://github.com/username/repository"
                value={githubUrl}
                onChange={(e) => {
                  setGithubUrl(e.target.value);
                  if (githubUrlError) validateGithubUrl(e.target.value);
                }}
                className={`w-full bg-slate-950 border rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors ${
                  githubUrlError ? 'border-red-500 focus:border-red-500' : 'border-slate-800 focus:border-indigo-500'
                }`}
              />
            </div>

            {githubUrlError && (
              <div className="flex items-center space-x-2 text-xs text-red-400 bg-red-950/40 p-3 rounded-lg border border-red-800/40">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{githubUrlError}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            {mode === 'zip' ? 'Max 200MB ZIP | 500MB extracted' : 'Public HTTPS repositories only'}
          </p>
          <button
            type="submit"
            disabled={disabled || (mode === 'zip' && !selectedFile) || (mode === 'github' && !githubUrl.trim())}
            className="flex w-full items-center justify-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 sm:w-auto"
          >
            <span>{mode === 'zip' ? 'Analyze Codebase' : 'Analyze Repository'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default InputSection;
