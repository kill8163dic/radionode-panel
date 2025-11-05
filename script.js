// --- 전역 변수 설정 ---
// (API 엔드포인트는 이제 동적으로 생성됨)
const DEVICE_LIST_ENDPOINT = '/api/get-device-list';
let REFRESH_INTERVAL = 60000; // 1분
let refreshTimer = null; // 자동 새로고침 타이머 변수

// --- DOM 요소 ---
const statusBar = document.getElementById('status-bar');
const panelContainer = document.getElementById('panel-container');
const headerBtn = document.getElementById('show-device-list-btn');

// 차트 모달
let deviceChart = null;
const chartModal = document.getElementById('chart-modal');
const closeChartBtn = document.getElementById('close-chart-btn');
const chartCanvas = document.getElementById('device-chart');

// 대시보드 편집기 모달
const deviceListModal = document.getElementById('device-list-modal');
const closeListBtn = document.getElementById('close-list-btn');
const listContainer = document.getElementById('device-list-container');
const generateBtn = document.getElementById('generate-dashboard-btn');
const urlOutputArea = document.getElementById('url-output-area');
const generatedUrlInput = document.getElementById('generated-url');


// --- 1. 페이지 로드 시 실행 ---
document.addEventListener('DOMContentLoaded', () => {
    
    // 1-1. URL을 분석하여 표시할 장치 목록 확인
    const urlParams = new URLSearchParams(window.location.search);
    const devicesQuery = urlParams.get('devices'); // "MAC1,MAC2,..."

    if (devicesQuery) {
        // (A) ?devices=... 쿼리가 있으면: 대시보드 모드
        headerBtn.style.display = 'none'; // '만들기' 버튼 숨김
        statusBar.textContent = '장치 데이터 로딩 중...';
        loadDashboard(devicesQuery);
    } else {
        // (B) 쿼리가 없으면: 편집기 모드 (환영)
        panelContainer.innerHTML = '<h2>환영합니다. "대시보드 만들기" 버튼을 눌러 새 패널을 생성하세요.</h2>';
        statusBar.style.display = 'none'; // 상태바 숨김
    }

    // 1-2. 대시보드 편집기 버튼 이벤트
    headerBtn.addEventListener('click', showDashboardEditor);
    closeListBtn.addEventListener('click', () => deviceListModal.classList.remove('show'));
    generateBtn.addEventListener('click', generateDashboardUrl);
    
    // 1-3. 차트 모달 닫기
    closeChartBtn.addEventListener('click', () => {
        chartModal.classList.remove('show');
        if (deviceChart) deviceChart.destroy();
    });
});


// --- 2. (A) 대시보드 모드: URL 기반으로 패널 로드 ---
function loadDashboard(devicesQuery) {
    const endpoint = `/api/get-data?devices=${devicesQuery}`;

    // 기존 타이머가 있다면 중지 (중복 실행 방지)
    if (refreshTimer) clearInterval(refreshTimer);

    const fetchData = async () => {
        try {
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error(`HTTP 에러: ${response.status}`);
            
            const devicesData = await response.json(); // [{ name: ... }, { ... }]
            updateDashboard(devicesData); // 대시보드 화면 업데이트
            
            statusBar.textContent = 'OpenApi Server Communication Success';
            statusBar.className = 'status-bar success';

        } catch (error) {
            console.error('데이터를 가져오는 데 실패했습니다:', error);
            statusBar.textContent = '서버 통신 실패';
            statusBar.className = 'status-bar error';
        }
    };

    fetchData(); // 즉시 1회 실행
    refreshTimer = setInterval(fetchData, REFRESH_INTERVAL); // 1분마다 반복
}

// 2-1. (A) 받아온 데이터로 대시보드 화면을 그리는 함수
function updateDashboard(devicesData) {
    panelContainer.innerHTML = ''; // 패널 컨테이너 비우기

    if (devicesData.length === 0) {
        panelContainer.innerHTML = '<h2>데이터를 가져올 장치가 없거나, API 호출에 실패했습니다.</h2>';
        return;
    }

    devicesData.forEach(device => {
        // 각 장치에 대한 패널 HTML 생성
        const panelHTML = `
            <section class="device-panel">
                <h2>${device.name || '이름 없음'}</h2>
                <div class="data-value">${parseFloat(device.currentValue).toFixed(2)}</div>
                <div class="data-unit">Mohm</div>
                <footer class="panel-footer">
                    <span class="mac-address">MAC: ${device.mac || 'MAC 없음'}</span>
                    <button class="chart-btn" data-mac="${device.mac}" data-name="${device.name}">
                        2주 차트
                    </button>
                </footer>
            </section>
        `;
        panelContainer.innerHTML += panelHTML;
    });

    // (★중요★) 동적으로 생성된 '차트 버튼'들에 이벤트 리스너 추가
    document.querySelectorAll('.chart-btn').forEach(button => {
        button.addEventListener('click', () => {
            const mac = button.dataset.mac;
            const name = button.dataset.name;
            showChart(mac, name); // MAC 주소와 이름 전달
        });
    });
}


// --- 3. (B) 편집기 모드: 장치 목록(체크박스) 표시 ---
async function showDashboardEditor() {
    deviceListModal.classList.add('show');
    listContainer.innerHTML = '<p>목록을 불러오는 중...</p>';
    urlOutputArea.style.display = 'none'; // URL 출력창 숨김

    try {
        const response = await fetch(DEVICE_LIST_ENDPOINT);
        if (!response.ok) throw new Error('API 응답 실패');
        
        const devices = await response.json(); // [{ name: "...", mac: "..." }, ...]

        if (devices.length === 0) {
            listContainer.innerHTML = '<p>등록된 장치가 없습니다.</p>';
            return;
        }

        // 3-1. 장치 목록으로 체크박스 HTML 생성
        let checkboxHTML = '';
        devices.forEach(device => {
            checkboxHTML += `
                <label>
                    <input type="checkbox" value="${device.mac}">
                    ${device.name} (${device.mac})
                </label>
            `;
        });
        listContainer.innerHTML = checkboxHTML;

    } catch (error) {
        console.error('장치 목록을 가져오는 데 실패했습니다:', error);
        listContainer.innerHTML = '<p style="color: #FF5555;">목록을 불러오는 데 실패했습니다.</p>';
    }
}

// 3-2. (B) 'URL 생성' 버튼 클릭 시
function generateDashboardUrl() {
    // 1. 선택된 체크박스 찾기
    const checkedBoxes = listContainer.querySelectorAll('input[type="checkbox"]:checked');
    
    if (checkedBoxes.length === 0) {
        alert('하나 이상의 장치를 선택하세요.');
        return;
    }

    // 2. 선택된 장치의 MAC 주소(value)를 배열로 만듦
    const selectedMacs = Array.from(checkedBoxes).map(cb => cb.value);
    
    // 3. 콤마(,)로 연결
    const devicesQuery = selectedMacs.join(',');

    // 4. 현재 페이지의 기본 URL + 쿼리 스트링 조합
    const baseUrl = window.location.origin + window.location.pathname;
    const finalUrl = `${baseUrl}?devices=${devicesQuery}`;

    // 5. URL 출력창에 표시
    generatedUrlInput.value = finalUrl;
    urlOutputArea.style.display = 'block'; // 출력창 표시
}


// --- 4. 차트 팝업 (showChart) ---
async function showChart(mac, name) { // (★변경★) mac과 name을 받음
    chartModal.classList.add('show');
    if (deviceChart) deviceChart.destroy();
    
    const ctx = chartCanvas.getContext('2d');
    deviceChart = new Chart(ctx, { // 로딩 중 차트
        type: 'line',
        data: { datasets: [{ label: '데이터 로딩 중...', data: [] }] },
        options: createChartOptions('데이터 로딩 중...')
    });

    try {
        // (★변경★) /api/get-chart?mac=... 호출
        const response = await fetch(`/api/get-chart?mac=${mac}`); 
        if (!response.ok) throw new Error('차트 API 응답 오류');
        const chartData = await response.json(); 

        if (deviceChart) deviceChart.destroy();
        
        const label = `${name} (2주간 비저항값)`;

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

// --- 5. 차트 옵션 생성 (이전과 동일) ---
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