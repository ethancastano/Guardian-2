import React, { useState, useRef, ChangeEvent, useEffect, DragEvent } from 'react';
import { Folder, X, Upload, Download, FileText, Save, ArrowLeft, Send, Check, ArrowUpDown, Database, FilePlus, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sortCases } from '../lib/sorting';
import type { SortField, SortOrder } from '../lib/sorting';
import { generateCTRFromTemplate } from '../lib/pdf';
import { Case as ImportedCase } from '../types';

interface ExtendedCase extends ImportedCase {
  patron_id: string;
  folio_number?: string;
  voyage_total?: number;
  profiles?: {
    full_name: string;
  };
}

interface UnderReviewProps {
  cases: ImportedCase[];
  onStatusChange: (id: string, newStatus: string) => void;
}

interface OpenTab {
  id: string;
  label: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  lastModified: string;
  type: string;
  file_path: string;
}

interface CaseFiles {
  [key: string]: UploadedFile[];
}

interface TeamMember {
  id: string;
  full_name: string;
}

const RECOMMENDATIONS = [
  'File CTR',
  'File CTR - Data Exception Noted',
  'File CTR - Flag for PSA',
  'File CTR - Data Exception Noted - Flag for PSA',
  'Do not file CTR',
  'File 8300',
  'File 8300 - Data Exception Noted',
  'File 8300 - Flag for PSA',
  'File 8300 - Data Exception Noted - Flag for PSA',
  'Do not file 8300'
] as const;

type Recommendation = typeof RECOMMENDATIONS[number];

export function UnderReview({ cases, onStatusChange }: UnderReviewProps) {
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [caseFiles, setCaseFiles] = useState<CaseFiles>({});
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedApprover, setSelectedApprover] = useState<string>('');
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation>('File CTR');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [sortedCases, setSortedCases] = useState<ImportedCase[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [showCTRModal, setShowCTRModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<'CTRs' | '8300s'>('CTRs');
  const [form8300s, setForm8300s] = useState<ImportedCase[]>([]);

  useEffect(() => {
    loadTeamMembers();
    if (activeFormTab === '8300s') {
      load8300s();
    }
  }, [activeFormTab]);

  useEffect(() => {
    if (activeTab) {
      loadCaseFiles(activeTab);
    }
  }, [activeTab]);

  const underReviewCases = activeFormTab === 'CTRs' 
    ? cases.filter(caseItem => caseItem.status === 'Under Review' && caseItem.ctr_id)
    : form8300s.filter(caseItem => caseItem.status === 'Under Review' && caseItem.form_id);

  useEffect(() => {
    setSortedCases(sortCases(underReviewCases, sortField, sortOrder));
  }, [underReviewCases, sortField, sortOrder]);

  const load8300s = async () => {
    try {
      const { data, error } = await supabase
        .from('form_8300s')
        .select(`
          *,
          profiles:current_owner (
            full_name
          )
        `)
        .eq('status', 'Under Review')
        .order('gaming_day', { ascending: false });

      if (error) throw error;
      setForm8300s(data || []);
    } catch (error) {
      console.error('Error loading 8300s:', error);
      setError('Failed to load 8300s');
    }
  };

  const loadTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const loadCaseFiles = async (id: string) => {
    try {
      setIsLoading(true);
      const { data: files, error } = await supabase
        .from('case_files')
        .select('*')
        .eq(activeFormTab === 'CTRs' ? 'ctr_id' : 'form_id', id);

      if (error) throw error;

      setCaseFiles(prev => ({
        ...prev,
        [id]: files.map(file => ({
          id: file.id,
          name: file.file_name,
          size: file.file_size,
          lastModified: new Date(file.last_modified).toLocaleString(),
          type: file.file_type,
          file_path: file.file_path
        }))
      }));
    } catch (error) {
      console.error('Error loading case files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenFolder = (id: string) => {
    const currentCase = underReviewCases.find(c => {
      const caseId = activeFormTab === 'CTRs' ? c.ctr_id : c.form_id;
      return caseId === id;
    });
    
    if (!currentCase) return;

    const [month, day] = new Date(currentCase.gaming_day || '').toLocaleDateString().split('/');

    if (!openTabs.find(tab => tab.id === id)) {
      const newTab = {
        id,
        label: `${currentCase.first_name[0]}.${currentCase.last_name} ${month}/${day}`
      };
      setOpenTabs([...openTabs, newTab]);
    }
    setActiveTab(id);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (unsavedChanges.has(id)) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close this tab?');
      if (!confirmClose) return;
    }
    setOpenTabs(openTabs.filter(tab => tab.id !== id));
    if (activeTab === id) {
      setActiveTab(openTabs[openTabs.length - 2]?.id || null);
    }
    setUnsavedChanges(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleReturnToCase = async (id: string) => {
    try {
      const table = activeFormTab === 'CTRs' ? 'ctrs' : 'form_8300s';
      const idField = activeFormTab === 'CTRs' ? 'ctr_id' : 'form_id';

      const { error: updateError } = await supabase
        .from(table)
        .update({ status: 'Assigned' })
        .eq(idField, id);

      if (updateError) throw updateError;

      onStatusChange(id, 'Assigned');

      if (activeFormTab === '8300s') {
        await load8300s();
      }

      setSortedCases(prev => prev.filter(c => {
        const caseId = activeFormTab === 'CTRs' ? c.ctr_id : c.form_id;
        return caseId !== id;
      }));

    } catch (error) {
      console.error('Error returning case:', error);
      setError('Failed to return case to My Cases');
    }
  };

  const handleSubmit = async () => {
    if (!selectedApprover || !selectedRecommendation) return;

    try {
      setIsSubmitting(true);
      const casesToSubmit = Array.from(selectedCases);

      for (const caseId of casesToSubmit) {
        const currentCase = underReviewCases.find(c => {
          const id = activeFormTab === 'CTRs' ? c.ctr_id : c.form_id;
          return id === caseId;
        }) as ExtendedCase | undefined;

        if (!currentCase || !currentCase.patron_id) {
          console.error(`Case or patron information not found for case ${caseId}`);
          continue;
        }

        const caseFilesList = caseFiles[caseId] || [];

        // Copy files to patron database
        for (const file of caseFilesList) {
          try {
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('case-files')
              .download(file.file_path);

            if (downloadError) throw downloadError;

            const patronFilePath = `${currentCase.patron_id}/${file.name}`;
            const { error: uploadError } = await supabase.storage
              .from('patron-files')
              .upload(patronFilePath, fileData, {
                contentType: file.type,
                upsert: true
              });

            if (uploadError) throw uploadError;

            const { error: dbError } = await supabase
              .from('patron_files')
              .insert({
                patron_id: currentCase.patron_id,
                file_name: file.name,
                file_size: file.size,
                file_type: file.type,
                file_path: patronFilePath,
                last_modified: new Date(file.lastModified).toISOString(),
                user_id: (await supabase.auth.getUser()).data.user?.id,
                description: `Copied from ${activeFormTab === 'CTRs' ? 'CTR' : '8300'} ${caseId}`
              });

            if (dbError) throw dbError;
          } catch (error) {
            console.error(`Error copying file ${file.name} for case ${caseId}:`, error);
          }
        }

        // Update case status
        const table = activeFormTab === 'CTRs' ? 'ctrs' : 'form_8300s';
        const idField = activeFormTab === 'CTRs' ? 'ctr_id' : 'form_id';

        const { error: updateError } = await supabase
          .from(table)
          .update({
            status: 'Submitted',
            approver: selectedApprover,
            recommendation: selectedRecommendation
          })
          .eq(idField, caseId);

        if (updateError) throw updateError;

        onStatusChange(caseId, 'Submitted');
      }

      if (activeFormTab === '8300s') {
        await load8300s();
      }

      // Remove submitted cases from the list
      setSortedCases(prev => prev.filter(c => {
        const caseId = activeFormTab === 'CTRs' ? c.ctr_id : c.form_id;
        return !selectedCases.has(caseId || '');
      }));

      setShowSubmitModal(false);
      setSelectedCaseId(null);
      setSelectedApprover('');
      setSelectedRecommendation(activeFormTab === 'CTRs' ? 'File CTR' : 'File 8300');
      setSelectedCases(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Error submitting cases:', error);
      setError('Failed to submit cases');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    await handleFileUpload(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (!activeTab) return;

    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      for (const file of files) {
        const { data: storageData, error: storageError } = await supabase.storage
          .from('case-files')
          .upload(`${activeTab}/${file.name}`, file);

        if (storageError) throw storageError;

        const { data: dbData, error: dbError } = await supabase
          .from('case_files')
          .insert({
            [activeFormTab === 'CTRs' ? 'ctr_id' : 'form_id']: activeTab,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            file_path: storageData.path,
            last_modified: new Date().toISOString(),
            user_id: user.id
          })
          .select()
          .single();

        if (dbError) throw dbError;

        setCaseFiles(prev => ({
          ...prev,
          [activeTab]: [
            ...(prev[activeTab] || []),
            {
              id: dbData.id,
              name: file.name,
              size: file.size,
              lastModified: new Date().toLocaleString(),
              type: file.type,
              file_path: storageData.path
            }
          ]
        }));
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      setError('Failed to upload files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!activeTab) return;

    try {
      setIsLoading(true);

      const { error: storageError } = await supabase.storage
        .from('case-files')
        .remove([`${activeTab}/${fileName}`]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('case_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      setCaseFiles(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].filter(file => file.id !== fileId)
      }));
    } catch (error) {
      console.error('Error deleting file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToPatronDatabase = async (id: string) => {
    if (!activeTab) return;

    try {
      setIsLoading(true);

      const currentCase = underReviewCases.find(c => {
        const caseId = activeFormTab === 'CTRs' ? c.ctr_id : c.form_id;
        return caseId === id;
      });

      if (!currentCase || !currentCase.patron_id) {
        throw new Error('Case or patron information not found');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const caseFilesList = caseFiles[id] || [];

      for (const file of caseFilesList) {
        if (file.name.includes('AML Threshold')) {
          continue;
        }

        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('case-files')
            .download(file.file_path);

          if (downloadError) throw downloadError;

          const patronFilePath = `${currentCase.patron_id}/${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('patron-files')
            .upload(patronFilePath, fileData, {
              contentType: file.type,
              upsert: true
            });

          if (uploadError) throw uploadError;

          const { error: dbError } = await supabase
            .from('patron_files')
            .insert({
              patron_id: currentCase.patron_id,
              file_name: file.name,
              file_size: file.size,
              file_type: file.type,
              file_path: patronFilePath,
              last_modified: new Date(file.lastModified).toISOString(),
              user_id: user.id,
              description: `Copied from ${activeFormTab === 'CTRs' ? 'CTR' : '8300'} ${id}`
            });

          if (dbError) throw dbError;
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
        }
      }

      alert('Files saved to patron database successfully');
    } catch (error) {
      console.error('Error saving to patron database:', error);
      setError('Failed to save files to patron database');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      if (activeFormTab === 'CTRs') {
        const { data, error } = await supabase
          .from('ctrs')
          .select(`
            *,
            profiles:current_owner (
              full_name
            )
          `)
          .order('gaming_day', { ascending: false });

        if (error) throw error;
        onStatusChange(data[0].ctr_id, data[0].status);
      } else {
        await load8300s();
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    return (
      <ArrowUpDown 
        className={`w-4 h-4 ml-1 ${
          sortField === field ? 'text-purple-500' : 'text-gray-400'
        }`} 
      />
    );
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!activeTab) return;

    const files = Array.from(e.dataTransfer.files);
    setIsLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      for (const file of files) {
        try {
          const { data: storageData, error: storageError } = await supabase.storage
            .from('case-files')
            .upload(`${activeTab}/${file.name}`, file);

          if (storageError) throw storageError;

          const { data: dbData, error: dbError } = await supabase
            .from('case_files')
            .insert({
              [activeFormTab === 'CTRs' ? 'ctr_id' : 'form_id']: activeTab,
              file_name: file.name,
              file_size: file.size,
              file_type: file.type,
              file_path: storageData.path,
              last_modified: new Date(file.lastModified).toISOString(),
              user_id: user.id
            })
            .select()
            .single();

          if (dbError) throw dbError;

          setCaseFiles(prev => ({
            ...prev,
            [activeTab]: [
              ...(prev[activeTab] || []),
              {
                id: dbData.id,
                name: file.name,
                size: file.size,
                lastModified: new Date(file.lastModified).toLocaleString(),
                type: file.type,
                file_path: storageData.path
              }
            ]
          }));
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Error handling dropped files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleGenerateCTR = async (caseId: string) => {
    try {
      setIsLoading(true);
      
      // Get the case data
      const currentCase = underReviewCases.find(c => c.ctr_id === caseId);
      if (!currentCase) {
        throw new Error('Case not found');
      }

      // Generate the CTR PDF
      const pdfBlob = await generateCTRFromTemplate({
        ctr_id: currentCase.ctr_id,
        gaming_day: currentCase.gaming_day,
        ship: currentCase.ship,
        first_name: currentCase.first_name,
        last_name: currentCase.last_name,
        date_of_birth: currentCase.date_of_birth,
        embark_date: currentCase.embark_date,
        debark_date: currentCase.debark_date,
        cash_in_total: currentCase.cash_in_total,
        cash_out_total: currentCase.cash_out_total,
        patron_id: currentCase.patron_id
      });

      // Create a download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CTR_${currentCase.first_name}_${currentCase.last_name}_${new Date(currentCase.gaming_day).toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Save the generated CTR to case files
      const file = new File([pdfBlob], link.download, { type: 'application/pdf' });
      await handleFileUpload([file]);

    } catch (error) {
      console.error('Error generating CTR:', error);
      setError('Failed to generate CTR');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCaseSelection = (id: string) => {
    setSelectedCases(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return newSelection;
    });
  };

  const handleFileDownload = async (filePath: string, fileName: string) => {
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors ${
              isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (!isSelectionMode) {
                setSelectedCases(new Set());
              }
            }}
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            {isSelectionMode ? 'Cancel Selection' : 'Select Cases'}
          </button>
        </div>
        
        {isSelectionMode && selectedCases.size > 0 && (
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setSelectedCaseId(Array.from(selectedCases)[0]);
                setShowSubmitModal(true);
              }}
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Selected ({selectedCases.size})
            </button>
            <button
              onClick={() => handleReturnToCase(Array.from(selectedCases)[0])}
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return Selected ({selectedCases.size})
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {(['CTRs', '8300s'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFormTab(tab)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeFormTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-900 shadow-md rounded-lg overflow-hidden">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {isSelectionMode && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Select
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('gaming_day')}
              >
                <div className="flex items-center">
                  Gaming Day
                  {getSortIcon('gaming_day')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('ship')}
              >
                <div className="flex items-center">
                  Ship
                  {getSortIcon('ship')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Name
                  {getSortIcon('name')}
                </div>
              </th>
              {activeFormTab === 'CTRs' ? (
                <>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('cash_in_total')}
                  >
                    <div className="flex items-center">
                      Cash In
                      {getSortIcon('cash_in_total')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('cash_out_total')}
                  >
                    <div className="flex items-center">
                      Cash Out
                      {getSortIcon('cash_out_total')}
                    </div>
                  </th>
                </>
              ) : (
                <>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('folio_number')}
                  >
                    <div className="flex items-center">
                      Folio #
                      {getSortIcon('folio_number')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Embark
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Debark
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('voyage_total')}
                  >
                    <div className="flex items-center">
                      Voyage Total
                      {getSortIcon('voyage_total')}
                    </div>
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedCases.map((caseItem) => {
              const id = caseItem.ctr_id || caseItem.form_id || '';
              return (
                <tr 
                  key={id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 ${
                    selectedCases.has(id) ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                  }`}
                >
                  {isSelectionMode && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleCaseSelection(id)}
                        className={`p-2 rounded-md ${
                          selectedCases.has(id)
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {!isSelectionMode && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedCaseId(id);
                            setShowSubmitModal(true);
                          }}
                          className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Submit
                        </button>
                        <button 
                          onClick={() => handleOpenFolder(id)}
                          className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                        >
                          <Folder className="w-4 h-4 mr-1" />
                          Open Folder
                        </button>
                        <button
                          onClick={() => handleReturnToCase(id)}
                          className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 transition-colors"
                        >
                          <ArrowLeft className="w-4 h-4 mr-1" />
                          Return to My Cases
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 font-medium">{id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(caseItem.gaming_day)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{caseItem.ship}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {`${caseItem.first_name} ${caseItem.last_name}`}
                  </td>
                  {activeFormTab === 'CTRs' ? (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatCurrency(caseItem.cash_in_total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatCurrency(caseItem.cash_out_total)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {caseItem.folio_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(caseItem.embark_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(caseItem.debark_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatCurrency(caseItem.voyage_total)}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* File Viewer Modal */}
      {activeTab && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg mt-4">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {openTabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 cursor-pointer border-r border-gray-200 dark:border-gray-700 ${
                  activeTab === tab.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Folder className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">{tab.label}</span>
                <button
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Case Files
              </h3>
              <div className="flex space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  className="hidden"
                  multiple
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  disabled={isLoading}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Upload
                </button>
                <button
                  onClick={() => handleGenerateCTR(activeTab)}
                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  disabled={isLoading}
                >
                  <FilePlus className="w-4 h-4 mr-1" />
                  Generate {activeFormTab === 'CTRs' ? 'CTR' : '8300'}
                </button>
                <button
                  onClick={() => handleSaveToPatronDatabase(activeTab)}
                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Database className="w-4 h-4 mr-1" />
                  Save to Database
                </button>
              </div>
            </div>

            <div
              ref={dropZoneRef}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            >
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-2"></div>
                  <p className="text-gray-500 dark:text-gray-400">Loading...</p>
                </div>
              ) : caseFiles[activeTab]?.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>Drag and drop files here or use the upload button</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {caseFiles[activeTab]?.map((file) => (
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
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDeleteFile(file.id, file.name)}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                        <button
                          onClick={() => handleFileDownload(file.file_path, file.name)}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        >
                          <Download className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Submit Case for Approval
                </h3>
                <button
                  onClick={() => {
                    setShowSubmitModal(false);
                    setSelectedCaseId(null);
                    setSelectedApprover('');
                    setSelectedRecommendation(activeFormTab === 'CTRs' ? 'File CTR' : 'File 8300');
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Approver
                  </label>
                  <select
                    value={selectedApprover}
                    onChange={(e) => setSelectedApprover(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select an approver</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Recommendation
                  </label>
                  <select
                    value={selectedRecommendation}
                    onChange={(e) => setSelectedRecommendation(e.target.value as Recommendation)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800 dark:text-white"
                  >
                    {RECOMMENDATIONS.filter(rec => 
                      activeFormTab === 'CTRs' 
                        ? rec.includes('CTR') || rec === 'Do not file CTR'
                        : rec.includes('8300') || rec === 'Do not file 8300'
                    ).map(rec => (
                      <option key={rec} value={rec}>
                        {rec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowSubmitModal(false);
                    setSelectedCaseId(null);
                    setSelectedApprover('');
                    setSelectedRecommendation(activeFormTab === 'CTRs' ? 'File CTR' : 'File 8300');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedApprover || !selectedRecommendation || isSubmitting}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                    selectedApprover && selectedRecommendation && !isSubmitting
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-blue-400 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}