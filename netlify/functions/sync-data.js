const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
   const headers = {
       'Access-Control-Allow-Origin': '*',
       'Access-Control-Allow-Headers': 'Content-Type, Authorization',
       'Content-Type': 'application/json'
   };

   if (event.httpMethod === 'OPTIONS') {
       return { statusCode: 200, headers, body: '' };
   }

   try {
       const supabase = createClient(
           process.env.SUPABASE_URL,
           process.env.SUPABASE_ANON_KEY
       );

       const token = event.headers.authorization?.replace('Bearer ', '');
       if (!token) {
           return {
               statusCode: 401,
               headers,
               body: JSON.stringify({ error: '認証が必要です' })
           };
       }

       const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
       const { storeId, staffId } = tokenData;
       const { data, action } = JSON.parse(event.body);

       if (action === 'save') {
           // 現在のサーバーデータを取得
           const { data: currentStoreData, error: fetchError } = await supabase
               .from('store_data')
               .select('*')
               .eq('store_id', storeId)
               .single();

           let mergedData;
           
           if (currentStoreData) {
               // 既存データがある場合はマージ
               const serverData = JSON.parse(currentStoreData.data);
               mergedData = mergeStoreData(serverData, data);
               
               // 更新
               const { error: updateError } = await supabase
                   .from('store_data')
                   .update({
                       data: JSON.stringify(mergedData),
                       last_updated_by: staffId,
                       updated_at: new Date().toISOString()
                   })
                   .eq('store_id', storeId);

               if (updateError) {
                   throw updateError;
               }
           } else {
               // 初回の場合は新規作成
               mergedData = data;
               
               const { error: insertError } = await supabase
                   .from('store_data')
                   .insert({
                       store_id: storeId,
                       data: JSON.stringify(mergedData),
                       last_updated_by: staffId,
                       updated_at: new Date().toISOString()
                   });

               if (insertError) {
                   throw insertError;
               }
           }

           return {
               statusCode: 200,
               headers,
               body: JSON.stringify({ 
                   success: true,
                   mergedCount: {
                       properties: mergedData.properties?.length || 0,
                       sales: mergedData.sales?.length || 0
                   }
               })
           };
           
       } else if (action === 'load') {
           const { data: storeData, error } = await supabase
               .from('store_data')
               .select('*')
               .eq('store_id', storeId)
               .single();

           if (error && error.code !== 'PGRST116') {
               throw error;
           }

           if (storeData) {
               return {
                   statusCode: 200,
                   headers,
                   body: JSON.stringify({ 
                       success: true, 
                       data: JSON.parse(storeData.data),
                       lastUpdated: storeData.updated_at
                   })
               };
           }

           return {
               statusCode: 200,
               headers,
               body: JSON.stringify({ success: true, data: null })
           };
           
       } else if (action === 'check') {
           // 更新チェック用
           const { lastSync } = JSON.parse(event.body);
           const { data: storeData, error } = await supabase
               .from('store_data')
               .select('updated_at, last_updated_by')
               .eq('store_id', storeId)
               .single();

           if (storeData && storeData.updated_at > lastSync) {
               return {
                   statusCode: 200,
                   headers,
                   body: JSON.stringify({ 
                       hasUpdate: true,
                       updatedBy: storeData.last_updated_by
                   })
               };
           }

           return {
               statusCode: 200,
               headers,
               body: JSON.stringify({ hasUpdate: false })
           };
       }

       return {
           statusCode: 400,
           headers,
           body: JSON.stringify({ error: '不正なアクション' })
       };
       
   } catch (error) {
       console.error('Sync error:', error);
       return {
           statusCode: 500,
           headers,
           body: JSON.stringify({ 
               error: 'サーバーエラー',
               details: error.message 
           })
       };
   }
};

// マージ関数
function mergeStoreData(serverData, clientData) {
   return {
       properties: mergeArrays(serverData.properties || [], clientData.properties || [], 'id'),
       sales: mergeArrays(serverData.sales || [], clientData.sales || [], 'id'),
       goals: mergeArrays(serverData.goals || [], clientData.goals || [], 'id'),
       memos: mergeArrays(serverData.memos || [], clientData.memos || [], 'id'),
       todos: mergeArrays(serverData.todos || [], clientData.todos || [], 'id'),
       notifications: mergeArrays(serverData.notifications || [], clientData.notifications || [], 'id'),
       settings: clientData.settings || serverData.settings,
       exportDate: new Date().toISOString(),
       version: '1.1'
   };
}

// 配列をマージする汎用関数
function mergeArrays(serverArray, clientArray, idField) {
    const map = new Map();
    
    // サーバーのデータをマップに追加
    serverArray.forEach(item => {
        if (item[idField]) {
            map.set(item[idField], item);
        }
    });
    
    // クライアントのデータで更新または追加
    clientArray.forEach(item => {
        if (item[idField]) {
            const existing = map.get(item[idField]);
            
            // 削除フラグの競合を解決
            if (item.deleted && existing?.deleted) {
                const itemDeletedAt = new Date(item.deletedAt || 0);
                const existingDeletedAt = new Date(existing.deletedAt || 0);
                // より新しい削除日時を採用
                if (itemDeletedAt >= existingDeletedAt) {
                    map.set(item[idField], item);
                }
            }
            // 削除フラグがある場合は優先
            else if (item.deleted) {
                map.set(item[idField], item);
            }
            // 両方に削除フラグがない場合
            else if (!existing?.deleted) {
                // 新規または更新日時が新しい場合は上書き
                if (!existing || isNewer(item, existing)) {
                    map.set(item[idField], item);
                }
            }
            // サーバー側が削除済みでクライアント側が削除済みでない場合
            // （誤って復元された場合の対策）
            else if (existing.deleted && !item.deleted) {
                console.warn(`Conflict: Server has deleted flag but client doesn't for ID ${item[idField]}`);
                // サーバーの削除を優先
                // ただし、クライアントの更新が削除より新しい場合は復元とみなす
                const clientUpdatedAt = new Date(item.updatedAt || 0);
                const serverDeletedAt = new Date(existing.deletedAt || 0);
                if (clientUpdatedAt > serverDeletedAt) {
                    map.set(item[idField], item); // 復元
                }
            }
        }
    });
    
    // ローカルに存在しないサーバーのデータは、削除とみなさない
    // 他のスタッフが作成したデータの可能性があるため
    // const clientIds = new Set(clientArray.map(item => item[idField]));
    // serverArray.forEach(item => {
    //     if (item[idField] && !clientIds.has(item[idField]) && !item.deleted) {
    //         // クライアントに存在しない = 削除された
    //         const deletedItem = {
    //             ...item,
    //             deleted: true,
    //             deletedAt: new Date().toISOString(),
    //             updatedAt: new Date().toISOString()
    //         };
    //         map.set(item[idField], deletedItem);
    //     }
    // });
    
    // 削除フラグ付きも含めてすべて返す
    return Array.from(map.values()).sort((a, b) => {
        const dateA = new Date(a.createdAt || a.updatedAt || 0);
        const dateB = new Date(b.createdAt || b.updatedAt || 0);
        return dateB - dateA;
    });
}

// 更新日時を比較
function isNewer(itemA, itemB) {
   const timeA = new Date(itemA.updatedAt || itemA.createdAt || 0).getTime();
   const timeB = new Date(itemB.updatedAt || itemB.createdAt || 0).getTime();
   return timeA > timeB;
}