// memos.js - メモ管理機能
const Memos = {
    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        // メモ関連のイベントリスナー設定
    },

    saveMemo(type, referenceId, content, category = null) {
        const memo = {
            id: Date.now().toString(),
            type, // 'property', 'customer', 'general'
            referenceId, // 物件IDや顧客IDなど
            content,
            category,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        Storage.saveMemo(memo);
        EstateApp.showToast('メモを保存しました');
        return memo;
    },

    updateMemo(memoId, content) {
        const memo = Storage.getMemo(memoId);
        if (memo) {
            memo.content = content;
            memo.updatedAt = new Date().toISOString();
            Storage.updateMemo(memo);
            EstateApp.showToast('メモを更新しました');
        }
    },

    deleteMemo(memoId) {
        if (confirm('このメモを削除しますか？')) {
            Storage.deleteMemo(memoId);
            EstateApp.showToast('メモを削除しました');
        }
    },

    getMemosByReference(type, referenceId) {
        return Storage.getMemos().filter(memo => 
            memo.type === type && memo.referenceId === referenceId
        );
    },

    showMemoModal(type, referenceId, referenceName) {
        const memos = this.getMemosByReference(type, referenceId);
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content">
                <h3>📝 ${referenceName}のメモ</h3>
                <div class="memo-list">
                    ${memos.map(memo => `
                        <div class="memo-item" data-memo-id="${memo.id}">
                            <div class="memo-header">
                                <span class="memo-date">${EstateApp.formatDate(memo.createdAt)}</span>
                                <button class="memo-delete-btn" onclick="Memos.deleteMemoFromModal('${memo.id}')">×</button>
                            </div>
                            <div class="memo-content" contenteditable="true" onblur="Memos.updateMemoFromModal('${memo.id}', this.textContent)">
                                ${memo.content}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="memo-add-section">
                    <textarea id="new-memo-content" placeholder="新しいメモを入力..." rows="3"></textarea>
                    <button class="primary-btn" onclick="Memos.addMemoFromModal('${type}', '${referenceId}', '${referenceName}')">
                        メモを追加
                    </button>
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

    addMemoFromModal(type, referenceId, referenceName) {
        const content = document.getElementById('new-memo-content').value;
        if (content.trim()) {
            this.saveMemo(type, referenceId, content);
            document.querySelector('.modal').remove();
            this.showMemoModal(type, referenceId, referenceName);
        }
    },

    updateMemoFromModal(memoId, content) {
        this.updateMemo(memoId, content);
    },

    deleteMemoFromModal(memoId) {
        this.deleteMemo(memoId);
        const memoElement = document.querySelector(`[data-memo-id="${memoId}"]`);
        if (memoElement) {
            memoElement.remove();
        }
    }
};

// グローバルスコープに公開
window.Memos = Memos;
