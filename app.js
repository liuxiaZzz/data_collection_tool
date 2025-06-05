// 语言配置
const translations = {
    zh: {
        title: '数据收集',
        age: '年龄：',
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
        age_label: '年龄',
        gender_label: '性别',
        type_label: '类型'
    },
    en: {
        title: 'Data Collection',
        age: 'Age:',
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
        age_label: 'Age',
        gender_label: 'Gender',
        type_label: 'Type'
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
    return record.initial && record.age && record.gender && record.type;
}

// 渲染记录列表
function renderRecords() {
    recordsList.innerHTML = records.map((record, index) => {
        const isComplete = isRecordComplete(record);
        const missingFields = [];
        
        if (!record.age) missingFields.push('Age');
        if (!record.gender) missingFields.push('Gender');
        if (!record.type) missingFields.push('Type');
        
        return `
            <div class="record-item ${!isComplete ? 'incomplete' : ''}">
                <div>
                    Initial: ${record.initial}
                    ${record.age ? ` | Age: ${record.age}` : ''}
                    ${record.gender ? ` | Gender: ${record.gender === 'male' ? 'Male' : 'Female'}` : ''}
                    ${record.type ? ` | Type: ${record.type}` : ''}
                    ${record.timestamp ? `<br>Saved at: ${new Date(record.timestamp).toLocaleString()}` : ''}
                    ${missingFields.length > 0 ? `<br><span class="missing">Missing: ${missingFields.join(', ')}</span>` : ''}
                </div>
                <div class="record-actions">
                    <button class="edit-btn" onclick="window.location.href='edit.html?index=${index}'">Edit</button>
                    <button class="delete-btn" onclick="deleteRecord(${index})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// 编辑记录
function editRecord(index) {
    const record = records[index];
    document.getElementById('initial').value = record.initial || '';
    document.getElementById('age').value = record.age;
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
    
    const formData = {
        initial: initial,
        age: document.getElementById('age').value || '',
        gender: document.querySelector('input[name="gender"]:checked')?.value || '',
        type: document.getElementById('type').value || '',
        timestamp: new Date().getTime()
    };
    
    records.push(formData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    renderRecords();
    dataForm.reset();
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
        alert('No data to export');
        return;
    }
    
    // 检查是否所有记录都完整
    const incompleteRecords = records.filter(record => !isRecordComplete(record));
    if (incompleteRecords.length > 0) {
        alert('Please complete all records before exporting!');
        return;
    }
    
    const headers = ['Initial', 'Age', 'Gender', 'Type', 'Timestamp'];
    
    const csvContent = [
        headers.join(','),
        ...records.map(record => [
            record.initial || '',
            record.age || '',
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
}

// 导出按钮事件
exportBtn.addEventListener('click', () => exportData());

// 自动保存功能
function setupAutoSave() {
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            localStorage.setItem('form_state', JSON.stringify({
                initial: document.getElementById('initial').value,
                age: document.getElementById('age').value,
                gender: document.querySelector('input[name="gender"]:checked')?.value,
                type: document.getElementById('type').value
            }));
            showAutoSaveStatus();
        });
    });
}

// 恢复表单状态
function restoreFormState() {
    const formState = JSON.parse(localStorage.getItem('form_state') || '{}');
    if (formState.initial) document.getElementById('initial').value = formState.initial;
    if (formState.age) document.getElementById('age').value = formState.age;
    if (formState.gender) {
        const radio = document.querySelector(`input[name="gender"][value="${formState.gender}"]`);
        if (radio) radio.checked = true;
    }
    if (formState.type) document.getElementById('type').value = formState.type;
}

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