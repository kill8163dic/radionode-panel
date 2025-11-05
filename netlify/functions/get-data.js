// netlify/functions/get-data.js

const fetch = require('node-fetch');

// Radionode API의 기본 주소
const API_URL = 'https://oa.tapaculo365.com/tp365/v1';

// 단일 장치의 정보를 가져오는 헬퍼 함수
async function getDeviceInfo(mac, apiKey, apiSecret) {
    try {
        const params = new URLSearchParams({
            api_key: apiKey,
            api_secret: apiSecret,
            MAC: mac
        });
        
        const response = await fetch(`${API_URL}/device/get_info?${params.toString()}`);
        if (!response.ok) return null; // 실패 시 null 반환
        
        const data = await response.json();

        // (★가정★) 'ch1' (첫 번째 채널)의 값을 비저항값으로 사용
        const sensorData = data.channels.find(c => c.ch === 'ch1');
        const currentValue = sensorData ? sensorData.val : 'N/A';

        return {
            name: data.name,
            mac: data.mac,
            currentValue: currentValue
        };
        
    } catch (error) {
        console.error(`Error fetching data for ${mac}:`, error);
        return null; // 에러 시 null 반환
    }
}

// Netlify 함수 핸들러
exports.handler = async (event, context) => {

    // 1. Netlify 비밀 변수 로드
    const { API_KEY, API_SECRET } = process.env;

    // 2. 요청된 장치 MAC 목록 확인
    // 예: /api/get-data?devices=MAC1,MAC2,MAC3
    const devicesQuery = event.queryStringParameters.devices;

    if (!devicesQuery) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ error: 'devices 파라미터가 필요합니다.' }) 
        };
    }

    const macAddresses = devicesQuery.split(','); // "MAC1,MAC2" -> ["MAC1", "MAC2"]

    try {
        // 3. 모든 장치의 정보를 '병렬'로 요청
        const requests = macAddresses.map(mac => 
            getDeviceInfo(mac, API_KEY, API_SECRET)
        );
        
        const results = await Promise.all(requests);

        // 4. null(실패한 요청)을 걸러내고, 성공한 데이터만 배열로 반환
        const responseData = results.filter(data => data !== null);

        return {
            statusCode: 200,
            body: JSON.stringify(responseData) // [{ name: ... }, { name: ... }]
        };

    } catch (error) {
        console.error("API 병렬 호출 오류:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: '서버 내부 오류 발생' })
        };
    }
};