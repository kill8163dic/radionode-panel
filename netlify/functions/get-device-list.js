const fetch = require('node-fetch');

exports.handler = async (event, context) => {

    // 1. Netlify 비밀 변수 로드
    const { API_KEY, API_SECRET } = process.env;

    // 2. Radionode API 호출
    const API_URL = 'https://oa.tapaculo365.com/tp365/v1';
    try {
        const params = new URLSearchParams({
            api_key: API_KEY,
            api_secret: API_SECRET
        });

        // '계정의 장치 목록 조회' 엔드포인트
        const response = await fetch(`${API_URL}/device/get_list?${params.toString()}`);
        if (!response.ok) {
            throw new Error('API 응답 실패');
        }
        const data = await response.json();

        // 3. 성공! 장치 목록 (data.device_list)을 브라우저로 전송
        return {
            statusCode: 200,
            body: JSON.stringify(data.device_list) // API 응답의 'device_list' 배열을 그대로 전달
        };

    } catch (error) {
        console.error("장치 목록 API 호출 오류:", error);
        return { statusCode: 500, body: JSON.stringify({ error: '장치 목록 로드 실패' }) };
    }
};