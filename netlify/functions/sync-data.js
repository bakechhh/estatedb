const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

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
        
        // トークンの有効期限チェック
        if (tokenData.exp < Date.now()) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'トークンが期限切れです' })
            };
        }

        const { storeId, staffId } = tokenData;
        const { data, action } = JSON.parse(event.body);

        if (action === 'save') {
            // 暗号化を使用する場合
            const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
            let dataToSave = JSON.stringify(data);
            
            // 暗号化キーが設定されている場合のみ暗号化
            if (ENCRYPTION_KEY) {
                dataToSave = encrypt(dataToSave, ENCRYPTION_KEY);
            }
            
            const { error } = await supabase
                .from('store_data')
                .upsert({
                    store_id: storeId,
                    data: dataToSave,
                    last_updated_by: staffId,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

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

            if (error && error.code !== 'PGRST116') throw error;

            if (storeData) {
                let decryptedData = storeData.data;
                
                // 暗号化されているデータの場合は復号化
                const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
                if (ENCRYPTION_KEY && storeData.data.includes(':')) {
                    try {
                        decryptedData = decrypt(storeData.data, ENCRYPTION_KEY);
                    } catch (e) {
                        // 復号化に失敗した場合はそのまま使用
                        console.log('Decryption failed, using raw data');
                    }
                }
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ 
                        success: true, 
                        data: JSON.parse(decryptedData),
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
    } catch (error) {
        console.error('Sync error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'サーバーエラー' })
        };
    }
};

// 暗号化関数
function encrypt(text, key) {
    const algorithm = 'aes-256-cbc';
    const keyBuffer = Buffer.from(key, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// 復号化関数
function decrypt(text, key) {
    const algorithm = 'aes-256-cbc';
    const keyBuffer = Buffer.from(key, 'hex');
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}