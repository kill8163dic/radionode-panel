// node-fetch 부품 가져오기
const fetch = require('node-fetch');

// Netlify 함수 핸들러
exports.handler = async (event, context) => {

    // 1. Netlify에 비밀로 저장된 환경 변수를 가져옵니다. (다음 단계에서 설정)
    const { API_KEY, API_SECRET } = process.env;

    // 2. (사용자 설정) 모니터링할 장치들의 정보를 여기에 입력합니다.
    const devicesToFetch = [
        {
            id: "1", // script.js와 맞춤
            name: "울산대학교병원 1호기",
            mac: "608A108370B0", // (필수 수정) 1호기의 실제 MAC 주소
            channel: "ch1" // (필수 수정) 1호기의 비저항값 채널 (예: "ch1")
        },
        {
            id: "2",
            name: "울산대학교병원 2호기",
            mac: "608A108370B0", // (필수 수정) 2호기의 실제 MAC 주소
            channel: "ch1" // (필수 수정) 2호기의 비저항값 채널 (예: "ch1")
        }
    ];

    // Radionode API의 기본 주소
    const API_URL = 'https://oa.tapaculo365.com/tp365/v1';

    try {
        // 3. 각 장비의 데이터를 가져오기 위해 '병렬'로 API를 호출합니다.
        const requests = devicesToFetch.map(device => {
            // API 문서에 따른 인증 파라미터
            const params = new URLSearchParams({
                api_key: API_KEY,
                api_secret: API_SECRET,
                MAC: device.mac
            });
            
            // API의 '장치 정보/채널 목록 조회' 엔드포인트 호출
            return fetch(`${API_URL}/device/get_info?${params.toString()}`)
                .then(res => res.json())
                .then(data => {
                    // 4. API 응답에서 필요한 데이터 추출
                    
                    // API가 'channels' 배열로 값을 준다고 가정
                    const sensorData = data.channels.find(c => c.ch === device.channel);
                    const currentValue = sensorData ? sensorData.val : 'N/A'; // 비저항값

                    return {
                        id: device.id,
                        data: {
                            deviceName: device.name, // 우리가 설정한 이름
                            currentValue: currentValue,
                            macAddress: device.mac
                        }
                    };
                });
        });

        // 5. 모든 API 호출이 완료될 때까지 기다립니다.
        const results = await Promise.all(requests);

        // 6. script.js가 원하는 { "1": { ... }, "2": { ... } } 형태로 가공
        const responseData = {};
        results.forEach(result => {
            responseData[result.id] = result.data;
        });

        // 7. 성공! 가공된 데이터를 브라우저(script.js)로 전송
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