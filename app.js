// 语言配置
const translations = {
    zh: {
        title: '数据收集',
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
        type: '类型：',
        selectType: '请选择类型',
        type1: '类型1',
        type2: '类型2',
        type3: '类型3',
        type4: '类型4',
        type5: '类型5',
        type6: '类型6',
        type7: '类型7',
        type8: '类型8',
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
        confirmShowDetails: '确定要显示详细信息吗？'
    },
    en: {
        title: 'Data Collection',
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
        type: 'Type:',
        selectType: 'Select Type',
        type1: 'Type 1',
        type2: 'Type 2',
        type3: 'Type 3',
        type4: 'Type 4',
        type5: 'Type 5',
        type6: 'Type 6',
        type7: 'Type 7',
        type8: 'Type 8',
        save: 'Save',
        export: 'Export Data',
        savedRecords: 'Saved Records',
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
        ageGroup: 'Age Group',
        gender: 'Gender',
        type: 'Type'
    }
};

// 当前语言
let currentLang = 'en';

// 存储键名
const STORAGE_KEY = 'collected_data';
const LAST_SAVE_DATE_KEY = 'last_save_date';

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

// 检查是否需要开始新的一天
function checkNewDay() {
    const today = new Date().toLocaleDateString();
    const lastSaveDate = localStorage.getItem(LAST_SAVE_DATE_KEY);
    
    if (lastSaveDate && lastSaveDate !== today) {
        // 导出昨天的数据
        exportData(lastSaveDate);
        // 清空记录
        records = [];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        // 清除表单状态
        localStorage.removeItem('form_state');
    }
    
    localStorage.setItem(LAST_SAVE_DATE_KEY, today);
}

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
           record.ageGroup && record.ageGroup !== '' && record.ageGroup !== 'Select Age Group' && 
           record.gender && record.gender !== '' && 
           record.type && record.type !== '' && record.type !== 'Select Type';
}

// 搜索功能
function filterRecords(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const filteredRecords = records.filter(record => 
        record.initial.toLowerCase().includes(term)
    );
    
    // 更新搜索结果统计
    if (term === '') {
        searchResults.textContent = 'Showing all records';
    } else {
        searchResults.textContent = `Found ${filteredRecords.length} record(s)`;
    }
    
    // 渲染过滤后的记录
    renderRecords(filteredRecords, term);
}

// 修改渲染记录列表函数以支持搜索和简化显示
function renderRecords(recordsToRender = records, searchTerm = '') {
    const recordsToShow = recordsToRender || records;
    
    recordsList.innerHTML = recordsToShow.map((record, index) => {
        const isComplete = isRecordComplete(record);
        const missingFields = [];
        
        if (!record.ageGroup || record.ageGroup === '' || record.ageGroup === 'Select Age Group') missingFields.push('Age Group');
        if (!record.gender || record.gender === '') missingFields.push('Gender');
        if (!record.type || record.type === '' || record.type === 'Select Type') missingFields.push('Type');
        
        // 高亮显示匹配的文本
        let initialDisplay = record.initial;
        if (searchTerm) {
            const regex = new RegExp(`(${searchTerm})`, 'gi');
            initialDisplay = record.initial.replace(regex, '<span class="highlight">$1</span>');
        }
        
        const statusText = isComplete ? translations[currentLang].complete : 
            (missingFields.length > 0 ? `${translations[currentLang].missingInfo}: ${missingFields.join(', ')}` : '');

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
                        <span class="detail-value">${record.ageGroup || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">${translations[currentLang].gender}:</span>
                        <span class="detail-value">${record.gender ? (record.gender === 'male' ? translations[currentLang].male : translations[currentLang].female) : '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">${translations[currentLang].type}:</span>
                        <span class="detail-value">${record.type || '-'}</span>
                    </div>
                </div>
                <div class="record-actions">
                    <button class="toggle-details-btn" onclick="toggleDetails(${index})" data-index="${index}">
                        ${translations[currentLang].showDetails}
                    </button>
                    <button class="edit-btn" onclick="window.location.href='edit.html?index=${index}'">${translations[currentLang].edit}</button>
                    <button class="delete-btn" onclick="deleteRecord(${index})">${translations[currentLang].delete}</button>
                </div>
            </div>
        `;
    }).join('');
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
    document.getElementById('type').value = record.type;
    editingIndex = index;
    
    // 更改保存按钮文本
    document.querySelector('button[type="submit"]').textContent = 'Update';
}

// 保存新记录
dataForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const initial = document.getElementById('initial').value.trim();
    if (!initial) {
        alert('Initial is required!');
        return;
    }
    
    const ageGroup = document.getElementById('ageGroup').value;
    const gender = document.querySelector('input[name="gender"]:checked')?.value;
    const type = document.getElementById('type').value;

    const formData = {
        initial: initial,
        ageGroup: ageGroup === 'Select Age Group' ? '' : ageGroup,
        gender: gender || '',
        type: type === 'Select Type' ? '' : type,
        timestamp: new Date().getTime()
    };
    
    records.push(formData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    renderRecords();
    
    // 重置表单并清除自动保存的状态
    dataForm.reset();
    localStorage.removeItem('form_state');
});

// 删除记录
function deleteRecord(index) {
    if (confirm('Are you sure you want to delete this record?')) {
        records.splice(index, 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        renderRecords();
    }
}

// 导出数据
function exportData(date = new Date().toLocaleDateString()) {
    if (records.length === 0) {
        alert(translations[currentLang].noData);
        return;
    }
    
    // 检查是否所有记录都完整
    const incompleteRecords = records.filter(record => !isRecordComplete(record));
    if (incompleteRecords.length > 0) {
        alert('Please complete all records before exporting!');
        return;
    }
    
    const headers = ['Initial', 'Age Group', 'Gender', 'Type', 'Timestamp'];
    
    const csvContent = [
        headers.join(','),
        ...records.map(record => [
            record.initial || '',
            record.ageGroup || '',
            record.gender === 'male' ? 'Male' : 'Female',
            record.type || '',
            record.timestamp ? new Date(record.timestamp).toLocaleString() : ''
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `data_export_${date}.csv`);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // 清理URL对象
}

// 导出按钮事件
exportBtn.addEventListener('click', () => {
    exportData();
});

// 自动保存功能
function setupAutoSave() {
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            const formState = {
                initial: document.getElementById('initial').value.trim(),
                ageGroup: document.getElementById('ageGroup').value,
                gender: document.querySelector('input[name="gender"]:checked')?.value || '',
                type: document.getElementById('type').value
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
        if (formState.type) document.getElementById('type').value = formState.type;
    }
}

// 添加搜索事件监听器
searchInput.addEventListener('input', (e) => {
    filterRecords(e.target.value);
});

// 初始化
function init() {
    checkNewDay();
    updateLanguage();
    renderRecords();
    setupAutoSave();
    restoreFormState();
}

// 启动应用
init(); 