// netlify/functions/get-chart.js

const fetch = require('node-fetch');

exports.handler = async (event, context) => {

    // 1. Netlify 비밀 변수 로드
    const { API_KEY, API_SECRET } = process.env;

    // 2. 어떤 장치의 차트를 요청했는지 MAC 주소로 확인
    // 예: /api/get-chart?mac=MAC123...
    const mac = event.queryStringParameters.mac;
    // (★가정★) 차트도 'ch1' 값을 기준으로 함
    const channel = "ch1"; 

    if (!mac) {
        return { statusCode: 400, body: 'mac 파라미터가 필요합니다.' };
    }

    // 3. 2주 기간 계산
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 14);

    const format = (d) => d.toISOString().replace(/[-:T.]/g, '').substring(0, 14);
    const sdate = format(startDate);
    const edate = format(endDate);

    // 4. Radionode API 호출
    const API_URL = 'https://oa.tapaculo365.com/tp365/v1';
    try {
        const params = new URLSearchParams({
            api_key: API_KEY,
            api_secret: API_SECRET,
            MAC: mac,
            ch: channel,
            sdate: sdate,
            edate: edate
        });

        const response = await fetch(`${API_URL}/channel/get_data_list?${params.toString()}`);
        if (!response.ok) throw new Error('API 응답 실패');
        
        const data = await response.json();

        // 5. 차트(Chart.js) 형식으로 가공
        const chartData = data.data_list.map(item => ({
            x: `${item.date.substring(0, 4)}-${item.date.substring(4, 6)}-${item.date.substring(6, 8)}T${item.date.substring(8, 10)}:${item.date.substring(10, 12)}:${item.date.substring(12, 14)}`,
            y: parseFloat(item.val)
        }));

        return {
            statusCode: 200,
            body: JSON.stringify(chartData)
        };

    } catch (error) {
        console.error("차트 데이터 API 호출 오류:", error);
        return { statusCode: 500, body: JSON.stringify({ error: '차트 데이터 로드 실패' }) };
    }
};