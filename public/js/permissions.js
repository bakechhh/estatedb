// permissions.js - 権限管理
const Permissions = {
    userInfo: null,

    init() {
        this.loadUserInfo();
    },

    loadUserInfo() {
        const token = sessionStorage.getItem('auth_token');
        if (token) {
            try {
                const tokenData = JSON.parse(atob(token));
                this.userInfo = {
                    storeId: tokenData.storeId,
                    staffId: tokenData.staffId,
                    role: tokenData.role,
                    permissions: tokenData.permissions
                };
            } catch (error) {
                console.error('Token parse error:', error);
                this.logout();
            }
        }
    },

    // 権限チェックメソッド
    canEditProperty(property) {
        if (!this.userInfo) return false;
        
        // マネージャーは全て編集可能
        if (this.userInfo.permissions.canEditAll) return true;
        
        // スタッフは自分の担当物件のみ
        return property.staffId === this.userInfo.staffId;
    },

    canViewStoreData() {
        // 全員が店舗データを閲覧可能
        return true;
    },

    canEditStoreData() {
        // マネージャーのみ店舗データを編集可能
        return this.userInfo?.permissions?.canEditAll || false;
    },

    canEditSale(sale) {
        if (!this.userInfo) return false;
        
        // マネージャーは全て編集可能
        if (this.userInfo.permissions.canEditAll) return true;
        
        // スタッフは自分の案件のみ
        return sale.staffId === this.userInfo.staffId;
    },

    canSetStaffGoals() {
        return this.userInfo?.permissions?.canSetStaffGoals || false;
    },

    canViewAllData() {
        return this.userInfo?.permissions?.canViewAllData || false;
    },

    isManager() {
        return this.userInfo?.role === 'manager';
    },

    isStaff() {
        return this.userInfo?.role === 'staff';
    },

    getCurrentStaffId() {
        return this.userInfo?.staffId;
    },

    logout() {
        sessionStorage.clear();
        window.location.href = '/login.html';
    }
};

// グローバルスコープに公開
window.Permissions = Permissions;