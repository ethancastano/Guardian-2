import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, ArrowUpDown, ChevronDown, ChevronRight, Folder, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sortCases } from '../lib/sorting';
import type { SortField, SortOrder } from '../lib/sorting';

interface Case {
  id: string;
  ctr_id?: string;
  form_id?: string;
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

interface MonthlyGroup {
  [key: string]: Case[];
}

type FolderType = 'CTRs' | '8300s' | 'PSAs';

export function Archive() {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [sortedCases, setSortedCases] = useState<Case[]>([]);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [caseFiles, setCaseFiles] = useState<any[]>([]);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [monthlyGroups, setMonthlyGroups] = useState<MonthlyGroup>({});
  const [activeFolder, setActiveFolder] = useState<FolderType>('CTRs');
  const [form8300s, setForm8300s] = useState<Case[]>([]);

  useEffect(() => {
    loadArchivedCases();
  }, [activeFolder]);

  useEffect(() => {
    const filteredCases = activeFolder === 'CTRs' 
      ? cases.filter(c => c.ctr_id && !c.recommendation?.includes('PSA'))
      : activeFolder === '8300s'
      ? form8300s.filter(c => c.form_id && !c.recommendation?.includes('PSA'))
      : [...cases, ...form8300s].filter(c => c.recommendation?.includes('PSA'));

    setSortedCases(sortCases(filteredCases, sortField, sortOrder));
    groupCasesByMonth(filteredCases);
  }, [cases, form8300s, sortField, sortOrder, activeFolder]);

  const groupCasesByMonth = (cases: Case[]) => {
    const groups: MonthlyGroup = {};
    
    cases.forEach(caseItem => {
      if (caseItem.gaming_day) {
        const date = new Date(caseItem.gaming_day);
        const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
        
        if (!groups[monthYear]) {
          groups[monthYear] = [];
        }
        groups[monthYear].push(caseItem);
      }
    });

    Object.keys(groups).forEach(month => {
      groups[month].sort((a, b) => {
        const dateA = new Date(a.gaming_day || '').getTime();
        const dateB = new Date(b.gaming_day || '').getTime();
        return dateB - dateA;
      });
    });

    setMonthlyGroups(groups);
  };

  const loadArchivedCases = async () => {
    try {
      setIsLoading(true);

      const { data: ctrData, error: ctrError } = await supabase
        .from('ctrs')
        .select(`
          *,
          profiles:current_owner (
            full_name
          )
        `)
        .eq('status', 'Approved')
        .order('gaming_day', { ascending: false });

      if (ctrError) throw ctrError;
      setCases(ctrData || []);

      const { data: form8300Data, error: form8300Error } = await supabase
        .from('form_8300s')
        .select(`
          *,
          profiles:current_owner (
            full_name
          )
        `)
        .eq('status', 'Approved')
        .order('gaming_day', { ascending: false });

      if (form8300Error) throw form8300Error;
      setForm8300s(form8300Data || []);

    } catch (error) {
      console.error('Error loading archived cases:', error);
      setError('Failed to load archived cases');
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
        .or(`ctr_id.eq.${id},form_id.eq.${id}`);

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

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
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
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {(['CTRs', '8300s', 'PSAs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFolder(tab)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeFolder === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              <div className="flex items-center space-x-2">
                <Folder className={`w-4 h-4 ${
                  activeFolder === tab
                    ? tab === 'CTRs' 
                      ? 'text-blue-500'
                      : tab === '8300s'
                      ? 'text-purple-500'
                      : 'text-red-500'
                    : 'text-gray-400'
                }`} />
                <span>{tab}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg">
        {Object.entries(monthlyGroups).map(([month, monthCases]) => (
          <div key={month} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
            <button
              onClick={() => toggleMonth(month)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Folder className={`w-5 h-5 ${
                  activeFolder === 'CTRs'
                    ? 'text-blue-500'
                    : activeFolder === '8300s'
                    ? 'text-purple-500'
                    : 'text-red-500'
                }`} />
                <span className="text-lg font-medium text-gray-900 dark:text-white">{month}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({monthCases.length} case{monthCases.length !== 1 ? 's' : ''})
                </span>
              </div>
              {expandedMonths.has(month) ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedMonths.has(month) && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Gaming Day</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ship</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">DOB</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Recommendation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Approver</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cash In</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cash Out</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {monthCases.map((caseItem) => {
                      const id = caseItem.ctr_id || caseItem.form_id || '';
                      return (
                        <tr 
                          key={id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => loadCaseFiles(id)}
                              className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Files
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 font-medium">
                            {id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {formatDate(caseItem.gaming_day)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {caseItem.ship}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {`${caseItem.first_name} ${caseItem.last_name}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {formatDate(caseItem.date_of_birth)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {caseItem.recommendation || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {caseItem.profiles?.full_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {formatCurrency(caseItem.cash_in_total)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {formatCurrency(caseItem.cash_out_total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        {Object.keys(monthlyGroups).length === 0 && (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            No archived cases found in this folder
          </div>
        )}
      </div>

      {/* Files Modal */}
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