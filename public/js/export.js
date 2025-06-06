// export.js - エクスポート/インポート機能
const Export = {
    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
    // JSONエクスポート
    document.getElementById('export-json').addEventListener('click', () => {
        this.exportJSON();
    });

    // JSONインポート
    document.getElementById('import-json').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });

    document.getElementById('import-file').addEventListener('change', (e) => {
        if (e.target.files[0]) {
            this.importJSON(e.target.files[0]);
        }
    });

    // CSV出力
    document.getElementById('export-csv').addEventListener('click', () => {
        this.exportCSV();
    });

    // データクリア
    document.getElementById('clear-data').addEventListener('click', () => {
        this.clearAllData();
    });

    // ストレージ管理ボタンのイベントリスナー（存在チェック付き）
    const checkStorageBtn = document.getElementById('check-storage');
        if (checkStorageBtn) {
            checkStorageBtn.addEventListener('click', () => {
                const details = Storage.getStorageDetails();
                const health = Storage.checkStorageHealth();
                
                let detailsHtml = `
                    <div style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--border-radius); margin-bottom: 1rem;">
                        <p><strong>総使用量:</strong> ${details.totalMB} (${health.usage}%)</p>
                        <p><strong>健全性:</strong> ${health.healthy ? '✅ 良好' : '⚠️ 要クリーンアップ'}</p>
                        <details>
                            <summary>詳細</summary>
                            <ul style="margin-top: 0.5rem;">
                `;
                
                for (let key in details.details) {
                    detailsHtml += `<li>${key}: ${details.details[key].sizeKB} (${details.details[key].percentage})</li>`;
                }
                
                detailsHtml += `
                            </ul>
                        </details>
                    </div>
                `;
                
                const storageInfo = document.getElementById('storage-info');
                if (storageInfo) {
                    storageInfo.innerHTML = detailsHtml;
                }
            });
        }

        const cleanupStorageBtn = document.getElementById('cleanup-storage');
        if (cleanupStorageBtn) {
            cleanupStorageBtn.addEventListener('click', () => {
                if (confirm('7日以上前の削除済みデータをローカルストレージからクリーンアップしますか？\n※サーバーのデータは保持されます')) {
                    const cleaned = Storage.cleanupSyncedDeletedData(7);
                    EstateApp.showToast(`${cleaned}件のデータをローカルからクリーンアップしました`);
                    
                    // 同期を実行
                    EstateApp.syncData(true);
                }
            });
        }

        const aggressiveCleanupBtn = document.getElementById('aggressive-cleanup');
        if (aggressiveCleanupBtn) {
            aggressiveCleanupBtn.addEventListener('click', () => {
                if (confirm('すべての削除済みデータをローカルストレージから完全に削除しますか？\n※必ず同期が完了していることを確認してください\n※サーバーのデータは保持されます')) {
                    // まず同期
                    EstateApp.syncData(true).then(() => {
                        // その後クリーンアップ
                        setTimeout(() => {
                            const cleaned = Storage.aggressiveCleanup();
                            EstateApp.showToast(`${cleaned}件のデータをローカルから完全削除しました`);
                        }, 2000);
                    });
                }
            });
        }
    },

    exportJSON() {
        const data = Storage.exportData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `estate_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        EstateApp.showToast('データをエクスポートしました');
    },

    async importJSON(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!data.version || !data.properties || !data.sales) {
                throw new Error('無効なバックアップファイルです');
            }
            
            if (confirm('現在のデータを上書きしてインポートしますか？')) {
                const success = Storage.importData(data);
                
                if (success) {
                    // 画面を更新
                    Dashboard.refresh();
                    Inventory.renderPropertyList();
                    Sales.updatePropertySelect();
                    EstateApp.updateNotificationBadge();
                    
                    EstateApp.showToast('データをインポートしました');
                } else {
                    throw new Error('インポートに失敗しました');
                }
            }
        } catch (error) {
            alert('インポートエラー: ' + error.message);
        }
        
        // ファイル選択をリセット
        document.getElementById('import-file').value = '';
    },

    exportCSV() {
        const sales = Storage.getSales();
        
        if (sales.length === 0) {
            alert('エクスポートする売上データがありません');
            return;
        }
        
        // CSVヘッダー
        const headers = [
            '日付',
            '種別',
            '物件名/案件名',
            '顧客名',
            '取引様態',
            '成約価格',
            '仲介手数料率(%)',
            '仲介手数料',
            '原価',
            '諸経費',
            '収益',
            '備考'
        ];
        
        // CSV行データ
        const rows = sales.map(sale => {
            const date = new Date(sale.date).toLocaleDateString('ja-JP');
            let type = '';
            let propertyName = '';
            let customerName = '';
            let transactionType = '';
            let salePrice = '';
            let commissionRate = '';
            let commission = '';
            let cost = '';
            let expenses = '';
            let profit = sale.profit || sale.amount || 0;
            let notes = '';
            
            switch (sale.type) {
                case 'realestate':
                    type = '売買';
                    propertyName = sale.propertyName;
                    customerName = sale.customerName;
                    transactionType = this.getTransactionTypeText(sale.transactionType);
                    salePrice = sale.salePrice;
                    commissionRate = sale.commissionRate || '';
                    commission = sale.commission || '';
                    expenses = sale.otherExpenses || 0;
                    notes = sale.notes || '';
                    break;
                case 'renovation':
                    type = 'リフォーム';
                    propertyName = sale.propertyName;
                    cost = sale.cost || 0;
                    salePrice = sale.price || 0;
                    notes = sale.content || '';
                    break;
                case 'other':
                    type = Reports.getOtherTypeText(sale.subType);
                    customerName = sale.customerName;
                    salePrice = sale.amount;
                    notes = sale.description || '';
                    break;
            }
            
            return [
                date,
                type,
                propertyName,
                customerName,
                transactionType,
                salePrice,
                commissionRate,
                commission,
                cost,
                expenses,
                profit,
                notes
            ];
        });
        
        // BOM付きUTF-8でCSV作成
        const bom = '\uFEFF';
        const csvContent = bom + headers.join(',') + '\n' + 
            rows.map(row => row.map(cell => {
                // セル内にカンマや改行がある場合は引用符で囲む
                const cellStr = String(cell);
                if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
                    return '"' + cellStr.replace(/"/g, '""') + '"';
                }
                return cellStr;
            }).join(',')).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `estate_sales_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        EstateApp.showToast('売上データをCSV出力しました');
    },

    clearAllData() {
        if (confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
            if (confirm('本当に削除してもよろしいですか？\n必要なデータは事前にエクスポートしてください。')) {
                Storage.clearAllData();
                
                // 画面を更新
                Dashboard.refresh();
                Inventory.renderPropertyList();
                Sales.updatePropertySelect();
                EstateApp.updateNotificationBadge();
                
                EstateApp.showToast('すべてのデータを削除しました', 'danger');
            }
        }
    },

    getTransactionTypeText(type) {
        const typeMap = {
            seller: '売主',
            'buyer-agent': '買主側仲介',
            'seller-agent': '売主側仲介',
            'both-agent': '両手仲介'
        };
        return typeMap[type] || type;
    }
};

// グローバルスコープに公開
window.Export = Export;
