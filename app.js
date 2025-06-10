// 语言配置
const translations = {
    zh: {
        title: 'Clinical Research Database',
        ageGroup: '年龄组：',
        selectAgeGroup: '请选择年龄组',
        ageGroup1: '0-10岁',
        ageGroup2: '11-20岁',
        ageGroup3: '21-30岁',
        ageGroup4: '31-40岁',
        ageGroup5: '41-50岁',
        ageGroup6: '51-60岁',
        ageGroup7: '61-70岁',
        ageGroup8: '71-80岁',
        ageGroup9: '80岁以上',
        gender: '性别：',
        male: '男',
        female: '女',
        diseaseType: '疾病类型：',
        selectDiseaseType: '请选择疾病类型',
        disease1: '急性中耳炎',
        disease2: '中耳胆脂瘤',
        disease3: '慢性化脓性中耳炎',
        disease4: '外耳道出血',
        disease5: '耵聍嵌塞',
        disease6: '正常',
        disease7: '外耳道真菌病',
        disease8: '分泌性中耳炎',
        disease9: '鼓膜钙化',
        save: '保存',
        export: '导出数据',
        savedRecords: '已保存记录',
        delete: '删除',
        confirmDelete: '确定要删除这条记录吗？',
        noData: '没有可导出的数据',
        autoSaved: '已自动保存',
        viewDetails: '查看详情',
        missingInfo: '缺少信息',
        complete: '完整',
        edit: '编辑',
        showDetails: '显示详情',
        hideDetails: '隐藏详情',
        confirmShowDetails: '确定要显示详细信息吗？',
        showingAll: '显示所有记录',
        found: '找到',
        records: '记录'
    },
    en: {
        title: 'Clinical Research Database',
        ageGroup: 'Age Group:',
        selectAgeGroup: 'Select Age Group',
        ageGroup1: '0-10 years',
        ageGroup2: '11-20 years',
        ageGroup3: '21-30 years',
        ageGroup4: '31-40 years',
        ageGroup5: '41-50 years',
        ageGroup6: '51-60 years',
        ageGroup7: '61-70 years',
        ageGroup8: '71-80 years',
        ageGroup9: 'Above 80 years',
        gender: 'Gender:',
        male: 'Male',
        female: 'Female',
        diseaseType: 'Disease Type:',
        selectDiseaseType: 'Select Disease Type',
        disease1: 'Acute Otitis Media',
        disease2: 'Cholesteatoma of middle ear',
        disease3: 'Chronic suppurative otitis media',
        disease4: 'External auditory canal bleeding',
        disease5: 'Impacted cerumen',
        disease6: 'Normal',
        disease7: 'Otomycosis external',
        disease8: 'Secretory otitis media',
        disease9: 'Tympanic membrane calcification',
        save: 'Save Record',
        export: 'Export Data',
        savedRecords: 'Recorded Entries',
        delete: 'Delete',
        confirmDelete: 'Are you sure you want to delete this record?',
        noData: 'No data to export',
        autoSaved: 'Auto Saved',
        viewDetails: 'View Details',
        missingInfo: 'Missing Info',
        complete: 'Complete',
        edit: 'Edit',
        showDetails: 'Show Details',
        hideDetails: 'Hide Details',
        confirmShowDetails: 'Are you sure you want to show the details?',
        showingAll: 'Showing all records',
        found: 'Found',
        records: 'record(s)'
    }
};

// 当前语言
let currentLang = 'en';

// 存储键名
const STORAGE_KEY = 'collected_data';
const LAST_SAVE_DATE_KEY = 'last_save_date';

// 数据库配置
const DB_NAME = 'clinicalResearchDB';
const DB_VERSION = 1;
const STORE_NAME = 'records';

// 存储状态指示器
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24小时
const LAST_BACKUP_KEY = 'last_backup_date';

// 注册Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js', { scope: './' })
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// 获取DOM元素
const dataForm = document.getElementById('dataForm');
const recordsList = document.getElementById('recordsList');
const exportBtn = document.getElementById('exportBtn');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

// 创建自动保存状态提示元素
const autoSaveStatus = document.createElement('div');
autoSaveStatus.className = 'auto-save-status';
document.body.appendChild(autoSaveStatus);

// 从localStorage加载数据
let records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let editingIndex = -1;

// 自动保存提示
function showAutoSaveStatus() {
    autoSaveStatus.textContent = 'Auto Saved';
    autoSaveStatus.classList.add('show');
    setTimeout(() => {
        autoSaveStatus.classList.remove('show');
    }, 2000);
}

// 更新语言
function updateLanguage() {
    document.querySelectorAll('[data-lang]').forEach(element => {
        const key = element.getAttribute('data-lang');
        if (element.tagName === 'INPUT' || element.tagName === 'OPTION') {
            element.value = translations[currentLang][key] || '';
        } else {
            element.textContent = translations[currentLang][key] || '';
        }
    });
    renderRecords();
}

// 检查记录是否完整
function isRecordComplete(record) {
    return record.initial && 
           record.ageGroup && record.ageGroup !== '' && 
           record.gender && record.gender !== '' && 
           record.diseaseType && record.diseaseType !== '';
}

// 处理表单数据，统一处理未填写的值
function processFormData(formElement) {
    const ageGroup = formElement.querySelector('#ageGroup').value;
    const diseaseType = formElement.querySelector('#diseaseType').value;
    
    return {
        initial: formElement.querySelector('#initial').value.trim(),
        ageGroup: ageGroup === 'Select Age Group' ? '' : ageGroup,
        gender: formElement.querySelector('input[name="gender"]:checked')?.value || '',
        diseaseType: diseaseType === 'Select Disease Type' ? '' : diseaseType
    };
}

// 搜索功能
async function filterRecords(searchTerm) {
    try {
        // 每次搜索时重新加载记录
        const records = await loadRecords();
        
    const term = searchTerm.toLowerCase().trim();
        const filteredRecords = term === '' ? records : records.filter(record => 
            record.initial && record.initial.toLowerCase().includes(term)
    );
    
    // 更新搜索结果统计
    if (term === '') {
            searchResults.textContent = translations[currentLang].showingAll || 'Showing all records';
    } else {
            searchResults.textContent = `${translations[currentLang].found || 'Found'} ${filteredRecords.length} ${translations[currentLang].records || 'record(s)'}`;
    }
    
    // 渲染过滤后的记录
        await renderRecords(filteredRecords, term);
    } catch (error) {
        console.error('Failed to search records', error);
        showToast('Failed to search records', true);
    }
}

// 修改渲染记录列表函数以支持搜索和简化显示
async function renderRecords(recordsToRender = null, searchTerm = '') {
    try {
        // 如果没有提供记录，则加载所有记录
        const records = recordsToRender || await loadRecords();
        
        recordsList.innerHTML = records.map((record, index) => {
        const isComplete = isRecordComplete(record);
        const missingFields = [];
        
        if (!record.ageGroup || record.ageGroup === '' || record.ageGroup === 'Select Age Group') missingFields.push('Age Group');
        if (!record.gender || record.gender === '') missingFields.push('Gender');
            if (!record.diseaseType || record.diseaseType === '' || record.diseaseType === 'Select Disease Type') missingFields.push('Disease Type');
        
        // 高亮显示匹配的文本
            let initialDisplay = record.initial || '';
            if (searchTerm && initialDisplay) {
                const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
                initialDisplay = initialDisplay.replace(regex, '<span class="highlight">$1</span>');
        }
        
        const statusText = isComplete ? translations[currentLang].complete : 
            (missingFields.length > 0 ? `${translations[currentLang].missingInfo}: ${missingFields.join(', ')}` : '');

            // 处理显示值，如果是默认选项就显示'-'
            const displayAgeGroup = (!record.ageGroup || record.ageGroup === 'Select Age Group') ? '-' : record.ageGroup;
            const displayDiseaseType = (!record.diseaseType || record.diseaseType === 'Select Disease Type') ? '-' : record.diseaseType;

        return `
            <div class="record-item ${!isComplete ? 'incomplete' : ''}">
                <div class="record-summary">
                    <span class="record-initial">${initialDisplay}</span>
                    <span class="record-timestamp">${new Date(record.timestamp).toLocaleString()}</span>
                    <span class="record-status ${isComplete ? 'complete' : 'incomplete'}">
                        ${statusText}
                    </span>
                </div>
                <div class="record-details" id="details-${index}" style="display: none;">
                    <div class="detail-row">
                        <span class="detail-label">${translations[currentLang].ageGroup}:</span>
                            <span class="detail-value">${displayAgeGroup}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">${translations[currentLang].gender}:</span>
                        <span class="detail-value">${record.gender ? (record.gender === 'male' ? translations[currentLang].male : translations[currentLang].female) : '-'}</span>
                    </div>
                    <div class="detail-row">
                            <span class="detail-label">${translations[currentLang].diseaseType}:</span>
                            <span class="detail-value">${displayDiseaseType}</span>
                        </div>
                </div>
                <div class="record-actions">
                    <button class="toggle-details-btn" onclick="toggleDetails(${index})" data-index="${index}">
                        ${translations[currentLang].showDetails}
                    </button>
                        <button class="edit-btn" onclick="window.location.href='edit.html?timestamp=${record.timestamp}'">${translations[currentLang].edit}</button>
                        <button class="delete-btn" onclick="deleteRecord(${record.timestamp})">${translations[currentLang].delete}</button>
                    </div>
            </div>
        `;
    }).join('');
    } catch (error) {
        console.error('Failed to display records', error);
        showToast('Failed to display records', true);
    }
}

// 添加切换详情显示的函数
function toggleDetails(index) {
    const detailsElement = document.getElementById(`details-${index}`);
    const toggleButton = document.querySelector(`button.toggle-details-btn[data-index="${index}"]`);
    
    if (detailsElement.style.display === 'none') {
        if (confirm(translations[currentLang].confirmShowDetails)) {
            detailsElement.style.display = 'block';
            toggleButton.textContent = translations[currentLang].hideDetails;
        }
    } else {
        detailsElement.style.display = 'none';
        toggleButton.textContent = translations[currentLang].showDetails;
    }
}

// 编辑记录
function editRecord(index) {
    const record = records[index];
    document.getElementById('initial').value = record.initial || '';
    document.getElementById('ageGroup').value = record.ageGroup;
    document.querySelector(`input[name="gender"][value="${record.gender}"]`).checked = true;
    document.getElementById('diseaseType').value = record.diseaseType;
    editingIndex = index;
    
    // 更改保存按钮文本
    document.querySelector('button[type="submit"]').textContent = 'Update';
}

// 初始化数据库
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Failed to open database');
            reject(request.error);
        };

        request.onsuccess = () => {
            const db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'timestamp' });
                store.createIndex('initial', 'initial', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: true });
            }
        };
    });
}

// 保存记录到IndexedDB
async function saveRecord(record) {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(record);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('保存到IndexedDB失败，回退到localStorage', error);
        // 回退到localStorage
        const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        records.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
}

// 从IndexedDB加载记录
async function loadRecords() {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('从IndexedDB加载失败，回退到localStorage', error);
        // 回退到localStorage
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    }
}

// 删除记录
async function deleteRecordFromDB(timestamp) {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(timestamp);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('从IndexedDB删除失败，回退到localStorage', error);
        // 回退到localStorage
        const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const index = records.findIndex(r => r.timestamp === timestamp);
        if (index !== -1) {
        records.splice(index, 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        }
    }
}

// 导出数据为CSV并自动下载
async function exportToCSV(startDate = null, endDate = null) {
    try {
        const records = await loadRecords();
    if (records.length === 0) {
        alert(translations[currentLang].noData);
        return;
    }
    
        // 如果指定了日期范围，过滤记录
        let filteredRecords = records;
        if (startDate && endDate) {
            filteredRecords = records.filter(record => {
                const recordDate = new Date(record.timestamp);
                return recordDate >= startDate && recordDate <= endDate;
            });
        }

        if (filteredRecords.length === 0) {
            alert('No records found in the specified date range');
        return;
    }
    
        const headers = ['Initial', 'Age Group', 'Gender', 'Disease Type', 'Timestamp'];
    const csvContent = [
        headers.join(','),
            ...filteredRecords.map(record => [
            record.initial || '',
            record.ageGroup || '',
                record.gender || '',
                record.diseaseType || '',
            record.timestamp ? new Date(record.timestamp).toLocaleString() : ''
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
        link.setAttribute('href', url);
        
        // 设置文件名
        const dateStr = startDate && endDate ? 
            `_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}` : 
            `_${new Date().toISOString().split('T')[0]}`;
        link.setAttribute('download', `clinical_research_data${dateStr}.csv`);
        
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast(`Successfully exported ${filteredRecords.length} records`);
    } catch (error) {
        console.error('导出失败', error);
        showToast('Export failed. Please try again.', true);
    }
}

// 获取数据统计
async function getDataStats() {
    try {
        const records = await loadRecords();
        const stats = {
            total: records.length,
            complete: records.filter(record => isRecordComplete(record)).length,
            incomplete: records.filter(record => !isRecordComplete(record)).length,
            byDiseaseType: {},
            byAgeGroup: {},
            byGender: {
                male: 0,
                female: 0
            }
        };

        // 统计疾病类型分布
        records.forEach(record => {
            if (record.diseaseType) {
                stats.byDiseaseType[record.diseaseType] = (stats.byDiseaseType[record.diseaseType] || 0) + 1;
            }
            if (record.ageGroup) {
                stats.byAgeGroup[record.ageGroup] = (stats.byAgeGroup[record.ageGroup] || 0) + 1;
            }
            if (record.gender) {
                stats.byGender[record.gender]++;
            }
        });

        return stats;
    } catch (error) {
        console.error('获取统计数据失败', error);
        return null;
    }
}

// 显示导出对话框
function showExportDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'export-dialog';
    dialog.innerHTML = `
        <div class="export-dialog-content card">
            <div class="dialog-header">
                <h2>
                    <i class="fas fa-file-export"></i>
                    Export Data
                </h2>
            </div>
            <div class="dialog-body">
                <div class="form-group">
                    <label for="startDate">
                        <i class="fas fa-calendar"></i>
                        Start Date
                    </label>
                    <input type="date" id="startDate" class="date-input">
                </div>
                <div class="form-group">
                    <label for="endDate">
                        <i class="fas fa-calendar-alt"></i>
                        End Date
                    </label>
                    <input type="date" id="endDate" class="date-input">
                </div>
                <div class="export-info">
                    <i class="fas fa-info-circle"></i>
                    <span>Leave dates empty to export all records</span>
                </div>
            </div>
            <div class="dialog-buttons">
                <button id="exportAll" class="btn primary-btn">
                    <i class="fas fa-download"></i>
                    Export All Data
                </button>
                <button id="exportRange" class="btn secondary-btn">
                    <i class="fas fa-calendar-check"></i>
                    Export Date Range
                </button>
                <button id="cancelExport" class="btn cancel-btn">
                    <i class="fas fa-times"></i>
                    Cancel
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    // 点击背景关闭对话框
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            document.body.removeChild(dialog);
        }
    });

    // 添加事件监听器
    document.getElementById('exportAll').addEventListener('click', () => {
        exportToCSV();
        document.body.removeChild(dialog);
    });

    document.getElementById('exportRange').addEventListener('click', () => {
        const startDate = new Date(document.getElementById('startDate').value);
        const endDate = new Date(document.getElementById('endDate').value);
        if (startDate && endDate) {
            if (startDate > endDate) {
                showToast('Start date must be before end date', true);
                return;
            }
            exportToCSV(startDate, endDate);
            document.body.removeChild(dialog);
        } else {
            showToast('Please select both start and end dates', true);
        }
    });

    document.getElementById('cancelExport').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });
}

// 更新导出按钮事件监听器
exportBtn.addEventListener('click', showExportDialog);

// 自动保存功能
function setupAutoSave() {
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            const formState = {
                initial: document.getElementById('initial').value.trim(),
                ageGroup: document.getElementById('ageGroup').value,
                gender: document.querySelector('input[name="gender"]:checked')?.value || '',
                diseaseType: document.getElementById('diseaseType').value
            };
            localStorage.setItem('form_state', JSON.stringify(formState));
            showAutoSaveStatus();
        });
    });
}

// 恢复表单状态
function restoreFormState() {
    const formState = JSON.parse(localStorage.getItem('form_state') || '{}');
    if (Object.keys(formState).length > 0) {
        if (formState.initial) document.getElementById('initial').value = formState.initial;
        if (formState.ageGroup) document.getElementById('ageGroup').value = formState.ageGroup;
        if (formState.gender) {
            const radio = document.querySelector(`input[name="gender"][value="${formState.gender}"]`);
            if (radio) radio.checked = true;
        }
        if (formState.diseaseType) document.getElementById('diseaseType').value = formState.diseaseType;
    }
}

// 修改搜索事件监听器
searchInput.addEventListener('input', (e) => {
    filterRecords(e.target.value);
});

// 修改表单提交处理
dataForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const initial = document.getElementById('initial').value.trim();
    if (!initial) {
        alert('Initial is required!');
        return;
    }
    
    const formData = {
        ...processFormData(dataForm),
        timestamp: new Date().getTime()
    };
    
    try {
        await saveRecord(formData);
        const records = await loadRecords();
        renderRecords(records);
        dataForm.reset();
        localStorage.removeItem('form_state');
        showToast('Record saved successfully!');
    } catch (error) {
        console.error('Failed to save record', error);
        showToast('Failed to save record', true);
    }
});

// 修改删除记录函数
async function deleteRecord(timestamp) {
    if (confirm(translations[currentLang].confirmDelete)) {
        try {
            await deleteRecordFromDB(timestamp);
            const records = await loadRecords();
            renderRecords(records);
            showToast('Record deleted successfully!');
        } catch (error) {
            console.error('Failed to delete record', error);
            showToast('Failed to delete record', true);
        }
    }
}

// 更新存储状态显示
async function updateStorageStatus() {
    try {
        const records = await loadRecords();
        const storageType = await checkStorageType();
        const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
        const lastBackupDate = lastBackup ? new Date(parseInt(lastBackup)) : null;
        
        const statusDiv = document.getElementById('storageStatus');
        statusDiv.innerHTML = `
            <div class="storage-info">
                <div class="storage-type ${storageType === 'indexedDB' ? 'secure' : 'fallback'}">
                    <i class="fas ${storageType === 'indexedDB' ? 'fa-database' : 'fa-hdd'}"></i>
                    ${storageType === 'indexedDB' ? 'Using IndexedDB (Secure Storage)' : 'Using LocalStorage (Fallback Storage)'}
                </div>
                <div class="record-count">
                    <i class="fas fa-file-medical"></i>
                    Total Records: ${records.length}
                </div>
                ${lastBackupDate ? `
                <div class="last-backup">
                    <i class="fas fa-clock"></i>
                    Last Backup: ${lastBackupDate.toLocaleString()}
                </div>` : ''}
            </div>
            <div class="backup-actions">
                <button id="backupBtn" class="backup-btn" onclick="backupData()">
                    <i class="fas fa-download"></i>
                    Backup Data
                </button>
                <button id="restoreBtn" class="restore-btn" onclick="document.getElementById('restoreFile').click()">
                    <i class="fas fa-upload"></i>
                    Restore Data
                </button>
                <input type="file" id="restoreFile" accept=".json" style="display: none" onchange="restoreData(event)">
            </div>
        `;
        
        // 检查是否需要备份提醒
        if (lastBackupDate && Date.now() - lastBackupDate.getTime() > BACKUP_INTERVAL) {
            showToast('It is recommended to backup your data', false, 10000);
        }
    } catch (error) {
        console.error('Failed to update storage status', error);
    }
}

// 检查当前使用的存储类型
async function checkStorageType() {
    try {
        await initDB();
        return 'indexedDB';
    } catch {
        return 'localStorage';
    }
}

// 备份数据
async function backupData() {
    try {
        const records = await loadRecords();
        const backupData = {
            version: '1.0',
            timestamp: new Date().getTime(),
            records: records
        };
        
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        
        link.href = url;
        link.download = `clinical_research_backup_${dateStr}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // 更新最后备份时间
        localStorage.setItem(LAST_BACKUP_KEY, Date.now().toString());
        updateStorageStatus();
        
        showToast('Data backup successful!');
    } catch (error) {
        console.error('Backup failed', error);
        showToast('Backup failed, please try again', true);
    }
}

// 恢复数据
async function restoreData(event) {
    try {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const backupData = JSON.parse(e.target.result);
                
                // 验证备份文件格式
                if (!backupData.version || !backupData.timestamp || !Array.isArray(backupData.records)) {
                    throw new Error('Invalid backup file format');
                }

                // 确认恢复操作
                if (!confirm('This will replace all current data with the backup data. Are you sure you want to continue?')) {
                    return;
                }

                // 清除现有数据
                const db = await initDB();
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                await new Promise((resolve, reject) => {
                    const request = store.clear();
                    request.onsuccess = resolve;
                    request.onerror = () => reject(request.error);
                });

                // 恢复备份数据
                for (const record of backupData.records) {
                    await new Promise((resolve, reject) => {
                        const request = store.add(record);
                        request.onsuccess = resolve;
                        request.onerror = () => reject(request.error);
                    });
                }

                // 更新界面
                const records = await loadRecords();
                renderRecords(records);
                updateStorageStatus();
                
                showToast(`Successfully restored ${backupData.records.length} records`);
            } catch (error) {
                console.error('Failed to restore data:', error);
                showToast('Failed to restore data: Invalid backup file', true);
            }
        };

        reader.readAsText(file);
    } catch (error) {
        console.error('Failed to restore data:', error);
        showToast('Failed to restore data', true);
    } finally {
        // 清除文件选择，允许选择同一文件
        event.target.value = '';
    }
}

// 修改初始化函数
async function init() {
    try {
    updateLanguage();
        const records = await loadRecords();
        renderRecords(records);
    setupAutoSave();
    restoreFormState();
        await updateStorageStatus();

        // 显示数据统计
        const stats = await getDataStats();
        if (stats) {
            console.log('Current data statistics:', stats);
        }
    } catch (error) {
        console.error('Failed to initialize application', error);
        showToast('Failed to initialize application', true);
    }
}

// 修改showToast函数支持自定义显示时间
function showToast(message, isError = false, duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show${isError ? ' error' : ''}`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// 添加导出对话框样式
const style = document.createElement('style');
style.textContent = `
.export-dialog {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.export-dialog-content {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    max-width: 500px;
    width: 90%;
}

.date-range {
    margin: 1rem 0;
}

.dialog-buttons {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
}

.dialog-buttons button {
    flex: 1;
    padding: 0.5rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    background: var(--primary-color);
    color: white;
}

.dialog-buttons button:hover {
    opacity: 0.9;
}

#cancelExport {
    background: var(--danger-color);
}
`;
document.head.appendChild(style);

// 启动应用
init(); 