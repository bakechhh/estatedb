const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    console.log('Sync-data function called');
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // 環境変数の確認
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
            console.error('Missing environment variables');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: '環境変数が設定されていません',
                    hasUrl: !!process.env.SUPABASE_URL,
                    hasKey: !!process.env.SUPABASE_ANON_KEY
                })
            };
        }
        
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );
        console.log('Supabase client created');

        const token = event.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: '認証が必要です' })
            };
        }

        let tokenData;
        try {
            tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
        } catch (e) {
            console.error('Token parse error:', e);
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'トークンが無効です' })
            };
        }

        const { storeId, staffId } = tokenData;
        const { data, action } = JSON.parse(event.body);

        console.log('Action:', action, 'StoreId:', storeId);

        if (action === 'save') {
            console.log('Saving data for store:', storeId);
            
            const { data: result, error } = await supabase
                .from('store_data')
                .upsert({
                    store_id: storeId,
                    data: JSON.stringify(data),
                    last_updated_by: staffId,
                    updated_at: new Date().toISOString()
                })
                .select();

            if (error) {
                console.error('Supabase save error:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ 
                        error: 'データ保存エラー',
                        details: error.message,
                        code: error.code
                    })
                };
            }

            console.log('Save successful:', result);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true })
            };
            
        } else if (action === 'load') {
            console.log('Loading data for store:', storeId);
            
            const { data: storeData, error } = await supabase
                .from('store_data')
                .select('*')
                .eq('store_id', storeId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Supabase load error:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ 
                        error: 'データ読み込みエラー',
                        details: error.message,
                        code: error.code
                    })
                };
            }

            if (storeData) {
                console.log('Data loaded successfully');
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

            console.log('No data found for store');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, data: null })
            };
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: '不正なアクション: ' + action })
        };
        
    } catch (error) {
        console.error('Sync error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'サーバーエラー',
                message: error.message,
                stack: error.stack
            })
        };
    }
};