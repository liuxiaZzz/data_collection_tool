// 获取记录索引
const urlParams = new URLSearchParams(window.location.search);
const recordIndex = urlParams.get('index');

// 从localStorage获取数据
const STORAGE_KEY = 'collected_data';
const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
const record = records[recordIndex];

// 填充表单数据
function populateForm() {
    if (!record) {
        alert('Record not found');
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('initial').value = record.initial || '';
    document.getElementById('ageGroup').value = record.ageGroup || '';
    if (record.gender) {
        document.querySelector(`input[name="gender"][value="${record.gender}"]`).checked = true;
    }
    document.getElementById('type').value = record.type || '';
}

// 处理表单提交
document.getElementById('editForm').addEventListener('submit', (e) => {
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
        ageGroup: ageGroup === '' ? '' : ageGroup,
        gender: gender || '',
        type: type === '' ? '' : type,
        timestamp: record.timestamp // 保持原始timestamp不变
    };

    // 更新记录
    records[recordIndex] = formData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

    // 返回主页面
    window.location.href = 'index.html';
});

// 初始化页面
populateForm(); 