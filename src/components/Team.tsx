import React, { useState, useEffect } from 'react';
import { Mail, Phone, Calendar, UserPlus, Settings, Save, X, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  avatar_url: string | null;
  roles: Role[];
  is_admin: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  role: Role;
  email: string;
  phone: string;
  joinDate: string;
  avatar: string;
  roles: Role[];
  is_admin: boolean;
}

const AVAILABLE_ROLES = ['Admin', 'Analyst', 'Manager'] as const;
type Role = typeof AVAILABLE_ROLES[number];

export function Team() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTeamMembers();
    checkAdminStatus();

    // Subscribe to profile changes
    const subscription = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          // Reload team members when any profile changes
          loadTeamMembers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setIsAdmin(profile?.is_admin || false);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const loadTeamMembers = async () => {
    try {
      setIsLoading(true);
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const defaultRole: Role = 'Analyst';
      const mappedMembers: TeamMember[] = (profiles as Profile[]).map(profile => {
        // Filter and validate roles from the database
        const validRoles = Array.isArray(profile.roles) 
          ? profile.roles.filter((role): role is Role => 
              AVAILABLE_ROLES.includes(role as Role)
            )
          : [];

        // Ensure at least one valid role
        const finalRoles = validRoles.length > 0 ? validRoles : [defaultRole];
        
        return {
          id: profile.id,
          name: profile.full_name || 'Unknown',
          role: finalRoles[0],
          email: profile.email || '',
          phone: profile.phone || '',
          joinDate: profile.created_at,
          avatar: profile.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?fit=crop&w=128&h=128&q=80',
          roles: finalRoles,
          is_admin: profile.is_admin || false
        };
      });

      setTeamMembers(mappedMembers);
    } catch (error) {
      console.error('Error loading team members:', error);
      setError('Failed to load team members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRoles: Role[]) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          roles: newRoles,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId);

      if (error) throw error;

      setTeamMembers(prev =>
        prev.map(member =>
          member.id === memberId
            ? { ...member, roles: newRoles, role: newRoles[0] || 'Analyst' }
            : member
        )
      );
    } catch (error) {
      console.error('Error updating roles:', error);
      setError('Failed to update roles');
    }
  };

  const handleAdminToggle = async (memberId: string, isAdmin: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_admin: isAdmin,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId);

      if (error) throw error;

      setTeamMembers(prev =>
        prev.map(member =>
          member.id === memberId
            ? { ...member, is_admin: isAdmin }
            : member
        )
      );
    } catch (error) {
      console.error('Error updating admin status:', error);
      setError('Failed to update admin status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Team Members</h2>
            {isAdmin && (
              <button
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Member
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {teamMembers.map((member) => (
              <div 
                key={member.id}
                className="flex items-start space-x-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {member.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {member.roles.map((role, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {role}
                          </span>
                        ))}
                        {member.is_admin && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => setEditingMember(editingMember === member.id ? null : member.id)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      >
                        <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    )}
                  </div>
                  
                  {editingMember === member.id && isAdmin && (
                    <div className="mt-4 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Roles
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {AVAILABLE_ROLES.map((role) => (
                            <button
                              key={role}
                              onClick={() => {
                                const newRoles = member.roles.includes(role)
                                  ? member.roles.filter(r => r !== role)
                                  : [...member.roles, role];
                                if (newRoles.length > 0) {
                                  handleRoleChange(member.id, newRoles);
                                }
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                member.roles.includes(role)
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {role}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={member.is_admin}
                            onChange={(e) => handleAdminToggle(member.id, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Admin Access</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Mail className="w-4 h-4 mr-2" />
                      {member.email}
                    </div>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Phone className="w-4 h-4 mr-2" />
                      {member.phone}
                    </div>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="w-4 h-4 mr-2" />
                      Joined {new Date(member.joinDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}