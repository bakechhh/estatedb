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
        // 環境変数のチェック
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
            console.error('Missing Supabase credentials');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'サーバー設定エラー',
                    details: 'Supabase credentials not configured'
                })
            };
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        // 認証チェック
        const token = event.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: '認証が必要です' })
            };
        }

        // トークンのデコード
        let tokenData;
        try {
            tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
        } catch (e) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: '無効なトークン' })
            };
        }

        const { storeId, staffId } = tokenData;
        
        // リクエストボディの解析
        let requestBody;
        try {
            requestBody = JSON.parse(event.body);
        } catch (e) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '無効なリクエスト' })
            };
        }

        const { action, data, version, lastSync } = requestBody;

        // アクションに応じた処理
        if (action === 'save') {
            const newVersion = Date.now().toString();
            
            // データが既に文字列化されているかチェック
            const dataToStore = typeof data === 'string' ? data : JSON.stringify(data);
            
            // upsert（存在すれば更新、なければ挿入）を使用
            const { error } = await supabase
                .from('store_data')
                .upsert({
                    store_id: storeId,
                    data: dataToStore,
                    last_updated_by: staffId,
                    updated_at: new Date().toISOString(),
                    version: newVersion
                }, {
                    onConflict: 'store_id'
                });

            if (error) {
                console.error('Save error:', error);
                throw error;
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true,
                    version: newVersion
                })
            };
            
        } else if (action === 'check') {
            const { data: storeData, error } = await supabase
                .from('store_data')
                .select('updated_at, last_updated_by, version')
                .eq('store_id', storeId)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                console.error('Check error:', error);
                throw error;
            }
            
            const hasUpdate = storeData && 
                            lastSync && 
                            new Date(storeData.updated_at) > new Date(lastSync) &&
                            storeData.last_updated_by !== staffId;
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true,
                    hasUpdate,
                    updatedBy: storeData?.last_updated_by,
                    version: storeData?.version
                })
            };
            
        } else if (action === 'load') {
            const { data: storeData, error } = await supabase
                .from('store_data')
                .select('*')
                .eq('store_id', storeId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Load error:', error);
                throw error;
            }

            if (storeData) {
                // データが文字列の場合はパース
                let parsedData;
                try {
                    parsedData = typeof storeData.data === 'string' 
                        ? JSON.parse(storeData.data) 
                        : storeData.data;
                } catch (e) {
                    console.error('Data parse error:', e);
                    parsedData = storeData.data;
                }

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ 
                        success: true, 
                        data: parsedData,
                        lastUpdated: storeData.updated_at,
                        version: storeData.version
                    })
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true, 
                    data: null 
                })
            };
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: '不正なアクション' })
        };
        
    } catch (error) {
        console.error('Handler error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'サーバーエラー',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
        };
    }
};