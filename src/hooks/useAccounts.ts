'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';
import { useAppStore } from '@/store/useAppStore';
import toast from 'react-hot-toast';

type Account = Database['public']['Tables']['accounts']['Row'];
type AccountInsert = Database['public']['Tables']['accounts']['Insert'];
type AccountUpdate = Database['public']['Tables']['accounts']['Update'];
type AccountRule = Database['public']['Tables']['account_rules']['Row'];
type AccountRuleUpdate = Database['public']['Tables']['account_rules']['Update'];

export function useAccounts() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { setActiveAccountId } = useAppStore();

  // Fetch all accounts
  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Account[];
    }
  });

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (variables: { account: AccountInsert; rules?: Omit<Database['public']['Tables']['account_rules']['Insert'], 'account_id'> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthenticated');

      // 1. Insert Account
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .insert({
          ...variables.account,
          user_id: user.id,
          current_balance: variables.account.starting_balance
        })
        .select()
        .single();

      if (accountError) throw accountError;

      // 2. If rules provided (for challenge/funded), insert Rules
      if (variables.rules && (variables.account.account_type === 'challenge' || variables.account.account_type === 'funded')) {
        const { error: rulesError } = await supabase
          .from('account_rules')
          .insert({
            ...variables.rules,
            account_id: accountData.id
          });

        if (rulesError) throw rulesError;
      }

      return accountData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account created successfully!');
    },
    onError: (err: any) => {
      toast.error(`Error: ${err.message || 'Failed to create account'}`);
    }
  });

  // Update account mutation
  const updateAccountMutation = useMutation({
    mutationFn: async (variables: { id: string; updates: AccountUpdate }) => {
      const { data, error } = await supabase
        .from('accounts')
        .update(variables.updates)
        .eq('id', variables.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account updated successfully!');
    },
    onError: (err: any) => {
      toast.error(`Error: ${err.message || 'Failed to update account'}`);
    }
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account deleted successfully!');
    },
    onError: (err: any) => {
      toast.error(`Error: ${err.message || 'Failed to delete account'}`);
    }
  });

  // Fetch rules for an account
  const useAccountRules = (accountId: string) => {
    return useQuery({
      queryKey: ['account_rules', accountId],
      queryFn: async () => {
        if (!accountId) return null;
        const { data, error } = await supabase
          .from('account_rules')
          .select('*')
          .eq('account_id', accountId)
          .maybeSingle();

        if (error) throw error;
        return data as AccountRule | null;
      },
      enabled: !!accountId
    });
  };

  // Update rules mutation
  const updateRulesMutation = useMutation({
    mutationFn: async (variables: { accountId: string; updates: AccountRuleUpdate }) => {
      const { data: existing } = await supabase
        .from('account_rules')
        .select('id')
        .eq('account_id', variables.accountId)
        .maybeSingle();

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from('account_rules')
          .update(variables.updates)
          .eq('account_id', variables.accountId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('account_rules')
          .insert({
            ...variables.updates,
            account_id: variables.accountId
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['account_rules', variables.accountId] });
      toast.success('Rules updated successfully!');
    },
    onError: (err: any) => {
      toast.error(`Error: ${err.message || 'Failed to update rules'}`);
    }
  });

  // Set active account mutation
  const setActiveAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthenticated');

      // 1. Set all other accounts to inactive
      const { error: updateAllError } = await supabase
        .from('accounts')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (updateAllError) throw updateAllError;

      // 2. Set this account to active
      const { data, error } = await supabase
        .from('accounts')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Account;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setActiveAccountId(data.id);
      toast.success(`Active account set to: ${data.name}`);
    },
    onError: (err: any) => {
      toast.error(`Error: ${err.message || 'Failed to change active account'}`);
    }
  });

  return {
    accounts: accountsQuery.data || [],
    isLoading: accountsQuery.isLoading,
    error: accountsQuery.error,
    createAccount: createAccountMutation.mutateAsync,
    isCreating: createAccountMutation.isPending,
    updateAccount: updateAccountMutation.mutateAsync,
    isUpdating: updateAccountMutation.isPending,
    deleteAccount: deleteAccountMutation.mutateAsync,
    isDeleting: deleteAccountMutation.isPending,
    useAccountRules,
    updateRules: updateRulesMutation.mutateAsync,
    isUpdatingRules: updateRulesMutation.isPending,
    setActiveAccount: setActiveAccountMutation.mutateAsync,
    isSettingActive: setActiveAccountMutation.isPending
  };
}
