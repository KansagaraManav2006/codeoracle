import React, { useState } from 'react';
import {
  Upload,
  Github,
  FolderArchive,
  ArrowRight,
  FileCheck,
  X,
  AlertCircle,
  Sparkles,
  BookOpen,
  GitFork,
  TestTube,
  Wand2,
  Map,
} from 'lucide-react';
import { IngestionMode } from '../types';
import SegmentedControl, { SegmentOption } from './common/SegmentedControl';

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
  const outputs = [
    { label: 'Explanation', icon: BookOpen },
    { label: 'Dependency Graph', icon: GitFork },
    { label: 'Generated Tests', icon: TestTube },
    { label: 'Safe Refactor', icon: Wand2 },
    { label: 'Migration Plan', icon: Map },
  ];

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
    if (e.dataTransfer.files && e.target) {
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

  const segmentedOptions: SegmentOption<IngestionMode>[] = [
    { id: 'zip', label: 'ZIP Upload', icon: FolderArchive },
    { id: 'github', label: 'GitHub Repo', icon: Github },
  ];

  return (
    <div className="bg-[#FFFDFC] border-2 border-[#C8BEB0] rounded-[32px] p-6 sm:p-8 shadow-warm max-w-4xl mx-auto mb-6 sm:mb-8 transition-all">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col gap-4 border-b-2 border-[#C8BEB0] pb-5 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#4C4FD6]"></span>
            <h2 className="text-xl font-extrabold text-[#181715] tracking-tight">Codebase Ingestion</h2>
          </div>
          <p className="text-xs text-[#5C554D] mt-1 font-semibold">
            Upload a ZIP archive or public GitHub repo (up to 100,000 source lines)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onLoadDemo}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-full bg-[#B88228] text-white hover:bg-[#181715] transition-all shadow-sm disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Try Demo</span>
          </button>

          <SegmentedControl
            options={segmentedOptions}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setFileError(null);
              setGithubUrlError(null);
            }}
            disabled={disabled}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === 'zip' ? (
          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-[32px] p-8 sm:p-11 text-center bg-[#E7DFD3]/70 transition-all ${
                isDragging
                  ? 'border-[#4C4FD6] bg-[#EAE9FB] scale-[1.01]'
                  : selectedFile
                  ? 'border-[#2A7A71] bg-[#D9ECE6]/60'
                  : 'border-[#9E9282] hover:border-[#181715] hover:bg-[#E7DFD3]'
              }`}
            >
              {selectedFile ? (
                <div className="flex min-w-0 items-center justify-between gap-3 bg-[#FFFDFC] border-2 border-[#ACCFC6] p-4 rounded-2xl max-w-lg mx-auto shadow-sm">
                  <div className="flex min-w-0 items-center space-x-3.5 text-left">
                    <div className="p-2.5 bg-[#D9ECE6] rounded-xl text-[#1B4E48]">
                      <FileCheck className="w-7 h-7 flex-shrink-0" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-[#181715] truncate">{selectedFile.name}</p>
                      <p className="text-xs font-bold text-[#5C554D]">{formatBytes(selectedFile.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-2 text-[#5C554D] hover:text-white bg-[#ECE5DA] rounded-full hover:bg-[#7A322D] transition-colors"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-[#181715] text-white flex items-center justify-center shadow-md">
                    <Upload className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-base font-extrabold text-[#181715]">
                      Drag and drop your legacy codebase <code className="bg-[#181715] text-white px-2 py-0.5 rounded font-mono text-xs">.zip</code> archive here
                    </p>
                    <p className="text-xs font-semibold text-[#5C554D] mt-1">
                      Supports Python (.py) and JavaScript (.js, .jsx) projects
                    </p>
                  </div>
                  <label className="inline-flex items-center space-x-2 btn-dark-pill px-6 py-2.5 text-xs cursor-pointer shadow-md">
                    <span>Browse File</span>
                    <input type="file" accept=".zip" onChange={handleFileInputChange} className="hidden" />
                  </label>
                </div>
              )}
            </div>

            {fileError && (
              <div className="flex items-center space-x-2 text-xs font-extrabold text-[#7A322D] bg-[#F5DED9] p-3.5 rounded-2xl border-2 border-[#E3B0A9]">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#B54C46]" />
                <span>{fileError}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block text-xs font-extrabold text-[#181715] uppercase tracking-wider">
              Public GitHub Repository Link
            </label>
            <div className="relative">
              <Github className="w-5 h-5 absolute left-4 top-3.5 text-[#181715]" />
              <input
                type="url"
                placeholder="https://github.com/username/repository"
                value={githubUrl}
                onChange={(e) => {
                  setGithubUrl(e.target.value);
                  if (githubUrlError) validateGithubUrl(e.target.value);
                }}
                className={`w-full bg-[#E7DFD3]/60 border-2 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold text-[#181715] placeholder-[#5C554D] focus:outline-none focus:bg-[#FFFDFC] transition-colors ${
                  githubUrlError
                    ? 'border-[#B54C46] focus:border-[#B54C46]'
                    : 'border-[#C8BEB0] focus:border-[#181715]'
                }`}
              />
            </div>

            {githubUrlError && (
              <div className="flex items-center space-x-2 text-xs font-extrabold text-[#7A322D] bg-[#F5DED9] p-3.5 rounded-2xl border-2 border-[#E3B0A9]">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#B54C46]" />
                <span>{githubUrlError}</span>
              </div>
            )}
          </div>
        )}

        {/* Feature checklist demoted to a slim single-row strip */}
        <div className="rounded-2xl border-2 border-[#C8BEB0] bg-[#ECE5DA] p-3.5">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-[#5C554D]">
            Every analysis includes
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold text-[#181715]">
            {outputs.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className="h-4 w-4 text-[#4C4FD6]" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t-2 border-[#C8BEB0] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-[#5C554D]">
            {mode === 'zip' ? 'Max 200MB ZIP | 500MB extracted' : 'Public HTTPS repositories only'}
          </p>
          <button
            type="submit"
            disabled={
              disabled ||
              (mode === 'zip' && !selectedFile) ||
              (mode === 'github' && !githubUrl.trim())
            }
            className="btn-brand-pill flex w-full items-center justify-center space-x-2 px-8 py-3 text-xs shadow-md sm:w-auto"
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
