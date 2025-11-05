// netlify/functions/get-device-list.js

// (★주의★) 
// 이 파일은 get-data.js와 동일한 ALL_DEVICE_SETTINGS 목록을 가져야 합니다.
// 두 파일의 목록이 다르면 혼란이 생깁니다.
// (나중에 이 코드를 하나로 합치는 리팩토링이 필요합니다.)

const ALL_DEVICE_SETTINGS = {
    "1": { // id: 1
        name: "울산대학교병원 1호기",
        mac: "608A108370B0",
        channel: "ch1"
    },
    "2": { // id: 2
        name: "울산대학교병원 2호기",
        mac: "608A108370B0",
        channel: "ch1"
    },
    "3": { // id: 3 (예시 장치)
        name: "DIC Water 3호기",
        mac: "ABC123456789",
        channel: "ch1"
    }
};

exports.handler = async (event, context) => {
    
    // 1. 설정 목록을 브라우저가 원하는 형태로 가공
    // { "1": { name: ... } } -> [{ id: "1", name: "...", mac: "..." }]
    const deviceList = Object.keys(ALL_DEVICE_SETTINGS).map(id => {
        const device = ALL_DEVICE_SETTINGS[id];
        return {
            id: id,
            name: device.name,
            mac: device.mac
        };
    });

    // 2. 가공된 목록을 브라우저(script.js)로 전송
    return {
        statusCode: 200,
        body: JSON.stringify(deviceList)
    };
};