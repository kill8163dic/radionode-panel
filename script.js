// --- 전역 변수 설정 ---
let CURRENT_DEVICE_ID = "1"; // 기본값
let API_ENDPOINT = '/api/get-data';
let CHART_ENDPOINT = '/api/get-chart';
const DEVICE_LIST_ENDPOINT = '/api/get-device-list';
const REFRESH_INTERVAL = 60000; // 1분

// --- DOM 요소 ---
const statusBar = document.getElementById('status-bar');
const mainPanel = {
    name: document.getElementById('device-name'),
    value: document.getElementById('device-value'),
    mac: document.getElementById('device-mac')
};
const mainChartBtn = document.getElementById('main-chart-btn');

// 차트 모달
let deviceChart = null;
const chartModal = document.getElementById('chart-modal');
const closeChartBtn = document.getElementById('close-chart-btn');
const chartCanvas = document.getElementById('device-chart');

// 장치 목록 모달
const deviceListModal = document.getElementById('device-list-modal');
const showDeviceListBtn = document.getElementById('show-device-list-btn');
const closeListBtn = document.getElementById('close-list-btn');
const listContainer = document.getElementById('device-list-container');


// --- 1. 페이지 로드 시 이벤트 리스너 설정 ---
document.addEventListener('DOMContentLoaded', () => {
    
    // (★신규★) 1-1. URL을 분석하여 현재 장치 ID 결정
    const urlParams = new URLSearchParams(window.location.search);
    CURRENT_DEVICE_ID = urlParams.get('device') || "1"; // URL에 ?device=N이 없으면 "1"
    
    // 1-2. 결정된 장치 ID로 API 엔드포인트 설정
    API_ENDPOINT = `/api/get-data?device=${CURRENT_DEVICE_ID}`;
    CHART_ENDPOINT = `/api/get-chart?device=${CURRENT_DEVICE_ID}`;

    // 1-3. 메인 데이터 로드 (1분마다)
    fetchData();
    setInterval(fetchData, REFRESH_INTERVAL);

    // 1-4. 2주 차트 버튼 클릭 이벤트
    mainChartBtn.addEventListener('click', () => showChart(CURRENT_DEVICE_ID));
    
    // 차트 모달 닫기
    closeChartBtn.addEventListener('click', () => {
        chartModal.classList.remove('show');
        if (deviceChart) deviceChart.destroy();
    });

    // 1-5. 전체 장치 목록 버튼 클릭 이벤트
    showDeviceListBtn.addEventListener('click', showDeviceList);
    
    // 목록 모달 닫기
    closeListBtn.addEventListener('click', () => {
        deviceListModal.classList.remove('show');
    });
});


// --- 2. 최신 데이터를 가져오는 함수 (★수정됨★) ---
async function fetchData() {
    try {
        // API_ENDPOINT에 이미 device ID가 포함되어 있음
        const response = await fetch(API_ENDPOINT); 
        if (!response.ok) throw new Error(`HTTP 에러: ${response.status}`);
        
        // 이제 API는 { id: "1", deviceName: "...", ... } 형태의 단일 객체를 반환
        const data = await response.json();

        statusBar.textContent = 'OpenApi Server Communication Success';
        statusBar.className = 'status-bar success';

        // 메인 패널 업데이트
        updatePanel(data);

    } catch (error) {
        console.error('데이터를 가져오는 데 실패했습니다:', error);
        statusBar.textContent = '서버 통신 실패';
        statusBar.className = 'status-bar error';
    }
}

// --- 3. 화면을 업데이트하는 함수 (★수정됨★) ---
function updatePanel(deviceData) {
    if (!deviceData) return;
    mainPanel.name.textContent = deviceData.deviceName || '이름 없음';
    mainPanel.value.textContent = parseFloat(deviceData.currentValue).toFixed(2);
    mainPanel.mac.textContent = `MAC: ${deviceData.macAddress || 'MAC 없음'}`;
}


// --- 4. (★최종 수정★) 전체 장치 목록을 가져와 팝업에 표시하는 함수 ---
async function showDeviceList() {
    deviceListModal.classList.add('show');
    listContainer.innerHTML = '<p>목록을 불러오는 중...</p>';

    try {
        // 이제 /api/get-device-list는 { id, name, mac } 배열을 반환
        const response = await fetch(DEVICE_LIST_ENDPOINT); 
        if (!response.ok) throw new Error('API 응답 실패');
        
        const devices = await response.json(); // [{ id: "1", name: "...", mac: "..." }, ...]

        if (devices.length === 0) {
            listContainer.innerHTML = '<p>등록된 장치가 없습니다.</p>';
            return;
        }

        // 4-1. 장치 목록으로 테이블 HTML 생성
        let tableHTML = '<table>';
        tableHTML += '<tr><th>장치 이름</th><th>MAC 주소</th><th>패널 보기</th></tr>';
        
        devices.forEach(device => {
            tableHTML += `
                <tr>
                    <td>${device.name}</td>
                    <td>${device.mac}</td>
                    <td><a href="?device=${device.id}" class="panel-link">이 장치 보기</a></td>
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


// --- 5. 2주 차트를 그리는 함수 (★수정됨★) ---
async function showChart(deviceId) { // deviceId를 받도록 함
    chartModal.classList.add('show');
    if (deviceChart) deviceChart.destroy();
    
    const ctx = chartCanvas.getContext('2d');
    deviceChart = new Chart(ctx, { // 로딩 중 차트
        type: 'line',
        data: { datasets: [{ label: '데이터 로딩 중...', data: [] }] },
        options: createChartOptions('데이터 로딩 중...')
    });

    try {
        // CHART_ENDPOINT에 이미 device ID가 포함되어 있음
        const response = await fetch(CHART_ENDPOINT); 
        if (!response.ok) throw new Error('차트 API 응답 오류');
        const chartData = await response.json(); 

        if (deviceChart) deviceChart.destroy();
        
        const deviceName = mainPanel.name.textContent; // 메인 패널의 이름 사용
        const label = `${deviceName} (2주간 비저항값)`;

        deviceChart = new Chart(ctx, { // 실제 차트
            type: 'line',
            data: { datasets: [{ label: label, data: chartData, /* ... (이전과 동일) ... */ }] },
            options: createChartOptions(label)
        });

    } catch (error) {
        console.error('차트 데이터를 가져오는 데 실패했습니다:', error);
        // ... (에러 차트 표시 - 이전과 동일) ...
    }
}

// --- 6. 차트 옵션 생성 함수 (이전과 동일) ---
function createChartOptions(title) {
    // ... (이전과 동일) ...
}