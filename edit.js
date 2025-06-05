// 获取URL参数
const urlParams = new URLSearchParams(window.location.search);
const editIndex = parseInt(urlParams.get('index'));

// 存储键名
const STORAGE_KEY = 'collected_data';

// 获取DOM元素
const editForm = document.getElementById('editForm');
const cancelBtn = document.getElementById('cancelBtn');

// 从localStorage加载数据
let records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

// 如果有有效的索引，加载数据到表单
if (!isNaN(editIndex) && editIndex >= 0 && editIndex < records.length) {
    const record = records[editIndex];
    document.getElementById('initial').value = record.initial || '';
    document.getElementById('age').value = record.age || '';
    if (record.gender) {
        document.querySelector(`input[name="gender"][value="${record.gender}"]`).checked = true;
    }
    document.getElementById('type').value = record.type || '';
}

// 处理表单提交
editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!isNaN(editIndex) && editIndex >= 0 && editIndex < records.length) {
        // 更新记录
        const updatedRecord = {
            ...records[editIndex],
            age: document.getElementById('age').value,
            gender: document.querySelector('input[name="gender"]:checked')?.value || '',
            type: document.getElementById('type').value
        };
        
        records[editIndex] = updatedRecord;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        
        // 返回主页
        window.location.href = 'index.html';
    }
});

// 取消按钮处理
cancelBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
}); 