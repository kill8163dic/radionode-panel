const fetch = require('node-fetch');

exports.handler = async (event, context) => {

    // 1. Netlify 비밀 변수 로드
    const { API_KEY, API_SECRET } = process.env;

    // 2. (사용자 설정) 모니터링할 장치 정보 (get-data.js와 동일하게)
    const deviceSettings = {
        "1": {
            mac: "608A108370B0", // (필수 수정) 1호기 MAC
            channel: "ch1" // (필수 수정) 1호기 채널
        },
        "2": {
            mac: "608A108370B0", // (필수 수정) 2호기 MAC
            channel: "ch1" // (필수 수정) 2호기 채널
        }
    };
    
    // 3. 어떤 장치의 차트를 요청했는지 확인
    const deviceId = event.queryStringParameters.device; // "1" 또는 "2"
    const device = deviceSettings[deviceId];

    if (!device) {
        return { statusCode: 404, body: 'Device not found' };
    }

    // 4. 2주 기간 계산 (14일 전 ~ 지금)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 14);

    // Radionode API가 요구하는 날짜 형식(YYYYMMDDHHmmSS)으로 변환
    const format = (d) => d.toISOString().replace(/[-:T.]/g, '').substring(0, 14);
    const sdate = format(startDate);
    const edate = format(endDate);

    // 5. Radionode API 호출
    const API_URL = 'https://oa.tapaculo365.com/tp365/v1';
    try {
        const params = new URLSearchParams({
            api_key: API_KEY,
            api_secret: API_SECRET,
            MAC: device.mac,
            ch: device.channel,
            sdate: sdate,
            edate: edate
        });

        // '채널 데이터 리스트 조회' 엔드포인트
        const response = await fetch(`${API_URL}/channel/get_data_list?${params.toString()}`);
        const data = await response.json();

        // 6. 차트(Chart.js)가 이해하는 형식으로 데이터 가공
        // API 응답이 { data_list: [ { date: "YYYY...SS", val: 18.1 }, ... ] } 형태라고 가정
        const chartData = data.data_list.map(item => ({
            // API의 날짜(YYYYMMDDHHMMSS)를 JavaScript가 읽을 수 있게 변환
            x: `${item.date.substring(0, 4)}-${item.date.substring(4, 6)}-${item.date.substring(6, 8)}T${item.date.substring(8, 10)}:${item.date.substring(10, 12)}:${item.date.substring(12, 14)}`,
            y: parseFloat(item.val)
        }));

        // 7. 성공! 차트 데이터를 브라우저(script.js)로 전송
        return {
            statusCode: 200,
            body: JSON.stringify(chartData)
        };

    } catch (error) {
        console.error("차트 데이터 API 호출 오류:", error);
        return { statusCode: 500, body: JSON.stringify({ error: '차트 데이터 로드 실패' }) };
    }
};