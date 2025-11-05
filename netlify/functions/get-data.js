// netlify/functions/get-data.js

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // 1. Netlify 비밀 변수 로드
    const { API_KEY, API_SECRET } = process.env;

    // 2. (★중요★) 계정에 등록된 모든 장치 정보를 여기에 입력합니다.
    // 이 목록이 사용자가 선택할 수 있는 전체 장치 목록이 됩니다.
    // 'id'는 URL에서 사용할 고유 식별자입니다 (예: 1, 2, "main_fab" 등)
    const ALL_DEVICE_SETTINGS = {
        "1": { // id: 1
            name: "울산대학교병원 1호기",
            mac: "608A108370B0", // (필수 수정) 1호기 MAC
            channel: "ch1" // (필수 수정) 1호기 채널
        },
        "2": { // id: 2
            name: "울산대학교병원 2호기",
            mac: "608A108370B0", // (필수 수정) 2호기 MAC
            channel: "ch1" // (필수 수정) 2호기 채널
        },
        "3": { // id: 3 (예시 장치)
            name: "DIC Water 3호기",
            mac: "ABC123456789", // (필수 수정) 3호기 MAC
            channel: "ch1" // (필수 수정) 3호기 채널
        }
        // 필요한 만큼 장치를 계속 추가...
    };

    // 3. 사용자가 요청한 장치 ID 확인
    // 예: /api/get-data?device=2 -> deviceId = "2"
    // 만약 ?device=... 가 없으면 기본값 "1"을 사용
    const deviceId = event.queryStringParameters.device || "1";
    
    // 4. 요청된 ID에 해당하는 장치 정보 찾기
    const device = ALL_DEVICE_SETTINGS[deviceId];

    if (!device) {
        return { 
            statusCode: 404, 
            body: JSON.stringify({ error: '요청한 장치 ID를 찾을 수 없습니다.' }) 
        };
    }

    // 5. Radionode API 호출
    const API_URL = 'https://oa.tapaculo365.com/tp365/v1';
    try {
        const params = new URLSearchParams({
            api_key: API_KEY,
            api_secret: API_SECRET,
            MAC: device.mac
        });
        
        const response = await fetch(`${API_URL}/device/get_info?${params.toString()}`);
        if (!response.ok) throw new Error('API 응답 실패');
        
        const data = await response.json();
        
        // 6. 필요한 데이터 추출
        const sensorData = data.channels.find(c => c.ch === device.channel);
        const currentValue = sensorData ? sensorData.val : 'N/A';

        // 7. 가공된 최종 데이터 전송
        const responseData = {
            id: deviceId,
            deviceName: device.name,
            currentValue: currentValue,
            macAddress: device.mac
        };

        return {
            statusCode: 200,
            body: JSON.stringify(responseData)
        };

    } catch (error) {
        console.error("Radionode API 호출 오류:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: '서버 내부 오류 발생' })
        };
    }
};