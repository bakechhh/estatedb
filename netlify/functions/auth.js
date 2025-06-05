exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { storeId, staffId, password } = JSON.parse(event.body);

    // テスト用の認証
    if (storeId === 'STORE001' && staffId === 'STAFF001' && password === 'password123') {
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
            name: '田中太郎',
            role: 'manager'
          }
        })
      };
    }

    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: '認証に失敗しました' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'サーバーエラー' })
    };
  }
};