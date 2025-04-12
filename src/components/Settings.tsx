import React, { useState, useEffect, useRef } from 'react';
import { Camera, Bell, Lock, Save, X, Plus, Trash2, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReactCrop, { Crop as CropType, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { v4 as uuidv4 } from 'uuid';

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface Profile {
  id: string;
  avatar_url: string | null;
  roles: Role[];
  first_name: string | null;
  last_name: string | null;
}

const AVAILABLE_ROLES = ['Admin', 'Analyst', 'Manager'] as const;
type Role = typeof AVAILABLE_ROLES[number];

type Crop = CropType & {
  aspect?: number;
  unit: 'px' | '%';
};

const DEFAULT_CROP: Crop = {
  unit: 'px',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  aspect: 1
};

const getInitials = (firstName: string, lastName: string): string => {
  const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
  const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
  return `${firstInitial}${lastInitial}`;
};

export function Settings() {
  const [avatar, setAvatar] = useState<string>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roles, setRoles] = useState<Role[]>(['Analyst']);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImage, setCropImage] = useState<string>('');
  const [crop, setCrop] = useState<Crop>(DEFAULT_CROP);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    {
      id: 'new-cases',
      label: 'New Case Assignments',
      description: 'Receive notifications when new cases are assigned to you',
      enabled: true,
    },
    {
      id: 'case-updates',
      label: 'Case Updates',
      description: 'Get notified when there are updates to your cases',
      enabled: true,
    },
    {
      id: 'approvals',
      label: 'Approval Requests',
      description: 'Receive notifications for pending approval requests',
      enabled: true,
    },
    {
      id: 'team-updates',
      label: 'Team Updates',
      description: 'Get notified about team member changes and updates',
      enabled: false,
    },
  ]);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (!completedCrop || !imgRef.current || !previewCanvasRef.current) return;

    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    const crop = completedCrop;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.width = crop.width;
    canvas.height = crop.height;

    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );
  }, [completedCrop]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('avatar_url, roles, first_name, last_name')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (profile) {
        if (profile.avatar_url) setAvatar(profile.avatar_url);
        if (profile.roles) setRoles(profile.roles);
        if (profile.first_name) setFirstName(profile.first_name);
        if (profile.last_name) setLastName(profile.last_name);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load profile');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result as string);
      setShowCropModal(true);
      setCrop(DEFAULT_CROP);
      setCompletedCrop(null);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async () => {
    if (!completedCrop || !previewCanvasRef.current) return;

    try {
      setIsUploading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        previewCanvasRef.current?.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/jpeg',
          0.95
        );
      });

      const fileName = `${user.id}/${uuidv4()}.jpg`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const publicUrl = data.publicUrl;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setAvatar(publicUrl);
      setShowCropModal(false);
      setCropImage('');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setError('Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      alert('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    }
  };

  const handleAddRole = () => {
    const availableRoles = AVAILABLE_ROLES.filter(role => !roles.includes(role));
    if (availableRoles.length > 0) {
      setRoles([...roles, availableRoles[0]]);
    }
  };

  const handleRemoveRole = (roleToRemove: Role) => {
    if (roles.length > 1) {
      setRoles(roles.filter(role => role !== roleToRemove));
    }
  };

  const handleRoleChange = (oldRole: Role, newRole: Role) => {
    setRoles(roles.map(role => role === oldRole ? newRole : role));
  };

  const handleSaveRoles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          roles,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg';
      successMessage.textContent = 'Roles updated successfully';
      document.body.appendChild(successMessage);
      
      // Remove the message after 3 seconds
      setTimeout(() => {
        document.body.removeChild(successMessage);
      }, 3000);
    } catch (error) {
      console.error('Error updating roles:', error);
      // Show error message
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg';
      errorMessage.textContent = 'Failed to update roles';
      document.body.appendChild(errorMessage);
      
      // Remove the message after 3 seconds
      setTimeout(() => {
        document.body.removeChild(errorMessage);
      }, 3000);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      alert('Password updated successfully');
    } catch (error) {
      console.error('Error updating password:', error);
      alert('Failed to update password');
    }
  };

  const handleNotificationToggle = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, enabled: !notification.enabled }
          : notification
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Profile Settings</h2>
          
          <div className="flex items-start space-x-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-semibold">
                {getInitials(firstName, lastName)}
              </div>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full text-white cursor-pointer hover:bg-blue-700 transition-colors"
              >
                <User className="w-4 h-4" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
                ref={fileInputRef}
              />
            </div>
            
            {error && (
              <div className="text-red-600 text-sm mt-2">{error}</div>
            )}
            
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800 dark:text-white"
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800 dark:text-white"
                    placeholder="Enter your last name"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveProfile}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Profile
              </button>
            </div>
          </div>

          {/* Roles section */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Roles
            </label>
            <div className="space-y-2">
              {roles.map((role, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <select
                    value={role}
                    onChange={(e) => handleRoleChange(role, e.target.value as Role)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800 dark:text-white"
                  >
                    {AVAILABLE_ROLES.map((availableRole) => (
                      <option 
                        key={availableRole} 
                        value={availableRole}
                        disabled={roles.includes(availableRole) && role !== availableRole}
                      >
                        {availableRole}
                      </option>
                    ))}
                  </select>
                  {roles.length > 1 && (
                    <button
                      onClick={() => handleRemoveRole(role)}
                      className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between">
              <button
                onClick={handleAddRole}
                disabled={roles.length === AVAILABLE_ROLES.length}
                className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                  roles.length === AVAILABLE_ROLES.length
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'text-white bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Role
              </button>
              <button
                onClick={handleSaveRoles}
                className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-1" />
                Save Roles
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Lock className="w-5 h-5 text-gray-400 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Change Password</h2>
          </div>
          
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800 dark:text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800 dark:text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800 dark:text-white"
                required
              />
            </div>
            
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Save className="w-4 h-4 mr-2" />
              Update Password
            </button>
          </form>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Bell className="w-5 h-5 text-gray-400 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Settings</h2>
          </div>
          
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700 last:border-0"
              >
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {notification.label}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {notification.description}
                  </p>
                </div>
                <button
                  onClick={() => handleNotificationToggle(notification.id)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    notification.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      notification.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {showCropModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Crop Profile Picture
                </h3>
                <button
                  onClick={() => {
                    setShowCropModal(false);
                    setCropImage('');
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    src={cropImage}
                    alt="Crop preview"
                    className="max-h-[60vh] w-auto mx-auto"
                  />
                </ReactCrop>
                <canvas
                  ref={previewCanvasRef}
                  className="hidden"
                />
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCropModal(false);
                    setCropImage('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropComplete}
                  disabled={isUploading || !completedCrop}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                    isUploading || !completedCrop
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isUploading ? 'Uploading...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}