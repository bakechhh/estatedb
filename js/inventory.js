// inventory.js - 在庫管理機能
const Inventory = {
    currentEditId: null,
    filterSettings: {
        search: '',
        type: 'all',
        status: 'all'
    },

    init() {
        this.setupEventListeners();
        this.renderPropertyList();
    },

    setupEventListeners() {
        // 新規物件登録ボタン
        document.getElementById('add-property-btn').addEventListener('click', () => {
            this.showPropertyModal();
        });

        // 物件フォーム
        document.getElementById('property-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProperty();
        });

        // 検索・フィルター
        document.getElementById('inventory-search').addEventListener('input', (e) => {
            this.filterSettings.search = e.target.value.toLowerCase();
            this.renderPropertyList();
        });

        document.getElementById('property-type-filter').addEventListener('change', (e) => {
            this.filterSettings.type = e.target.value;
            this.renderPropertyList();
        });

        document.getElementById('status-filter').addEventListener('change', (e) => {
            this.filterSettings.status = e.target.value;
            this.renderPropertyList();
        });

        // 取引様態による媒介契約日の表示制御
        document.getElementById('transaction-mode').addEventListener('change', (e) => {
            const mode = e.target.value;
            const contractFields = ['contract-date', 'contract-end-date', 'reins-number', 'reins-date', 'reins-deadline'];
            const isMediation = ['exclusive', 'special', 'general'].includes(mode);
            
            contractFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                const formGroup = field.closest('.form-group');
                if (isMediation) {
                    formGroup.style.display = 'block';
                    if (fieldId === 'contract-date' || fieldId === 'contract-end-date') {
                        field.required = true;
                    }
                    // 専任・専属の場合はレインズ登録期日も必須
                    if (fieldId === 'reins-deadline' && (mode === 'exclusive' || mode === 'special')) {
                        field.required = true;
                    }
                } else {
                    formGroup.style.display = 'none';
                    field.required = false;
                }
            });
            
            // 取引様態変更時にレインズ登録期日を再計算
            const contractDate = document.getElementById('contract-date').value;
            if (contractDate && (mode === 'exclusive' || mode === 'special')) {
                const reinsDeadline = new Date(contractDate);
                const days = mode === 'exclusive' ? 5 : 7;
                reinsDeadline.setDate(reinsDeadline.getDate() + days);
                document.getElementById('reins-deadline').value = reinsDeadline.toISOString().split('T')[0];
            }
        });

        // 媒介契約日から満了日とレインズ登録期日を自動計算
        document.getElementById('contract-date').addEventListener('change', (e) => {
            if (e.target.value) {
                const contractDate = new Date(e.target.value);
                const mode = document.getElementById('transaction-mode').value;
                
                // 媒介契約満了日の計算（3ヶ月後）
                const endDate = new Date(contractDate);
                endDate.setMonth(endDate.getMonth() + 3);
                document.getElementById('contract-end-date').value = endDate.toISOString().split('T')[0];
                
                // レインズ登録期日の自動計算
                if (mode === 'exclusive' || mode === 'special') {
                    const reinsDeadline = new Date(contractDate);
                    // 専属専任は5日以内、専任は7日以内
                    const days = mode === 'exclusive' ? 5 : 7;
                    reinsDeadline.setDate(reinsDeadline.getDate() + days);
                    document.getElementById('reins-deadline').value = reinsDeadline.toISOString().split('T')[0];
                }
            }
        });

        // モーダル背景クリックで閉じる
        document.getElementById('property-modal').addEventListener('click', (e) => {
            if (e.target.id === 'property-modal') {
                EstateApp.closePropertyModal();
            }
        });
    },

    showPropertyModal(property = null) {
        this.currentEditId = property ? property.id : null;
        const modal = document.getElementById('property-modal');
        const form = document.getElementById('property-form');
        const title = document.getElementById('property-modal-title');
        
        if (property) {
            title.textContent = '物件情報編集';
            // フォームに値を設定
            document.getElementById('property-code').value = property.code || '';
            document.getElementById('property-name').value = property.name || '';
            document.getElementById('property-type').value = property.type || '';
            document.getElementById('property-status').value = property.status || 'active';
            document.getElementById('property-address').value = property.address || '';
            document.getElementById('property-station').value = property.station || '';
            document.getElementById('property-walk-time').value = property.walkTime || '';
            document.getElementById('land-area').value = property.landArea || '';
            document.getElementById('building-area').value = property.buildingArea || '';
            document.getElementById('property-age').value = property.age || '';
            document.getElementById('property-structure').value = property.structure || '';
            document.getElementById('selling-price').value = property.sellingPrice || '';
            document.getElementById('purchase-price').value = property.purchasePrice || '';
            document.getElementById('transaction-mode').value = property.transactionMode || '';
            document.getElementById('owner-name').value = property.ownerName || '';
            document.getElementById('owner-contact').value = property.ownerContact || '';
            document.getElementById('contract-date').value = property.contractDate || '';
            document.getElementById('contract-end-date').value = property.contractEndDate || '';
            document.getElementById('reins-number').value = property.reinsNumber || '';
            document.getElementById('reins-date').value = property.reinsDate || '';
            document.getElementById('reins-deadline').value = property.reinsDeadline || '';
            document.getElementById('property-notes').value = property.notes || '';
            
            // 取引様態変更イベントを発火
            document.getElementById('transaction-mode').dispatchEvent(new Event('change'));
        } else {
            title.textContent = '新規物件登録';
            form.reset();
            document.getElementById('property-code').value = '';
            document.getElementById('property-status').value = 'active';
        }
        
        modal.style.display = 'flex';
    },

    saveProperty() {
        const formData = {
            code: document.getElementById('property-code').value,
            name: document.getElementById('property-name').value,
            type: document.getElementById('property-type').value,
            status: document.getElementById('property-status').value,
            address: document.getElementById('property-address').value,
            station: document.getElementById('property-station').value,
            walkTime: parseInt(document.getElementById('property-walk-time').value) || null,
            landArea: parseFloat(document.getElementById('land-area').value) || null,
            buildingArea: parseFloat(document.getElementById('building-area').value) || null,
            age: parseInt(document.getElementById('property-age').value) || null,
            structure: document.getElementById('property-structure').value,
            sellingPrice: parseInt(document.getElementById('selling-price').value),
            purchasePrice: parseInt(document.getElementById('purchase-price').value) || null,
            transactionMode: document.getElementById('transaction-mode').value,
            ownerName: document.getElementById('owner-name').value,
            ownerContact: document.getElementById('owner-contact').value,
            contractDate: document.getElementById('contract-date').value,
            contractEndDate: document.getElementById('contract-end-date').value,
            reinsNumber: document.getElementById('reins-number').value,
            reinsDate: document.getElementById('reins-date').value,
            reinsDeadline: document.getElementById('reins-deadline').value,
            notes: document.getElementById('property-notes').value
        };

        if (this.currentEditId) {
            formData.id = this.currentEditId;
        }

        Storage.saveProperty(formData);
        EstateApp.closePropertyModal();
        this.renderPropertyList();
        EstateApp.showToast(this.currentEditId ? '物件情報を更新しました' : '物件を登録しました');
        
        // 通知チェック
        EstateApp.checkNotifications();
    },

    deleteProperty(id) {
        if (confirm('この物件を削除しますか？\n関連する売上データは残ります。')) {
            Storage.deleteProperty(id);
            this.renderPropertyList();
            EstateApp.showToast('物件を削除しました');
        }
    },

    renderPropertyList() {
        const properties = this.filterProperties(Storage.getProperties());
        const container = document.getElementById('inventory-list');
        
        if (properties.length === 0) {
            container.innerHTML = '<p class="no-data">物件が登録されていません</p>';
            return;
        }
        
        container.innerHTML = properties.map(property => {
            const statusClass = `status-${property.status}`;
            const statusText = this.getStatusText(property.status);
            
            return `
                <div class="property-card" onclick="Inventory.showPropertyDetail('${property.id}')">
                    <div class="property-header">
                        <div>
                            <div class="property-title">${property.name}</div>
                            <div class="property-code">${property.code}</div>
                        </div>
                        <span class="property-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="property-details">
                        <div class="detail-item">
                            <span class="detail-label">📍</span>
                            <span class="detail-value">${property.address}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">🚉</span>
                            <span class="detail-value">${property.station || '-'} ${property.walkTime ? `徒歩${property.walkTime}分` : ''}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">📐</span>
                            <span class="detail-value">
                                ${property.landArea ? `土地${property.landArea}㎡` : ''} 
                                ${property.buildingArea ? `建物${property.buildingArea}㎡` : ''}
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">🏗️</span>
                            <span class="detail-value">${this.getPropertyTypeText(property.type)}</span>
                        </div>
                    </div>
                    <div class="property-price">
                        ${EstateApp.formatCurrency(property.sellingPrice)}
                    </div>
                    ${this.getDeadlineWarning(property)}
                    <div class="property-actions" onclick="event.stopPropagation()">
                        <button class="info-btn" onclick="Memos.showMemoModal('property', '${property.id}', '${property.name}')">メモ</button>
                        <button class="secondary-btn" onclick="Inventory.showPropertyModal(${JSON.stringify(property).replace(/"/g, '&quot;')})">編集</button>
                        <button class="danger-btn" onclick="Inventory.deleteProperty('${property.id}')">削除</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    filterProperties(properties) {
        return properties.filter(property => {
            // 検索フィルター
            if (this.filterSettings.search) {
                const searchTerm = this.filterSettings.search;
                const searchableText = `${property.name} ${property.address} ${property.code}`.toLowerCase();
                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }
            
            // 物件種別フィルター
            if (this.filterSettings.type !== 'all' && property.type !== this.filterSettings.type) {
                return false;
            }
            
            // ステータスフィルター
            if (this.filterSettings.status !== 'all' && property.status !== this.filterSettings.status) {
                return false;
            }
            
            return true;
        });
    },

    getDeadlineWarning(property) {
        if (!property.contractEndDate || 
            property.status === 'contracted' || 
            property.status === 'completed') {
            return '';
        }
        
        const endDate = new Date(property.contractEndDate);
        const now = new Date();
        const daysRemaining = Math.ceil((endDate - now) / (24 * 60 * 60 * 1000));
        
        if (daysRemaining <= 7) {
            return `<div class="alert-message" style="color: var(--danger-color); margin-top: 0.5rem;">
                ⚠️ 媒介契約満了まで${daysRemaining}日
            </div>`;
        } else if (daysRemaining <= 30) {
            return `<div class="alert-message" style="color: var(--warning-color); margin-top: 0.5rem;">
                ⏰ 媒介契約満了まで${daysRemaining}日
            </div>`;
        }
        
        return '';
    },

    showPropertyDetail(id) {
        const property = Storage.getProperty(id);
        if (property) {
            this.showPropertyModal(property);
        }
    },

    getStatusText(status) {
        const statusMap = {
            active: '販売中',
            negotiating: '商談中',
            contracted: '契約済',
            completed: '取引完了'
        };
        return statusMap[status] || status;
    },

    getPropertyTypeText(type) {
        const typeMap = {
            land: '土地',
            house: '戸建',
            apartment: 'マンション',
            income: '収益物件'
        };
        return typeMap[type] || type;
    }
};

// グローバルスコープに公開
window.Inventory = Inventory;
