// staff.js - スタッフ管理機能（完全本番仕様）
const Staff = {
    staffCache: new Map(), // スタッフ情報のキャッシュ
    cacheExpiry: 5 * 60 * 1000, // キャッシュ有効期限: 5分
    lastFetchTime: null,
    
    init() {
        // 初期化時にスタッフリストをプリロード
        this.preloadStaffList();
    },

    // スタッフリストを事前読み込み
    async preloadStaffList() {
        try {
            await this.getStoreStaffList();
        } catch (error) {
            console.error('Staff list preload error:', error);
        }
    },

    // キャッシュが有効かチェック
    isCacheValid() {
        if (!this.lastFetchTime) return false;
        return (Date.now() - this.lastFetchTime) < this.cacheExpiry;
    },

    // スタッフ情報を取得（キャッシュ機能付き）
    async getStaffInfo(staffId) {
        if (!staffId) return null;

        // キャッシュが有効な場合
        if (this.isCacheValid() && this.staffCache.has(staffId)) {
            return this.staffCache.get(staffId);
        }

        // キャッシュが無効な場合、スタッフリスト全体を再取得
        const staffList = await this.getStoreStaffList();
        const staffInfo = staffList.find(s => s.staffId === staffId);
        
        if (staffInfo) {
            return staffInfo;
        }

        // リストに存在しない場合（他店舗のスタッフや退職者など）
        return {
            staffId: staffId,
            name: `不明なスタッフ (${staffId})`,
            role: 'unknown'
        };
    },

    // スタッフ名を取得（同期的に使える簡易版）
    getStaffNameSync(staffId) {
        if (!staffId) return '未設定';
        
        // キャッシュから取得
        if (this.staffCache.has(staffId)) {
            const info = this.staffCache.get(staffId);
            return info.name || staffId;
        }
        
        // キャッシュにない場合はIDをそのまま返す
        // 後で非同期で更新される
        this.getStaffInfo(staffId).then(info => {
            if (info && info.name !== staffId) {
                // DOMを更新
                this.updateStaffNameInDOM(staffId, info.name);
            }
        });
        
        return staffId;
    },

    // DOM内のスタッフ名を更新
    updateStaffNameInDOM(staffId, name) {
        // データ属性でスタッフIDを持つ要素を更新
        document.querySelectorAll(`[data-staff-id="${staffId}"]`).forEach(element => {
            element.textContent = name;
        });
    },

    // スタッフ名を非同期で取得
    async getStaffName(staffId) {
        if (!staffId) return '未設定';
        
        const staffInfo = await this.getStaffInfo(staffId);
        return staffInfo?.name || staffId;
    },

    // 同じ店舗のスタッフリストを取得
    async getStoreStaffList() {
        // キャッシュが有効な場合
        if (this.isCacheValid() && this.staffCache.size > 0) {
            return Array.from(this.staffCache.values());
        }

        const token = sessionStorage.getItem('auth_token');
        const storeId = sessionStorage.getItem('store_id');
        
        if (!token || !storeId) {
            console.error('認証情報が見つかりません');
            return [];
        }

        try {
            // APIからスタッフリストを取得
            const response = await fetch('/.netlify/functions/get-staff-list', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ storeId })
            });

            if (!response.ok) {
                throw new Error('スタッフリストの取得に失敗しました');
            }

            const data = await response.json();
            
            // キャッシュをクリアして新しいデータで更新
            this.staffCache.clear();
            data.staffList.forEach(staff => {
                this.staffCache.set(staff.staffId, staff);
            });
            
            this.lastFetchTime = Date.now();
            
            return data.staffList;
        } catch (error) {
            console.error('Staff list fetch error:', error);
            
            // エラー時は最低限自分の情報だけ返す
            const fallbackList = [{
                staffId: sessionStorage.getItem('staff_id'),
                name: sessionStorage.getItem('staff_name'),
                role: Permissions.userInfo?.role || 'staff'
            }];
            
            // フォールバックデータもキャッシュに保存
            fallbackList.forEach(staff => {
                this.staffCache.set(staff.staffId, staff);
            });
            
            return fallbackList;
        }
    },

    // キャッシュをクリア（手動更新用）
    clearCache() {
        this.staffCache.clear();
        this.lastFetchTime = null;
    },

    // スタッフ別実績を取得
    async getStaffPerformance(yearMonth) {
        const [year, month] = yearMonth.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        
        // スタッフリストを取得
        const staffList = await this.getStoreStaffList();
        const performance = {};
        
        // 各スタッフの実績を集計
        for (const staff of staffList) {
            const sales = Storage.getSales().filter(sale => {
                const saleDate = new Date(sale.date);
                return sale.staffId === staff.staffId && 
                       saleDate >= startDate && 
                       saleDate <= endDate;
            });
            
            // 物件の媒介獲得数も集計
            const mediationProperties = Storage.getProperties().filter(property => {
                if (!property.contractDate || property.staffId !== staff.staffId) return false;
                const contractDate = new Date(property.contractDate);
                return contractDate >= startDate && contractDate <= endDate &&
                       ['exclusive', 'special', 'general'].includes(property.transactionMode);
            });
            
            performance[staff.staffId] = {
                staffId: staff.staffId,
                name: staff.name,
                role: staff.role,
                totalRevenue: 0,
                dealCount: sales.length,
                realEstateCount: 0,
                renovationCount: 0,
                otherCount: 0,
                collectedRevenue: 0,
                uncollectedRevenue: 0,
                mediationCount: mediationProperties.length,
                activePropertyCount: Storage.getProperties().filter(p => 
                    p.staffId === staff.staffId && 
                    (p.status === 'active' || p.status === 'negotiating')
                ).length
            };
            
            sales.forEach(sale => {
                const revenue = sale.profit || sale.amount || 0;
                performance[staff.staffId].totalRevenue += revenue;
                
                // 回収状況別の集計
                if (sale.collectionStatus === 'collected') {
                    performance[staff.staffId].collectedRevenue += revenue;
                } else {
                    performance[staff.staffId].uncollectedRevenue += revenue;
                }
                
                // 案件種別の集計
                switch (sale.type) {
                    case 'realestate':
                        performance[staff.staffId].realEstateCount++;
                        break;
                    case 'renovation':
                        performance[staff.staffId].renovationCount++;
                        break;
                    case 'other':
                        performance[staff.staffId].otherCount++;
                        break;
                }
            });
        }
        
        return Object.values(performance);
    },

    // スタッフ実績モーダルを表示
    async showStaffPerformanceModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        // ローディング表示
        modal.innerHTML = `
            <div class="modal-content modal-large">
                <h3>👥 スタッフ別実績</h3>
                <div style="text-align: center; padding: 2rem;">
                    <div class="loading-spinner">読み込み中...</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        try {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const performance = await this.getStaffPerformance(currentMonth);
            
            // 売上順にソート
            performance.sort((a, b) => b.totalRevenue - a.totalRevenue);
            
            // モーダル内容を更新
            modal.innerHTML = `
                <div class="modal-content modal-large">
                    <h3>👥 スタッフ別実績（${currentMonth}）</h3>
                    <div class="staff-performance-controls" style="margin-bottom: 1rem;">
                        <button class="secondary-btn" onclick="Staff.clearCache(); Staff.showStaffPerformanceModal(); this.closest('.modal').remove();">
                            🔄 データ更新
                        </button>
                    </div>
                    <div class="staff-performance-table" style="overflow-x: auto;">
                        <table class="report-table">
                            <thead>
                                <tr>
                                    <th style="position: sticky; left: 0; background-color: var(--bg-secondary);">順位</th>
                                    <th style="position: sticky; left: 50px; background-color: var(--bg-secondary);">スタッフ名</th>
                                    <th>役職</th>
                                    <th style="text-align: center;">担当物件</th>
                                    <th style="text-align: center;">媒介獲得</th>
                                    <th style="text-align: right;">売上合計</th>
                                    <th style="text-align: right;">回収済</th>
                                    <th style="text-align: right;">未回収</th>
                                    <th style="text-align: center;">件数</th>
                                    <th style="text-align: center;">売買</th>
                                    <th style="text-align: center;">リフォーム</th>
                                    <th style="text-align: center;">その他</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${performance.map((staff, index) => `
                                    <tr class="${index < 3 ? 'top-three' : ''}">
                                        <td style="text-align: center; font-weight: bold; position: sticky; left: 0; background-color: var(--bg-primary);">
                                            ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                        </td>
                                        <td style="position: sticky; left: 50px; background-color: var(--bg-primary);">${staff.name}</td>
                                        <td>${staff.role === 'manager' ? 'マネージャー' : 'スタッフ'}</td>
                                        <td style="text-align: center;">${staff.activePropertyCount}</td>
                                        <td style="text-align: center;">${staff.mediationCount}</td>
                                        <td style="text-align: right;">${EstateApp.formatCurrency(staff.totalRevenue)}</td>
                                        <td style="text-align: right; color: var(--success-color);">${EstateApp.formatCurrency(staff.collectedRevenue)}</td>
                                        <td style="text-align: right; color: var(--warning-color);">${EstateApp.formatCurrency(staff.uncollectedRevenue)}</td>
                                        <td style="text-align: center;">${staff.dealCount}</td>
                                        <td style="text-align: center;">${staff.realEstateCount}</td>
                                        <td style="text-align: center;">${staff.renovationCount}</td>
                                        <td style="text-align: center;">${staff.otherCount}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr style="font-weight: bold; background-color: var(--bg-secondary);">
                                    <td colspan="3">合計</td>
                                    <td style="text-align: center;">${performance.reduce((sum, s) => sum + s.activePropertyCount, 0)}</td>
                                    <td style="text-align: center;">${performance.reduce((sum, s) => sum + s.mediationCount, 0)}</td>
                                    <td style="text-align: right;">${EstateApp.formatCurrency(performance.reduce((sum, s) => sum + s.totalRevenue, 0))}</td>
                                    <td style="text-align: right;">${EstateApp.formatCurrency(performance.reduce((sum, s) => sum + s.collectedRevenue, 0))}</td>
                                    <td style="text-align: right;">${EstateApp.formatCurrency(performance.reduce((sum, s) => sum + s.uncollectedRevenue, 0))}</td>
                                    <td style="text-align: center;">${performance.reduce((sum, s) => sum + s.dealCount, 0)}</td>
                                    <td style="text-align: center;">${performance.reduce((sum, s) => sum + s.realEstateCount, 0)}</td>
                                    <td style="text-align: center;">${performance.reduce((sum, s) => sum + s.renovationCount, 0)}</td>
                                    <td style="text-align: center;">${performance.reduce((sum, s) => sum + s.otherCount, 0)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <div class="modal-actions">
                        <button class="primary-btn" onclick="Staff.exportPerformanceCSV()">CSV出力</button>
                        <button class="secondary-btn" onclick="this.closest('.modal').remove()">閉じる</button>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Performance data error:', error);
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>エラー</h3>
                    <p>スタッフ実績の取得に失敗しました。</p>
                    <div class="modal-actions">
                        <button class="secondary-btn" onclick="this.closest('.modal').remove()">閉じる</button>
                    </div>
                </div>
            `;
        }
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    },

    // 担当者変更モーダル
    async showChangeStaffModal(type, id, currentStaffId) {
        if (!Permissions.isManager()) {
            EstateApp.showToast('担当者の変更はマネージャーのみ可能です', 'danger');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        // ローディング表示
        modal.innerHTML = `
            <div class="modal-content">
                <h3>担当者変更</h3>
                <div style="text-align: center; padding: 2rem;">
                    <div class="loading-spinner">スタッフリストを読み込み中...</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        try {
            const staffList = await this.getStoreStaffList();
            
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>担当者変更</h3>
                    <form id="change-staff-form">
                        <div class="form-group">
                            <label for="new-staff">新しい担当者</label>
                            <select id="new-staff" required>
                                <option value="">選択してください</option>
                                ${staffList.map(staff => `
                                    <option value="${staff.staffId}" ${staff.staffId === currentStaffId ? 'selected' : ''}>
                                        ${staff.name}${staff.role === 'manager' ? ' (マネージャー)' : ''}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="change-reason">変更理由（任意）</label>
                            <textarea id="change-reason" rows="3" placeholder="引き継ぎ、担当変更、退職など"></textarea>
                        </div>
                        <div class="modal-actions">
                            <button type="submit" class="primary-btn">変更</button>
                            <button type="button" class="secondary-btn" onclick="this.closest('.modal').remove()">キャンセル</button>
                        </div>
                    </form>
                </div>
            `;
            
            document.getElementById('change-staff-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const newStaffId = document.getElementById('new-staff').value;
                const reason = document.getElementById('change-reason').value;
                
                // 変更履歴を含めて更新
                const changeRecord = {
                    staffId: newStaffId,
                    staffChangeReason: reason,
                    staffChangedAt: new Date().toISOString(),
                    staffChangedBy: Permissions.getCurrentStaffId(),
                    previousStaffId: currentStaffId
                };
                
                if (type === 'property') {
                    Storage.updateProperty(id, changeRecord);
                    Inventory.renderPropertyList();
                } else if (type === 'sale') {
                    Storage.updateSale(id, changeRecord);
                    Transactions.renderTransactionList();
                }
                
                EstateApp.showToast('担当者を変更しました');
                modal.remove();
            });
        } catch (error) {
            console.error('Staff list error:', error);
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>エラー</h3>
                    <p>スタッフリストの取得に失敗しました。</p>
                    <div class="modal-actions">
                        <button class="primary-btn" onclick="Staff.clearCache(); this.closest('.modal').remove(); Staff.showChangeStaffModal('${type}', '${id}', '${currentStaffId}');">
                            再試行
                        </button>
                        <button class="secondary-btn" onclick="this.closest('.modal').remove()">閉じる</button>
                    </div>
                </div>
            `;
        }
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    },

    // 実績データをCSV出力
    async exportPerformanceCSV() {
        try {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const performance = await this.getStaffPerformance(currentMonth);
            
            // CSV作成
            const headers = ['順位', '担当者名', '役職', '担当物件数', '媒介獲得数', '売上合計', '回収済', '未回収', '件数', '売買', 'リフォーム', 'その他'];
            const rows = performance
                .sort((a, b) => b.totalRevenue - a.totalRevenue)
                .map((staff, index) => [
                    index + 1,
                    staff.name,
                    staff.role === 'manager' ? 'マネージャー' : 'スタッフ',
                    staff.activePropertyCount,
                    staff.mediationCount,
                    staff.totalRevenue,
                    staff.collectedRevenue,
                    staff.uncollectedRevenue,
                    staff.dealCount,
                    staff.realEstateCount,
                    staff.renovationCount,
                    staff.otherCount
                ]);
            
            // 合計行を追加
            rows.push([
                '合計',
                '',
                '',
                performance.reduce((sum, s) => sum + s.activePropertyCount, 0),
                performance.reduce((sum, s) => sum + s.mediationCount, 0),
                performance.reduce((sum, s) => sum + s.totalRevenue, 0),
                performance.reduce((sum, s) => sum + s.collectedRevenue, 0),
                performance.reduce((sum, s) => sum + s.uncollectedRevenue, 0),
                performance.reduce((sum, s) => sum + s.dealCount, 0),
                performance.reduce((sum, s) => sum + s.realEstateCount, 0),
                performance.reduce((sum, s) => sum + s.renovationCount, 0),
                performance.reduce((sum, s) => sum + s.otherCount, 0)
            ]);
            
            // BOM付きUTF-8でCSV作成
            const bom = '\uFEFF';
            const csvContent = bom + headers.join(',') + '\n' + 
                rows.map(row => row.join(',')).join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `staff_performance_${currentMonth}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            EstateApp.showToast('CSVファイルをダウンロードしました');
        } catch (error) {
            console.error('CSV export error:', error);
            EstateApp.showToast('CSV出力に失敗しました', 'danger');
        }
    }
};

// グローバルスコープに公開
window.Staff = Staff;