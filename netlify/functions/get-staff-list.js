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
        const token = event.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: '認証が必要です' })
            };
        }

        const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
        const { storeId } = tokenData;

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        // 同じ店舗のスタッフ一覧を取得
        const { data: staffList, error } = await supabase
            .from('staff_auth')
            .select('staff_id, name, role')
            .eq('store_id', storeId)
            .eq('active', true)
            .order('role', { ascending: false })
            .order('name');

        if (error) throw error;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                staffList: staffList.map(staff => ({
                    staffId: staff.staff_id,
                    name: staff.name,
                    role: staff.role
                }))
            })
        };
    } catch (error) {
        console.error('Get staff list error:', error);
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