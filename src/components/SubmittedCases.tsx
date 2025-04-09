import React, { useState, useEffect } from 'react';
import { FileText, ArrowLeft, Eye, X, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Case {
  id: string;
  ctr_id?: string;
  gaming_day: string | null;
  current_owner: string | null;
  status: string;
  ship: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  embark_date: string | null;
  debark_date: string | null;
  cash_in_total: number;
  cash_out_total: number;
  profiles?: {
    full_name: string;
  };
}

interface SubmittedCasesProps {
  cases: Case[];
  onStatusChange: (id: string, newStatus: string) => void;
}

interface CaseFile {
  id: string;
  name: string;
  size: number;
  lastModified: string;
  type: string;
  file_path: string;
}

export function SubmittedCases({ cases, onStatusChange }: SubmittedCasesProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [caseFiles, setCaseFiles] = useState<CaseFile[]>([]);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const submittedCases = cases.filter(c => c.status === 'Submitted' && c.ctr_id && c.current_owner === currentUserId);

  const handleWithdraw = async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('ctrs')
        .update({ status: 'Under Review' })
        .eq('ctr_id', id);

      if (updateError) throw updateError;
      onStatusChange(id, 'Under Review');
    } catch (error) {
      console.error('Error withdrawing case:', error);
      setError('Failed to withdraw case');
    }
  };

  const handleViewFiles = async (id: string) => {
    setSelectedCase(id);
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('case_files')
        .select('*')
        .eq('ctr_id', id);

      if (error) throw error;

      setCaseFiles(data.map(file => ({
        id: file.id,
        name: file.file_name,
        size: file.file_size,
        lastModified: new Date(file.last_modified).toLocaleString(),
        type: file.file_type,
        file_path: file.file_path
      })));

      setShowFilesModal(true);
    } catch (error) {
      console.error('Error loading case files:', error);
      setError('Failed to load case files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('case-files')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download file');
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount === null || amount === undefined) return '$0.00';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return '$0.00';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-900 shadow-md rounded-lg overflow-hidden">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Gaming Day</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Current Owner</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ship</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cash In</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cash Out</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {submittedCases.map((caseItem) => (
              <tr 
                key={caseItem.ctr_id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewFiles(caseItem.ctr_id || '')}
                      className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => handleWithdraw(caseItem.ctr_id || '')}
                      className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Withdraw
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Submitted
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 font-medium">{caseItem.ctr_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {formatDate(caseItem.gaming_day)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {caseItem.profiles?.full_name || 'Unassigned'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{caseItem.ship}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {`${caseItem.first_name} ${caseItem.last_name}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {formatCurrency(caseItem.cash_in_total)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {formatCurrency(caseItem.cash_out_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* File Viewer Modal */}
      {showFilesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-2xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Case Files
              </h3>
              <button
                onClick={() => {
                  setShowFilesModal(false);
                  setSelectedCase(null);
                  setCaseFiles([]);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : caseFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No files found
                </div>
              ) : (
                <div className="space-y-2">
                  {caseFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(file.size)} • {file.lastModified}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleFileDownload(file.file_path, file.name)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      >
                        <Download className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}