// --- 전역 변수 설정 ---
const API_ENDPOINT = '/api/get-data';
const CHART_ENDPOINT = '/api/get-chart';
const DEVICE_LIST_ENDPOINT = '/api/get-device-list'; // (★신규)
const REFRESH_INTERVAL = 60000;

// --- DOM 요소 ---
// 차트 모달
let deviceChart = null;
const chartModal = document.getElementById('chart-modal');
const closeChartBtn = document.getElementById('close-chart-btn');
const chartCanvas = document.getElementById('device-chart');

// (★신규) 장치 목록 모달
const deviceListModal = document.getElementById('device-list-modal');
const showDeviceListBtn = document.getElementById('show-device-list-btn');
const closeListBtn = document.getElementById('close-list-btn');
const listContainer = document.getElementById('device-list-container');


// --- 1. 페이지 로드 시 이벤트 리스너 설정 ---
document.addEventListener('DOMContentLoaded', () => {
    // 1-1. 메인 데이터 로드 (1분마다)
    fetchData();
    setInterval(fetchData, REFRESH_INTERVAL);

    // 1-2. 2주 차트 버튼 클릭 이벤트
    document.querySelectorAll('.chart-btn').forEach(button => {
        button.addEventListener('click', () => {
            const deviceId = button.dataset.deviceId;
            showChart(deviceId);
        });
    });
    // 차트 모달 닫기
    closeChartBtn.addEventListener('click', () => {
        chartModal.classList.remove('show');
        if (deviceChart) {
            deviceChart.destroy();
        }
    });

    // 1-3. (★신규) 전체 장치 목록 버튼 클릭 이벤트
    showDeviceListBtn.addEventListener('click', showDeviceList);
    // 목록 모달 닫기
    closeListBtn.addEventListener('click', () => {
        deviceListModal.classList.remove('show');
    });
});


// --- 2. 최신 데이터를 가져오는 함수 (이전과 동일) ---
async function fetchData() {
    const statusBar = document.getElementById('status-bar');
    try {
        const response = await fetch(API_ENDPOINT);
        if (!response.ok) throw new Error(`HTTP 에러: ${response.status}`);
        const data = await response.json();

        statusBar.textContent = 'OpenApi Server Communication Success';
        statusBar.className = 'status-bar success';

        updatePanel('1', data['1']);
        updatePanel('2', data['2']);

    } catch (error) {
        console.error('데이터를 가져오는 데 실패했습니다:', error);
        statusBar.textContent = '서버 통신 실패';
        statusBar.className = 'status-bar error';
    }
}

// --- 3. 화면을 업데이트하는 함수 (이전과 동일) ---
function updatePanel(id, deviceData) {
    if (!deviceData) return;
    document.getElementById(`device-${id}-name`).textContent = deviceData.deviceName || '이름 없음';
    document.getElementById(`device-${id}-value`).textContent = parseFloat(deviceData.currentValue).toFixed(2);
    document.getElementById(`device-${id}-mac`).textContent = `MAC: ${deviceData.macAddress || 'MAC 없음'}`;
}


// --- 4. (★신규★) 전체 장치 목록을 가져와 팝업에 표시하는 함수 ---
async function showDeviceList() {
    deviceListModal.classList.add('show'); // 팝업 띄우기
    listContainer.innerHTML = '<p>목록을 불러오는 중...</p>'; // 로딩 표시

    try {
        const response = await fetch(DEVICE_LIST_ENDPOINT);
        if (!response.ok) throw new Error('API 응답 실패');
        
        // API 응답은 [{ name: "...", mac: "...", ... }, ...] 형태의 배열
        const devices = await response.json();

        if (devices.length === 0) {
            listContainer.innerHTML = '<p>등록된 장치가 없습니다.</p>';
            return;
        }

        // 장치 목록으로 테이블 HTML 생성
        let tableHTML = '<table>';
        tableHTML += '<tr><th>장치 이름</th><th>MAC 주소</th></tr>';
        
        devices.forEach(device => {
            tableHTML += `
                <tr>
                    <td>${device.name}</td>
                    <td>${device.mac}</td>
                </tr>
            `;
        });
        
        tableHTML += '</table>';
        listContainer.innerHTML = tableHTML;

    } catch (error) {
        console.error('장치 목록을 가져오는 데 실패했습니다:', error);
        listContainer.innerHTML = '<p style="color: #FF5555;">목록을 불러오는 데 실패했습니다.</p>';
    }
}


// --- 5. 2주 차트를 그리는 함수 (이전과 동일) ---
async function showChart(deviceId) {
    chartModal.classList.add('show');
    if (deviceChart) deviceChart.destroy();
    
    const ctx = chartCanvas.getContext('2d');
    deviceChart = new Chart(ctx, { // 로딩 중 차트
        type: 'line',
        data: { datasets: [{ label: '데이터 로딩 중...', data: [] }] },
        options: createChartOptions('데이터 로딩 중...')
    });

    try {
        const response = await fetch(`${CHART_ENDPOINT}?device=${deviceId}`);
        if (!response.ok) throw new Error('차트 API 응답 오류');
        const chartData = await response.json(); 

        if (deviceChart) deviceChart.destroy();
        
        const deviceName = document.getElementById(`device-${deviceId}-name`).textContent;
        const label = `${deviceName} (2주간 비저항값)`;

        deviceChart = new Chart(ctx, { // 실제 차트
            type: 'line',
            data: {
                datasets: [{
                    label: label,
                    data: chartData,
                    borderColor: '#60A5FA',
                    backgroundColor: 'rgba(96, 165, 250, 0.2)',
                    fill: true,
                    tension: 0.1
                }]
            },
            options: createChartOptions(label)
        });

    } catch (error) {
        console.error('차트 데이터를 가져오는 데 실패했습니다:', error);
        if (deviceChart) deviceChart.destroy();
        deviceChart = new Chart(ctx, { // 에러 차트
            type: 'line',
            data: { datasets: [{ label: '데이터 로드 실패', data: [] }] },
            options: createChartOptions('데이터 로드 실패')
        });
    }
}

// --- 6. 차트 옵션 생성 함수 (이전과 동일) ---
function createChartOptions(title) {
    return {
        responsive: true,
        plugins: {
            title: { display: true, text: title, color: '#FFF', font: { size: 18 } },
            legend: { labels: { color: '#CCC' } }
        },
        scales: {
            x: {
                type: 'time',
                time: { unit: 'day', tooltipFormat: 'yyyy-MM-dd HH:mm', displayFormats: { day: 'MM-dd' } },
                ticks: { color: '#CCC' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            y: {
                title: { display: true, text: 'Mohm', color: '#CCC' },
                ticks: { color: '#CCC' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            }
        }
    };
}