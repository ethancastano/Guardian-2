import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Calendar, Upload, Download, X, Plus, File, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Patron {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone_number: string | null;
  email_address: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  ssn: string | null;
  occupation: string | null;
  id_type: 'DL' | 'Passport' | null;
  id_number: string | null;
  id_state: string | null;
  id_country: string | null;
  ctrs?: {
    ctr_id: string;
    gaming_day: string;
    status: string;
    ship: string;
    cash_in_total: number;
    cash_out_total: number;
  }[];
  form_8300s?: {
    form_id: string;
    gaming_day: string;
    status: string;
    ship: string;
    cash_in_total: number;
    cash_out_total: number;
  }[];
}

interface PatronFile {
  id: string;
  name: string;
  size: number;
  lastModified: string;
  type: string;
  file_path: string;
  description?: string;
}

export function Database() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patron[]>([]);
  const [selectedPatron, setSelectedPatron] = useState<Patron | null>(null);
  const [patronFiles, setPatronFiles] = useState<PatronFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileDescription, setFileDescription] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const maskSensitiveInfo = (info: string | null): string => {
    if (!info) return 'Not provided';
    if (!showSensitiveInfo) {
      if (info.includes('@')) {
        const [local, domain] = info.split('@');
        return `${local[0]}${'*'.repeat(local.length - 1)}@${domain}`;
      } else if (info.includes('-')) {
        return info.replace(/[0-9]/g, '*');
      } else if (info.length > 4) {
        return `${info[0]}${'*'.repeat(info.length - 2)}${info[info.length - 1]}`;
      }
      return '*'.repeat(info.length);
    }
    return info;
  };

  const searchPatrons = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [firstName, lastName] = query.trim().split(' ');

      let supabaseQuery = supabase
        .from('patrons')
        .select(`
          *,
          ctrs (
            ctr_id,
            gaming_day,
            status,
            ship,
            cash_in_total,
            cash_out_total
          ),
          form_8300s (
            form_id,
            gaming_day,
            status,
            ship,
            cash_in_total,
            cash_out_total
          )
        `)
        .order('created_at', { ascending: false });

      if (lastName) {
        supabaseQuery = supabaseQuery
          .ilike('first_name', `${firstName}%`)
          .ilike('last_name', `${lastName}%`);
      } else {
        supabaseQuery = supabaseQuery
          .or(`first_name.ilike.${firstName}%,last_name.ilike.${firstName}%`);
      }

      const { data, error: searchError } = await supabaseQuery;

      if (searchError) throw searchError;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching patrons:', error);
      setError('Failed to search patrons');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPatronFiles = async (patronId: string) => {
    try {
      const { data, error } = await supabase
        .from('patron_files')
        .select('id, file_name, file_size, file_type, file_path, last_modified, description')
        .eq('patron_id', patronId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match the PatronFile interface
      const transformedFiles = (data || []).map(file => ({
        id: file.id,
        name: file.file_name,
        size: file.file_size,
        type: file.file_type,
        file_path: file.file_path,
        lastModified: file.last_modified,
        description: file.description
      }));

      setPatronFiles(transformedFiles);
    } catch (error) {
      console.error('Error loading patron files:', error);
      setError('Failed to load patron files');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedPatron || !selectedFile) return;

    try {
      setIsUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const timestamp = Date.now();
      const uniquePrefix = `${selectedPatron.id}/${timestamp}-`;
      const filePath = uniquePrefix + selectedFile.name;

      const { error: storageError } = await supabase.storage
        .from('patron-files')
        .upload(filePath, selectedFile);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('patron_files')
        .insert({
          patron_id: selectedPatron.id,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          file_path: filePath,
          last_modified: new Date(selectedFile.lastModified).toISOString(),
          user_id: user.id,
          description: fileDescription
        });

      if (dbError) throw dbError;

      await loadPatronFiles(selectedPatron.id);
      setFileDescription('');
      setSelectedFile(null);
      setShowUploadModal(false);
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileDelete = async (fileId: string, filePath: string) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('patron-files')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('patron_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      if (selectedPatron) {
        await loadPatronFiles(selectedPatron.id);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Failed to delete file');
    }
  };

  const handleFileDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('patron-files')
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (searchQuery) {
        searchPatrons(searchQuery);
      }
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedPatron) {
      loadPatronFiles(selectedPatron.id);
    }
  }, [selectedPatron]);

  return (
    <div className="space-y-4">
      {/* Search Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patron name..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            />
          </div>
          
          {isLoading && (
            <div className="text-center py-4 text-gray-600 dark:text-gray-400">
              Searching...
            </div>
          )}

          {error && (
            <div className="text-center py-4 text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-6 space-y-4">
              {searchResults.map((patron) => (
                <div
                  key={patron.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => setSelectedPatron(patron)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {patron.first_name} {patron.last_name}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        DOB: {formatDate(patron.date_of_birth)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <div>{patron.ctrs?.length || 0} CTR{patron.ctrs?.length !== 1 ? 's' : ''}</div>
                      <div>{patron.form_8300s?.length || 0} Form 8300{patron.form_8300s?.length !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Patron Details */}
      {selectedPatron && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedPatron.first_name} {selectedPatron.last_name}
              </h2>
              <div className="flex items-center text-gray-600 dark:text-gray-400 mt-1">
                <Calendar className="h-4 w-4 mr-1" />
                Born: {formatDate(selectedPatron.date_of_birth)}
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
              >
                {showSensitiveInfo ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add File
              </button>
            </div>
          </div>

          {/* Patron Profile Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contact Information</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                <div className={`mt-1 text-sm text-gray-900 dark:text-gray-100 ${!showSensitiveInfo && 'blur-sm'}`}>
                  {maskSensitiveInfo(selectedPatron.phone_number)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                <div className={`mt-1 text-sm text-gray-900 dark:text-gray-100 ${!showSensitiveInfo && 'blur-sm'}`}>
                  {maskSensitiveInfo(selectedPatron.email_address)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                <div className={`mt-1 text-sm text-gray-900 dark:text-gray-100 ${!showSensitiveInfo && 'blur-sm'}`}>
                  {showSensitiveInfo ? (
                    <>
                      {selectedPatron.address_line || 'Not provided'}
                      {selectedPatron.city && `, ${selectedPatron.city}`}
                      {selectedPatron.state && `, ${selectedPatron.state}`}
                      {selectedPatron.country && `, ${selectedPatron.country}`}
                    </>
                  ) : (
                    maskSensitiveInfo(selectedPatron.address_line)
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Additional Information</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SSN</label>
                <div className={`mt-1 text-sm text-gray-900 dark:text-gray-100 ${!showSensitiveInfo && 'blur-sm'}`}>
                  {maskSensitiveInfo(selectedPatron.ssn)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Occupation</label>
                <div className={`mt-1 text-sm text-gray-900 dark:text-gray-100 ${!showSensitiveInfo && 'blur-sm'}`}>
                  {maskSensitiveInfo(selectedPatron.occupation)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Identification</label>
                <div className={`mt-1 text-sm text-gray-900 dark:text-gray-100 ${!showSensitiveInfo && 'blur-sm'}`}>
                  {selectedPatron.id_type ? (
                    showSensitiveInfo ? (
                      <>
                        {selectedPatron.id_type}: {selectedPatron.id_number}
                        {selectedPatron.id_state && ` (${selectedPatron.id_state}`}
                        {selectedPatron.id_country && `, ${selectedPatron.id_country})`}
                      </>
                    ) : (
                      `${selectedPatron.id_type}: ${maskSensitiveInfo(selectedPatron.id_number)}`
                    )
                  ) : (
                    'Not provided'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Files Section */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Files
            </h3>
            <div className="space-y-4">
              {patronFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-grow">
                        <File className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" />
                        <div className="min-w-0 flex-grow">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(file.size)} • {formatDate(file.lastModified)}
                          </p>
                          {file.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              {file.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleFileDownload(file.file_path, file.name)}
                          className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleFileDelete(file.id, file.file_path)}
                          className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {patronFiles.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No files uploaded yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Upload File
                </h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setFileDescription('');
                    setSelectedFile(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    File
                  </label>
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500 dark:text-gray-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      dark:file:bg-blue-900 dark:file:text-blue-200"
                  />
                  {selectedFile && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={fileDescription}
                    onChange={(e) => setFileDescription(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800 dark:text-white"
                    rows={3}
                    placeholder="Add a description for this file..."
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setFileDescription('');
                    setSelectedFile(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={!selectedFile || isUploading}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                    selectedFile && !isUploading
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-blue-400 cursor-not-allowed'
                  }`}
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}