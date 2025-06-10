// 数据库配置
const DB_NAME = 'clinicalResearchDB';
const DB_VERSION = 1;
const STORE_NAME = 'records';
const STORAGE_KEY = 'collected_data';

// 初始化数据库
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('无法打开数据库');
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

// 从IndexedDB获取记录
async function getRecord(timestamp) {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(parseInt(timestamp));

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('从IndexedDB获取记录失败，回退到localStorage', error);
        // 回退到localStorage
        const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return records.find(r => r.timestamp === parseInt(timestamp));
    }
}

// 更新记录
async function updateRecord(record) {
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
        console.error('更新到IndexedDB失败，回退到localStorage', error);
        // 回退到localStorage
        const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const index = records.findIndex(r => r.timestamp === record.timestamp);
        if (index !== -1) {
            records[index] = record;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        }
    }
}

// 获取记录时间戳
const urlParams = new URLSearchParams(window.location.search);
const timestamp = urlParams.get('timestamp');

if (!timestamp) {
    alert('No record specified');
    window.location.href = 'index.html';
}

// 填充表单数据
async function populateForm() {
    try {
        const record = await getRecord(parseInt(timestamp));
        if (!record) {
            alert('Record not found');
            window.location.href = 'index.html';
            return;
        }

        document.getElementById('initial').value = record.initial || '';
        
        // 处理年龄组选择
        const ageGroup = record.ageGroup;
        document.getElementById('ageGroup').value = ageGroup || '';
        
        // 处理性别选择
        if (record.gender) {
            document.querySelector(`input[name="gender"][value="${record.gender}"]`).checked = true;
        }
        
        // 处理疾病类型选择
        const diseaseType = record.diseaseType;
        document.getElementById('diseaseType').value = diseaseType || '';
    } catch (error) {
        console.error('加载记录失败', error);
        alert('Failed to load record');
        window.location.href = 'index.html';
    }
}

// 处理表单数据，统一处理未填写的值
function processFormData(formElement) {
    return {
        initial: formElement.querySelector('#initial').value.trim(),
        ageGroup: formElement.querySelector('#ageGroup').value || '',
        gender: formElement.querySelector('input[name="gender"]:checked')?.value || '',
        diseaseType: formElement.querySelector('#diseaseType').value || ''
    };
}

// 处理表单提交
document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const initial = document.getElementById('initial').value.trim();
    if (!initial) {
        alert('Initial is required!');
        return;
    }

    const formData = {
        ...processFormData(e.target),
        timestamp: parseInt(timestamp) // 保持原始timestamp不变
    };

    try {
        await updateRecord(formData);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('更新记录失败', error);
        alert('Failed to update record');
    }
});

// 初始化页面
populateForm(); 