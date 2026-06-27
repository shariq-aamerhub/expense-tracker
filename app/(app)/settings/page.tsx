'use client';

import { useRef, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<Record<string, number> | null>(null);

  async function handleExport() {
    try {
      const res = await fetch('/api/data/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup downloaded', 'success');
    } catch {
      showToast('Export failed', 'error');
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('This will overwrite ALL current data with the backup. Continue?')) {
      e.target.value = '';
      return;
    }

    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const res = await fetch('/api/data/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setImportResult(json.restored);
      showToast('Data restored successfully', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Import failed', 'error');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      <Card>
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Export Data</h2>
        <p className="text-xs text-gray-400 mb-4">
          Download a full backup of all expenses, groups, users, settlements, and months as a single JSON file.
        </p>
        <Button onClick={handleExport} className="w-full">
          <span className="flex items-center justify-center gap-2">
            <DownloadIcon />
            Download Backup
          </span>
        </Button>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Import Data</h2>
        <p className="text-xs text-gray-400 mb-4">
          Restore from a previously exported backup file. <span className="text-amber-600 font-medium">This will replace all current data.</span>
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImport}
        />
        <Button
          variant="secondary"
          className="w-full"
          loading={importing}
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="flex items-center justify-center gap-2">
            <UploadIcon />
            {importing ? 'Restoring…' : 'Choose Backup File'}
          </span>
        </Button>

        {importResult && (
          <div className="mt-4 bg-green-50 border border-green-100 rounded-xl p-3 space-y-1">
            <p className="text-xs font-semibold text-green-700 mb-2">Restored successfully</p>
            {Object.entries(importResult).map(([key, count]) => (
              <div key={key} className="flex justify-between text-xs text-green-600">
                <span className="capitalize">{key}</span>
                <span className="font-medium">{count} records</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
    </svg>
  );
}
