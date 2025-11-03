import { useCallback, useState } from 'react';
import { Button } from './ui/button';
import { ArrowLeft, FileDown, Loader2, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { InterviewReport } from './InterviewReport';
import type { InterviewReportData } from './InterviewReport';

interface ReportPageProps {
  reportData: InterviewReportData | null;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
}

export function ReportPage({ reportData, onBack, isLoading, error, onRetry }: ReportPageProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (!reportData) {
      return;
    }
    setIsExporting(true);
    setExportError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/interviews/${reportData.interview.interview_id}/report.pdf`);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message = body?.detail ?? `Request failed with status ${response.status}`;
        throw new Error(message);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportData.report_id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (exportException) {
      console.error('Failed to export interview report PDF', exportException);
      setExportError('Unable to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [reportData]);

  return (
    <div className="h-screen w-screen overflow-auto bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="
          backdrop-blur-xl bg-white/80 border border-gray-200/50
          rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-6
          shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
          relative
          before:absolute before:inset-0 before:rounded-2xl sm:before:rounded-3xl
          before:bg-gradient-to-br before:from-white/40 before:to-transparent
          before:pointer-events-none
        ">
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={onBack}
                className="
                  bg-white/80 border-gray-300/50 text-gray-700
                  hover:bg-gray-50 hover:border-gray-400/50
                  shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                "
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Interviews
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={handleExport}
              className="
                bg-white/80 border-gray-300/50 text-gray-700
                hover:bg-gray-50 hover:border-gray-400/50
                shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                hidden sm:flex
                disabled:opacity-60
              "
              disabled={isLoading || !reportData || isExporting}
            >
              {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
          {exportError && (
            <div className="relative z-10 mt-3 text-xs text-red-600">
              {exportError}
            </div>
          )}
        </div>

        {/* Report Content */}
        {!isLoading && reportData && (
          <div className="sm:hidden mb-4">
            <Button
              variant="outline"
              onClick={handleExport}
              className="
                bg-white/80 border-gray-300/50 text-gray-700
                hover:bg-gray-50 hover:border-gray-400/50
                shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                w-full
                disabled:opacity-60
              "
              disabled={isLoading || !reportData || isExporting}
            >
              {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
        )}
        <div className="
          backdrop-blur-xl bg-white/80 border border-gray-200/50
          rounded-2xl sm:rounded-3xl p-6 sm:p-8
          shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
          relative
          before:absolute before:inset-0 before:rounded-2xl sm:before:rounded-3xl
          before:bg-gradient-to-br before:from-white/40 before:to-transparent
          before:pointer-events-none
        ">
          <div className="relative z-10">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-sm text-gray-600 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                Generating interview report...
              </div>
            )}
            {!isLoading && error && (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <AlertTriangle className="w-5 h-5 text-gray-600" />
                  {error}
                </div>
                {onRetry && (
                  <Button
                    variant="outline"
                    onClick={onRetry}
                    className="bg-white/80 border-gray-300/50 text-gray-700 hover:bg-gray-50 hover:border-gray-400/50"
                  >
                    Retry
                  </Button>
                )}
              </div>
            )}
            {!isLoading && !error && reportData && <InterviewReport data={reportData} />}
          </div>
        </div>
      </div>
    </div>
  );
}
