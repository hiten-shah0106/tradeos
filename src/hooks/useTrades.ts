'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';
import toast from 'react-hot-toast';

type Trade = Database['public']['Tables']['trades']['Row'];
type TradeInsert = Database['public']['Tables']['trades']['Insert'];
type TradeUpdate = Database['public']['Tables']['trades']['Update'];
type TradePartial = Database['public']['Tables']['trade_partials']['Row'];
type TradePartialInsert = Database['public']['Tables']['trade_partials']['Insert'];
type TradeImage = Database['public']['Tables']['trade_images']['Row'];
type Tag = Database['public']['Tables']['tags']['Row'];

export function useTrades(accountId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Fetch all trades for an account
  const tradesQuery = useQuery({
    queryKey: ['trades', accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const { data, error } = await supabase
        .from('trades')
        .select(`
          *,
          trade_tags (
            tags (*)
          ),
          trade_images (*),
          trade_partials (*)
        `)
        .eq('account_id', accountId)
        .order('open_timestamp', { ascending: false });

      if (error) throw error;
      return data as Array<Trade & { 
        trade_tags: Array<{ tags: Tag }>; 
        trade_images: TradeImage[]; 
        trade_partials: TradePartial[] 
      }>;
    },
    enabled: !!accountId
  });

  // Fetch all system & user tags
  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Tag[];
    }
  });

  // Create trade mutation
  const createTradeMutation = useMutation({
    mutationFn: async (variables: { trade: Omit<TradeInsert, 'user_id' | 'account_id'>; tags?: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthenticated');
      if (!accountId) throw new Error('No active account selected');

      // 1. Insert Trade
      const { data: tradeData, error: tradeError } = await supabase
        .from('trades')
        .insert({
          ...variables.trade,
          user_id: user.id,
          account_id: accountId,
          status: variables.trade.status || 'OPEN'
        })
        .select()
        .single();

      if (tradeError) throw tradeError;

      // 2. Insert user tags relationships
      if (variables.tags && variables.tags.length > 0) {
        const tagRelationships = variables.tags.map(tagId => ({
          trade_id: tradeData.id,
          tag_id: tagId
        }));

        const { error: tagError } = await supabase
          .from('trade_tags')
          .insert(tagRelationships);

        if (tagError) throw tagError;
      }

      // 3. Update account balance dynamically
      if (variables.trade.pnl && Number(variables.trade.pnl) !== 0) {
        const { data: account } = await supabase
          .from('accounts')
          .select('current_balance')
          .eq('id', accountId)
          .single();

        if (account) {
          const newBalance = Number(account.current_balance) + Number(variables.trade.pnl);
          await supabase
            .from('accounts')
            .update({ current_balance: newBalance })
            .eq('id', accountId);
        }
      }

      return tradeData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades', accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Trade logged successfully!');
    },
    onError: (err: any) => {
      toast.error(`Error: ${err.message || 'Failed to log trade'}`);
    }
  });

  // Update trade mutation
  const updateTradeMutation = useMutation({
    mutationFn: async (variables: { id: string; updates: TradeUpdate; tags?: string[]; previousPnl?: number }) => {
      // 1. Update Trade
      const { data: tradeData, error: tradeError } = await supabase
        .from('trades')
        .update(variables.updates)
        .eq('id', variables.id)
        .select()
        .single();

      if (tradeError) throw tradeError;

      // 2. Sync Tags if provided
      if (variables.tags !== undefined) {
        // Delete existing relationships
        await supabase
          .from('trade_tags')
          .delete()
          .eq('trade_id', variables.id);

        if (variables.tags.length > 0) {
          const tagRelationships = variables.tags.map(tagId => ({
            trade_id: variables.id,
            tag_id: tagId
          }));

          const { error: tagError } = await supabase
            .from('trade_tags')
            .insert(tagRelationships);

          if (tagError) throw tagError;
        }
      }

      // 3. Sync Account Balance PnL changes
      if (variables.updates.pnl !== undefined && variables.previousPnl !== undefined) {
        const diff = Number(variables.updates.pnl) - variables.previousPnl;
        if (diff !== 0) {
          const { data: account } = await supabase
            .from('accounts')
            .select('current_balance')
            .eq('id', accountId)
            .single();

          if (account) {
            const newBalance = Number(account.current_balance) + diff;
            await supabase
              .from('accounts')
              .update({ current_balance: newBalance })
              .eq('id', accountId);
          }
        }
      }

      return tradeData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades', accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Trade updated successfully!');
    },
    onError: (err: any) => {
      toast.error(`Error: ${err.message || 'Failed to update trade'}`);
    }
  });

  // Delete trade mutation
  const deleteTradeMutation = useMutation({
    mutationFn: async (variables: { id: string; pnl?: number }) => {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', variables.id);

      if (error) throw error;

      // Deduct PnL from account balance
      if (variables.pnl && variables.pnl !== 0) {
        const { data: account } = await supabase
          .from('accounts')
          .select('current_balance')
          .eq('id', accountId)
          .single();

        if (account) {
          const newBalance = Number(account.current_balance) - variables.pnl;
          await supabase
            .from('accounts')
            .update({ current_balance: newBalance })
            .eq('id', accountId);
        }
      }

      return variables.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades', accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Trade deleted successfully!');
    },
    onError: (err: any) => {
      toast.error(`Error: ${err.message || 'Failed to delete trade'}`);
    }
  });

  // Add partial close mutation
  const addPartialCloseMutation = useMutation({
    mutationFn: async (variables: { partial: Omit<TradePartialInsert, 'id'> }) => {
      // 1. Insert partial close
      const { data: partialData, error: partialError } = await supabase
        .from('trade_partials')
        .insert(variables.partial)
        .select()
        .single();

      if (partialError) throw partialError;

      // 2. Fetch trade to recalculate PnL and remaining size
      const { data: trade } = await supabase
        .from('trades')
        .select('*')
        .eq('id', variables.partial.trade_id)
        .single();

      if (trade) {
        // Calculate new total PnL
        const newPnl = Number(trade.pnl || 0) + Number(variables.partial.pnl);
        
        // Check if fully closed (example check: sum of partial lots == initial lot size)
        const { data: allPartials } = await supabase
          .from('trade_partials')
          .select('quantity')
          .eq('trade_id', variables.partial.trade_id);

        const totalPartialLots = allPartials?.reduce((sum, p) => sum + Number(p.quantity), 0) || 0;
        const isFullyClosed = totalPartialLots >= Number(trade.lot_size);

        await supabase
          .from('trades')
          .update({
            pnl: newPnl,
            status: isFullyClosed ? 'CLOSED' : 'PARTIAL',
            exit_price: isFullyClosed ? variables.partial.close_price : trade.exit_price,
            close_timestamp: isFullyClosed ? variables.partial.closed_at : trade.close_timestamp
          })
          .eq('id', variables.partial.trade_id);

        // Update account balance
        const { data: account } = await supabase
          .from('accounts')
          .select('current_balance')
          .eq('id', accountId)
          .single();

        if (account) {
          const newBalance = Number(account.current_balance) + Number(variables.partial.pnl);
          await supabase
            .from('accounts')
            .update({ current_balance: newBalance })
            .eq('id', accountId);
        }
      }

      return partialData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades', accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Partial close logged!');
    },
    onError: (err: any) => {
      toast.error(`Error: ${err.message || 'Failed to scale out'}`);
    }
  });

  // Upload screenshot mutation
  const uploadScreenshotMutation = useMutation({
    mutationFn: async (variables: { tradeId: string; file: File; caption?: string }) => {
      const fileExt = variables.file.name.split('.').pop();
      const fileName = `${variables.tradeId}/${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `trade-images/${fileName}`;

      // 1. Upload to Supabase Storage bucket
      const { error: uploadError } = await supabase.storage
        .from('trade-images')
        .upload(filePath, variables.file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('trade-images')
        .getPublicUrl(filePath);

      // 3. Save link to database trade_images table
      const { data, error: dbError } = await supabase
        .from('trade_images')
        .insert({
          trade_id: variables.tradeId,
          image_url: publicUrl,
          caption: variables.caption || ''
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades', accountId] });
      toast.success('Screenshot uploaded!');
    },
    onError: (err: any) => {
      toast.error(`Error: ${err.message || 'Failed to upload screenshot'}`);
    }
  });

  // Helper mutation to create new user tags
  const createTagMutation = useMutation({
    mutationFn: async (variables: { name: string; color?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthenticated');

      const { data, error } = await supabase
        .from('tags')
        .insert({
          name: variables.name,
          color: variables.color || '#3b82f6',
          tag_type: 'user',
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    }
  });

  return {
    trades: tradesQuery.data || [],
    isLoading: tradesQuery.isLoading,
    tags: tagsQuery.data || [],
    createTrade: createTradeMutation.mutateAsync,
    isCreating: createTradeMutation.isPending,
    updateTrade: updateTradeMutation.mutateAsync,
    isUpdating: updateTradeMutation.isPending,
    deleteTrade: deleteTradeMutation.mutateAsync,
    isDeleting: deleteTradeMutation.isPending,
    addPartialClose: addPartialCloseMutation.mutateAsync,
    isAddingPartial: addPartialCloseMutation.isPending,
    uploadScreenshot: uploadScreenshotMutation.mutateAsync,
    isUploadingScreenshot: uploadScreenshotMutation.isPending,
    createTag: createTagMutation.mutateAsync
  };
}
