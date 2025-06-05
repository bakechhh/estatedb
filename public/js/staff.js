// staff.js - スタッフ管理機能
const Staff = {
    staffList: [],
    
    init() {
        this.loadStaffList();
    },

    // スタッフリストをローカルに保存（実際は認証時に取得）
    loadStaffList() {
        const savedList = localStorage.getItem('staff_list');
        if (savedList) {
            this.staffList = JSON.parse(savedList);
        } else {
            // 初期データ（実際はAPIから取得）
            this.staffList = [
                { staffId: 'MGR001', name: 'マネージャー', role: 'manager' },
                { staffId: 'STF001', name: 'スタッフA', role: 'staff' },
                { staffId: 'STF002', name: 'スタッフB', role: 'staff' }
            ];
            localStorage.setItem('staff_list', JSON.stringify(this.staffList));
        }
    },

    getStaffName(staffId) {
        const staff = this.staffList.find(s => s.staffId === staffId);
        return staff ? staff.name : staffId;
    },

    getStaffList() {
        return this.staffList;
    },

    // スタッフ別実績を取得
    getStaffPerformance(yearMonth) {
        const [year, month] = yearMonth.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        
        const performance = {};
        
        // 各スタッフの実績を集計
        this.staffList.forEach(staff => {
            const sales = Storage.getSales().filter(sale => {
                const saleDate = new Date(sale.date);
                return sale.staffId === staff.staffId && 
                       saleDate >= startDate && 
                       saleDate <= endDate;
            });
            
            performance[staff.staffId] = {
                staffId: staff.staffId,
                name: staff.name,
                role: staff.role,
                totalRevenue: 0,
                dealCount: sales.length,
                realEstateCount: 0,
                renovationCount: 0,
                otherCount: 0
            };
            
            sales.forEach(sale => {
                performance[staff.staffId].totalRevenue += sale.profit || sale.amount || 0;
                
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
        });
        
        return Object.values(performance);
    },

    // スタッフ実績モーダルを表示
    showStaffPerformanceModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        const currentMonth = new Date().toISOString().slice(0, 7);
        const performance = this.getStaffPerformance(currentMonth);
        
        modal.innerHTML = `
            <div class="modal-content modal-large">
                <h3>👥 スタッフ別実績（${currentMonth}）</h3>
                <div class="staff-performance-table">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>スタッフ名</th>
                                <th>役職</th>
                                <th style="text-align: right;">売上</th>
                                <th style="text-align: center;">件数</th>
                                <th style="text-align: center;">売買</th>
                                <th style="text-align: center;">リフォーム</th>
                                <th style="text-align: center;">その他</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${performance.map(staff => `
                                <tr>
                                    <td>${staff.name}</td>
                                    <td>${staff.role === 'manager' ? 'マネージャー' : 'スタッフ'}</td>
                                    <td style="text-align: right;">${EstateApp.formatCurrency(staff.totalRevenue)}</td>
                                    <td style="text-align: center;">${staff.dealCount}</td>
                                    <td style="text-align: center;">${staff.realEstateCount}</td>
                                    <td style="text-align: center;">${staff.renovationCount}</td>
                                    <td style="text-align: center;">${staff.otherCount}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="modal-actions">
                    <button class="secondary-btn" onclick="this.closest('.modal').remove()">閉じる</button>
                </div>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        document.body.appendChild(modal);
    },

    // 担当者変更モーダル
    showChangeStaffModal(type, id, currentStaffId) {
        if (!Permissions.isManager()) {
            EstateApp.showToast('担当者の変更はマネージャーのみ可能です', 'danger');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content">
                <h3>担当者変更</h3>
                <form id="change-staff-form">
                    <div class="form-group">
                        <label for="new-staff">新しい担当者</label>
                        <select id="new-staff" required>
                            <option value="">選択してください</option>
                            ${this.staffList.map(staff => `
                                <option value="${staff.staffId}" ${staff.staffId === currentStaffId ? 'selected' : ''}>
                                    ${staff.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="primary-btn">変更</button>
                        <button type="button" class="secondary-btn" onclick="this.closest('.modal').remove()">キャンセル</button>
                    </div>
                </form>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        document.body.appendChild(modal);
        
        document.getElementById('change-staff-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const newStaffId = document.getElementById('new-staff').value;
            
            if (type === 'property') {
                Storage.updateProperty(id, { staffId: newStaffId });
                Inventory.renderPropertyList();
            } else if (type === 'sale') {
                Storage.updateSale(id, { staffId: newStaffId });
                Transactions.renderTransactionList();
            }
            
            EstateApp.showToast('担当者を変更しました');
            modal.remove();
        });
    }
};

// グローバルスコープに公開
window.Staff = Staff;