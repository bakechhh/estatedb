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
        // 環境変数の確認
        console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
        console.log('SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);
        
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

        console.log('Sync action:', action, 'Store:', storeId);

        if (action === 'save') {
            const { error } = await supabase
                .from('store_data')
                .upsert({
                    store_id: storeId,
                    data: JSON.stringify(data),
                    last_updated_by: staffId,
                    updated_at: new Date().toISOString()
                });

            if (error) {
                console.error('Save error:', error);
                throw error;
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true })
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