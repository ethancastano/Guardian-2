import React, { useState, useEffect } from 'react';
import { FileText, Check, X, Download, Folder, Database, ExternalLink, ThumbsUp, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import JSZip from 'jszip';

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
  recommendation: string | null;
  approver: string | null;
  profiles?: {
    full_name: string;
  };
}

interface CaseFile {
  id: string;
  name: string;
  size: number;
  lastModified: string;
  type: string;
  file_path: string;
}

export function Recommendation() {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [caseFiles, setCaseFiles] = useState<CaseFile[]>([]);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    loadRecommendedCases();
  }, []);

  const loadRecommendedCases = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('ctrs')
        .select(`
          *,
          profiles:current_owner (
            full_name
          )
        `)
        .eq('approver', user.id)
        .eq('status', 'Submitted')
        .order('gaming_day', { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error loading recommended cases:', error);
      setError('Failed to load recommended cases');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCaseFiles = async (id: string) => {
    try {
      setIsLoading(true);
      const { data: files, error } = await supabase
        .from('case_files')
        .select('*')
        .eq('ctr_id', id);

      if (error) throw error;

      setCaseFiles(files.map(file => ({
        id: file.id,
        name: file.file_name,
        size: file.file_size,
        lastModified: new Date(file.last_modified).toLocaleString(),
        type: file.file_type,
        file_path: file.file_path
      })));

      setSelectedCase(id);
      setShowFilesModal(true);
    } catch (error) {
      console.error('Error loading case files:', error);
      setError('Failed to load case files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadAllFiles = async (id: string) => {
    try {
      setIsDownloading(true);
      const zip = new JSZip();
      const currentCase = cases.find(c => c.ctr_id === id);
      
      if (!currentCase) {
        throw new Error('Case not found');
      }

      // Create a folder in the zip with case details
      const folderName = `${id}_${currentCase.first_name}_${currentCase.last_name}`;
      const folder = zip.folder(folderName);
      
      if (!folder) {
        throw new Error('Failed to create zip folder');
      }

      // Download each file and add to zip
      for (const file of caseFiles) {
        try {
          const { data, error } = await supabase.storage
            .from('case-files')
            .download(file.file_path);

          if (error) throw error;
          folder.file(file.name, data);
        } catch (error) {
          console.error(`Error downloading file ${file.name}:`, error);
        }
      }

      // Generate and download the zip file
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${folderName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading files:', error);
      setError('Failed to download files');
    } finally {
      setIsDownloading(false);
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

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ctrs')
        .update({ status: 'Approved' })
        .eq('ctr_id', id);

      if (error) throw error;
      await loadRecommendedCases();
    } catch (error) {
      console.error('Error approving case:', error);
      setError('Failed to approve case');
    }
  };

  const handleReject = async (id: string) => {
    try {
      // Get the case details first to preserve the current owner
      const { data: caseData, error: caseError } = await supabase
        .from('ctrs')
        .select('current_owner')
        .eq('ctr_id', id)
        .single();

      if (caseError) throw caseError;

      // Update the case status to Under Review and clear approver/recommendation
      // but keep the original owner so it goes back to their review
      const { error: updateError } = await supabase
        .from('ctrs')
        .update({ 
          status: 'Under Review',
          approver: null,
          recommendation: null,
          current_owner: caseData.current_owner
        })
        .eq('ctr_id', id);

      if (updateError) throw updateError;
      await loadRecommendedCases();
    } catch (error) {
      console.error('Error rejecting case:', error);
      setError('Failed to reject case');
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-900 shadow-md rounded-lg overflow-hidden">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Gaming Day</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Submitted By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ship</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Recommendation</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cash In</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cash Out</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {cases.map((caseItem) => (
              <tr 
                key={caseItem.ctr_id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApprove(caseItem.ctr_id || '')}
                      className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(caseItem.ctr_id || '')}
                      className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </button>
                    <button
                      onClick={() => loadCaseFiles(caseItem.ctr_id || '')}
                      className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                    >
                      <Folder className="w-4 h-4 mr-1" />
                      View Files
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 dark:text-purple-400 font-medium">{caseItem.ctr_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {formatDate(caseItem.gaming_day)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {caseItem.profiles?.full_name || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{caseItem.ship}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {`${caseItem.first_name} ${caseItem.last_name}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {caseItem.recommendation || 'No recommendation'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {formatCurrency(caseItem.cash_in_total)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {formatCurrency(caseItem.cash_out_total)}
                </td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  No cases pending recommendation
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Files Modal */}
      {showFilesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-2xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Case Files
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => selectedCase && handleDownloadAllFiles(selectedCase)}
                  disabled={isDownloading || caseFiles.length === 0}
                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4 mr-1" />
                  {isDownloading ? 'Downloading...' : 'Download All'}
                </button>
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
            </div>
            <div className="p-4">
              {caseFiles.length === 0 ? (
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
                        <FileText className="w-4 h-4 mr-2 text-purple-500" />
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