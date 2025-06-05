const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  console.log('Auth function called');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
    console.log('SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);
    
    // Supabase初期化
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { storeId, staffId, password } = JSON.parse(event.body);
    console.log('Login attempt:', { storeId, staffId });

    // パスワードをハッシュ化
    const crypto = require('crypto');
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    console.log('Password hash generated');

    // データベースで認証
    const { data: staff, error } = await supabase
      .from('staff_auth')
      .select('*')
      .eq('store_id', storeId)
      .eq('staff_id', staffId)
      .eq('password_hash', passwordHash)
      .eq('active', true)
      .single();

    console.log('Query result:', { found: !!staff, error: error?.message });

    if (error || !staff) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'IDまたはパスワードが正しくありません',
          debug: {
            queryError: error?.message,
            staffFound: !!staff
          }
        })
      };
    }

    // トークン生成
    const token = Buffer.from(JSON.stringify({
      storeId,
      staffId,
      exp: Date.now() + 24 * 60 * 60 * 1000
    })).toString('base64');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        token,
        staff: {
          name: staff.name,
          role: staff.role
        }
      })
    };
  } catch (error) {
    console.error('Auth error:', error);
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