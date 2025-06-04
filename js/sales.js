// sales.js - 売上登録機能
const Sales = {
   init() {
       this.setupEventListeners();
       this.updatePropertySelect();
       this.loadDefaults();
   },

   setupEventListeners() {
       // サブタブ切り替え
       const subTabButtons = document.querySelectorAll('.sub-tab-btn');
       const subTabContents = document.querySelectorAll('.sub-tab-content');
       
       subTabButtons.forEach(button => {
           button.addEventListener('click', () => {
               const targetSubtab = button.dataset.subtab;
               
               subTabButtons.forEach(btn => btn.classList.remove('active'));
               button.classList.add('active');
               
               subTabContents.forEach(content => {
                   content.classList.remove('active');
                   if (content.id === `${targetSubtab}-subtab`) {
                       content.classList.add('active');
                   }
               });
           });
       });
   
       // 売買フォーム
       document.getElementById('realestate-form').addEventListener('submit', (e) => {
           e.preventDefault();
           this.saveRealEstateSale();
       });
   
       // 取引様態による表示切り替え
       document.getElementById('transaction-type').addEventListener('change', (e) => {
           this.updateRealEstateForm(e.target.value);
           this.calculateRealEstateProfit();
       });
   
       // 仲介手数料計算方法の変更
       document.getElementById('commission-type').addEventListener('change', (e) => {
           this.updateCommissionInput(e.target.value);
           this.calculateRealEstateProfit();
       });
   
       // リアルタイム計算（売買）
       ['sale-price', 'purchase-price-input', 'other-expenses', 'commission-amount'].forEach(id => {
           const element = document.getElementById(id);
           if (element) {
               element.addEventListener('input', () => {
                   // 売却価格が変更されたら、正規手数料の表示も更新
                   if (id === 'sale-price' && document.getElementById('commission-type')?.value === 'standard') {
                       this.updateCommissionInput('standard');
                   }
                   this.calculateRealEstateProfit();
               });
           }
       });
   
       // 物件選択時の処理
       document.getElementById('sale-property').addEventListener('change', (e) => {
           if (e.target.value) {
               const property = Storage.getProperty(e.target.value);
               if (property) {
                   document.getElementById('sale-price').value = property.sellingPrice;
                   document.getElementById('property-name-input').value = property.name;
                   // 売主の場合は仕入価格も設定
                   if (document.getElementById('transaction-type').value === 'seller' && property.purchasePrice) {
                       document.getElementById('purchase-price-input').value = property.purchasePrice;
                   }
                   this.calculateRealEstateProfit();
               }
           } else {
               // 選択解除時は物件名入力フィールドをクリア
               document.getElementById('property-name-input').value = '';
           }
       });
   
       // 物件名直接入力時は物件選択をクリア
       document.getElementById('property-name-input').addEventListener('input', (e) => {
           if (e.target.value) {
               document.getElementById('sale-property').value = '';
           }
       });
   
       // すべての物件を表示チェックボックス
       const showAllPropertiesCheckbox = document.getElementById('show-all-properties');
       if (showAllPropertiesCheckbox) {
           showAllPropertiesCheckbox.addEventListener('change', (e) => {
               this.updatePropertySelect(e.target.checked);
           });
       }
   
       // リフォームフォーム
       document.getElementById('renovation-form').addEventListener('submit', (e) => {
           e.preventDefault();
           this.saveRenovationSale();
       });
   
       // リアルタイム計算（リフォーム）
       ['reno-cost', 'reno-price'].forEach(id => {
           document.getElementById(id).addEventListener('input', () => {
               this.calculateRenovationProfit();
           });
       });
   
       // その他フォーム
       document.getElementById('other-form').addEventListener('submit', (e) => {
           e.preventDefault();
           this.saveOtherSale();
       });
   
       // 今日の日付をデフォルト設定
       const today = new Date().toISOString().split('T')[0];
       document.getElementById('sale-date').value = today;
       document.getElementById('reno-date').value = today;
       document.getElementById('other-date').value = today;
   },

   loadDefaults() {
       // デフォルトの仲介手数料タイプを設定
       const commissionTypeSelect = document.getElementById('commission-type');
       if (commissionTypeSelect) {
           commissionTypeSelect.value = 'standard';
       }
   },

   updatePropertySelect(showAll = false) {
       let properties;
       if (showAll) {
           properties = Storage.getProperties();
       } else {
           // 基本は販売中のみ
           properties = Storage.getProperties().filter(p => p.status === 'active');
       }
       
       const select = document.getElementById('sale-property');
       
       select.innerHTML = '<option value="">物件を選択してください</option>' +
           properties.map(p => {
               const statusText = Inventory.getStatusText(p.status);
               return `<option value="${p.id}">${p.name} (${p.code}) - ${statusText}</option>`;
           }).join('');
   },

   updateRealEstateForm(transactionType) {
       const commissionFields = document.getElementById('commission-fields');
       const purchaseRow = document.getElementById('result-purchase-row');
       const commissionRow = document.getElementById('result-commission-row');
       const purchasePriceField = document.getElementById('purchase-price-field');
       
       if (transactionType === 'seller') {
           // 売主の場合
           commissionFields.style.display = 'none';
           purchaseRow.style.display = 'flex';
           commissionRow.style.display = 'none';
           purchasePriceField.style.display = 'block';
       } else {
           // 仲介の場合
           commissionFields.style.display = 'block';
           purchaseRow.style.display = 'none';
           commissionRow.style.display = 'flex';
           purchasePriceField.style.display = 'none';
       }
   },

   updateCommissionInput(commissionType) {
       const commissionAmount = document.getElementById('commission-amount');
       const commissionDisplay = document.getElementById('commission-display');
       const salePrice = parseInt(document.getElementById('sale-price').value) || 0;
       
       if (commissionType === 'direct') {
           commissionAmount.style.display = 'block';
           commissionDisplay.style.display = 'none';
       } else {
           commissionAmount.style.display = 'none';
           commissionDisplay.style.display = 'block';
           
           if (commissionType === 'fixed') {
               commissionDisplay.textContent = '300,000円（税抜）';
           } else if (commissionType === 'standard') {
               const commission = this.calculateStandardCommission(salePrice);
               commissionDisplay.textContent = `${commission.toLocaleString()}円（税抜）`;
           }
       }
   },

   calculateStandardCommission(salePrice) {
       // 800万円以下は一律30万円（税抜）
       if (salePrice <= 8000000) {
           return 300000;
       }
       
       // 800万円超は正規の仲介手数料を計算
       let commission = 0;
       
       if (salePrice <= 2000000) {
           // 200万円以下：5%
           commission = salePrice * 0.05;
       } else if (salePrice <= 4000000) {
           // 200万円超400万円以下：4%+2万円
           commission = salePrice * 0.04 + 20000;
       } else {
           // 400万円超：3%+6万円
           commission = salePrice * 0.03 + 60000;
       }
       
       return Math.floor(commission);
   },

   calculateRealEstateProfit() {
       const salePrice = parseInt(document.getElementById('sale-price').value) || 0;
       const transactionType = document.getElementById('transaction-type').value;
       const otherExpenses = parseInt(document.getElementById('other-expenses').value) || 0;
       
       let profit = 0;
       let commission = 0;
       let purchasePrice = 0;
       
       if (transactionType === 'seller') {
           // 売主の場合：売却価格 - 仕入価格 - 諸経費
           purchasePrice = parseInt(document.getElementById('purchase-price-input').value) || 0;
           profit = salePrice - purchasePrice - otherExpenses;
           
           document.getElementById('result-purchase-price').textContent = 
               `-${EstateApp.formatCurrency(purchasePrice)}`;
       } else if (transactionType) {
           // 仲介の場合
           const commissionType = document.getElementById('commission-type').value;
           
           if (commissionType === 'fixed') {
               commission = 300000; // 33万円（税抜30万円）
           } else if (commissionType === 'standard') {
               commission = this.calculateStandardCommission(salePrice);
           } else if (commissionType === 'direct') {
               commission = parseInt(document.getElementById('commission-amount').value) || 0;
           }
           
           // 両手仲介の場合は2倍
           if (transactionType === 'both-agent') {
               commission = commission * 2;
           }
           
           profit = commission - otherExpenses;
           
           document.getElementById('result-commission').textContent = 
               EstateApp.formatCurrency(commission);
       }
       
       // 結果表示（すべて税抜）
       document.getElementById('result-sale-price').textContent = 
           EstateApp.formatCurrency(salePrice);
       document.getElementById('result-expenses').textContent = 
           `-${EstateApp.formatCurrency(otherExpenses)}`;
       document.getElementById('result-profit').textContent = 
           EstateApp.formatCurrency(profit);
   },

   calculateRenovationProfit() {
       const cost = parseInt(document.getElementById('reno-cost').value) || 0;
       const price = parseInt(document.getElementById('reno-price').value) || 0;
       const profit = price - cost;
       const profitRate = price > 0 ? (profit / price * 100).toFixed(1) : 0;
       
       document.getElementById('reno-result-price').textContent = 
           EstateApp.formatCurrency(price);
       document.getElementById('reno-result-cost').textContent = 
           `-${EstateApp.formatCurrency(cost)}`;
       document.getElementById('reno-result-profit').textContent = 
           EstateApp.formatCurrency(profit);
       document.getElementById('reno-result-rate').textContent = `${profitRate}%`;
   },

   saveRealEstateSale() {
       const propertyId = document.getElementById('sale-property').value;
       const property = propertyId ? Storage.getProperty(propertyId) : null;
       const propertyName = property?.name || document.getElementById('property-name-input').value;
       const dealName = document.getElementById('deal-name').value;
       const transactionType = document.getElementById('transaction-type').value;
       const salePrice = parseInt(document.getElementById('sale-price').value);
       const otherExpenses = parseInt(document.getElementById('other-expenses').value) || 0;
       
       // 物件名が必須
       if (!propertyName) {
           alert('物件名を入力するか、物件を選択してください');
           return;
       }
       
       let profit = 0;
       let commission = 0;
       let commissionType = '';
       let purchasePrice = 0;
       
       if (transactionType === 'seller') {
           purchasePrice = parseInt(document.getElementById('purchase-price-input').value) || 0;
           profit = salePrice - purchasePrice - otherExpenses;
       } else {
           commissionType = document.getElementById('commission-type').value;
           
           if (commissionType === 'fixed') {
               commission = 300000;
           } else if (commissionType === 'standard') {
               commission = this.calculateStandardCommission(salePrice);
           } else if (commissionType === 'direct') {
               commission = parseInt(document.getElementById('commission-amount').value) || 0;
           }
           
           if (transactionType === 'both-agent') {
               commission = commission * 2;
           }
           
           profit = commission - otherExpenses;
       }
       
       const sale = {
           type: 'realestate',
           saleNumber: document.getElementById('sale-number').value || null,
           dealName,
           propertyId,
           propertyName,
           date: document.getElementById('sale-date').value,
           settlementDate: document.getElementById('settlement-date').value,
           loanConditionDate: document.getElementById('loan-condition-date').value || null,
           collectionDate: document.getElementById('collection-date').value || null,
           transactionType,
           salePrice,
           purchasePrice: transactionType === 'seller' ? purchasePrice : null,
           commissionType,
           commission,
           otherExpenses,
           profit,
           customerName: document.getElementById('customer-name').value,
           notes: document.getElementById('sale-notes').value,
           excludingTax: true,
           collectionStatus: document.getElementById('collection-date').value ? 'collected' : 'pending'
       };
       
       Storage.saveSale(sale);
       
       // エフェクト表示
       if (typeof Effects !== 'undefined') {
           Effects.showSaveEffect(profit, true);
       }
       
       // フォームリセット
       document.getElementById('realestate-form').reset();
       document.getElementById('deal-name').value = '';
       document.getElementById('property-name-input').value = '';
       document.getElementById('purchase-price-input').value = '';
       document.getElementById('sale-number').value = '';
       document.getElementById('settlement-date').value = '';
       document.getElementById('loan-condition-date').value = '';
       document.getElementById('collection-date').value = '';
       this.loadDefaults();
       const today = new Date().toISOString().split('T')[0];
       document.getElementById('sale-date').value = today;
       
       // 物件ステータスを更新
       if (propertyId) {
           // 売買成約時は契約済みに更新
           Storage.updateProperty(propertyId, { status: 'contracted' });
       }
       
       EstateApp.showToast('売上を登録しました');
       
      // 画面を更新
      Dashboard.refresh();
      if (typeof Calendar !== 'undefined') {
          Calendar.render();
      }
   },

   saveRenovationSale() {
       const dealName = document.getElementById('reno-deal-name').value;
       const cost = parseInt(document.getElementById('reno-cost').value);
       const price = parseInt(document.getElementById('reno-price').value);
       const profit = price - cost;
       
       const sale = {
           type: 'renovation',
           saleNumber: document.getElementById('reno-sale-number').value || null,
           dealName,
           propertyName: document.getElementById('reno-property-name').value,
           date: document.getElementById('reno-date').value,
           collectionDate: document.getElementById('reno-collection-date').value || null,
           content: document.getElementById('reno-content').value,
           cost,
           price,
           profit,
           contractor: document.getElementById('reno-contractor').value,
           collectionStatus: document.getElementById('reno-collection-date').value ? 'collected' : 'pending'
       };
       
       Storage.saveSale(sale);
       
       // エフェクト表示
       if (typeof Effects !== 'undefined') {
           Effects.showSaveEffect(profit, true);
       }
       
       // フォームリセット
       document.getElementById('renovation-form').reset();
       const today = new Date().toISOString().split('T')[0];
       document.getElementById('reno-date').value = today;
       
       EstateApp.showToast('リフォーム売上を登録しました');
       
      // 画面を更新
      Dashboard.refresh();
      if (typeof Calendar !== 'undefined') {
          Calendar.render();
      }
   },

   saveOtherSale() {
       const dealName = document.getElementById('other-deal-name').value;
       const amount = parseInt(document.getElementById('other-amount').value);
       
       const sale = {
           type: 'other',
           saleNumber: document.getElementById('other-sale-number').value || null,
           dealName,
           subType: document.getElementById('other-type').value,
           date: document.getElementById('other-date').value,
           collectionDate: document.getElementById('other-collection-date').value || null,
           amount: amount,
           customerName: document.getElementById('other-customer').value,
           description: document.getElementById('other-description').value,
           profit: amount,
           collectionStatus: document.getElementById('other-collection-date').value ? 'collected' : 'pending'
       };
       
       Storage.saveSale(sale);
       
       // エフェクト表示
       if (typeof Effects !== 'undefined') {
           Effects.showSaveEffect(amount, true);
       }
       
       // フォームリセット
       document.getElementById('other-form').reset();
       const today = new Date().toISOString().split('T')[0];
       document.getElementById('other-date').value = today;
       
       EstateApp.showToast('売上を登録しました');
       
       // 画面を更新
      Dashboard.refresh();
      if (typeof Calendar !== 'undefined') {
          Calendar.render();
      }
   }
};

// グローバルスコープに公開
window.Sales = Sales;
