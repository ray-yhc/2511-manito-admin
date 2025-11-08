function makePairs(normals, newbies, leaders, filterPairs = []) {
    console.log('🎯 2단계 규칙 기반 쌍 생성 시작');
    console.log(`📊 참가자: normal ${normals.length}명, newbie ${newbies.length}명, leader ${leaders.length}명`);
    console.log(`🚫 금지된 쌍: ${filterPairs.length}개`);

    // 전체 참가자 수 검증
    const totalCount = normals.length + newbies.length + leaders.length;

    if (totalCount === 0) {
        return {pairs: [], metadata: {error: '참가자가 없습니다.'}};
    }

    if (totalCount === 1) {
        throw new Error('참가자가 1명뿐이어서 쌍을 만들 수 없습니다.');
    }

    // filterPairs를 전역 변수로 설정 (isValidPair에서 사용)
    const forbiddenPairs = new Set();
    filterPairs.forEach(([a, b]) => {
        if (a && b) {
            forbiddenPairs.add(`${a}-${b}`);
            forbiddenPairs.add(`${b}-${a}`);
        }
    });

    const newbieParticipantsData = makeNewbieParticipants(newbies, leaders);
    const newbieAndLeaders = newbieParticipantsData.newbieAndLeaders;

    const normalParticipants = [
        ...normals.map(name => ({name, type: 'normal'})),
        ...newbieParticipantsData.remainLeaders.map(name => ({name, type: 'leader'}))
    ];

    const pairs = [];

    // 1. newbie와 leader끼리 짝 매칭
    if (newbieAndLeaders.length > 0) {
        console.log(`📋 1단계: newbie + leader ${newbieAndLeaders.length}명 매칭`);
        const newbieLeaderPairs = shuffleAndPair(newbieAndLeaders, forbiddenPairs);
        pairs.push(...newbieLeaderPairs);
    }

    // 2. normal끼리 짝 매칭
    if (normalParticipants.length > 0) {
        console.log(`📋 2단계: normal ${normalParticipants.length}명 매칭`);
        const normalPairs = shuffleAndPair(normalParticipants, forbiddenPairs);
        pairs.push(...normalPairs);
    }

    console.log(`✅ 총 ${pairs.length}개의 유효한 쌍이 생성되었습니다`);

    // ID 재정렬
    const finalPairs = pairs.map((pair, index) => ({
        ...pair,
        id: index + 1
    }));

    validResult(finalPairs);

    return {
        pairs: finalPairs,
        metadata: {
            totalParticipants: totalCount,
            usedParticipants: totalCount,
            excludedParticipants: 0,
            excluded: [],
            forbiddenPairs: filterPairs.length,
            generatedAt: new Date().toISOString(),
            rules: [
                'newbie는 newbie 또는 leader와만 짝 가능',
                'leader끼리는 짝 불가',
                'normal은 누구와도 짝 가능',
                'filterPairs에 포함된 쌍은 금지'
            ]
        }
    };
}

function shuffleAndPair(participants, forbiddenPairs) {
    if (participants.length === 0) {
        return [];
    }

    if (participants.length === 1) {
        throw new Error(`그룹에 참가자가 1명뿐입니다 (${participants.length}명). 짝을 만들 수 없습니다.`);
    }

    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Fisher-Yates 셔플
        const shuffled = [...participants];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // 원형 연결로 쌍 생성 시도
        const pairs = [];
        let success = true;

        for (let i = 0; i < shuffled.length; i++) {
            const giver = shuffled[i];
            const receiverIndex = (i + 1) % shuffled.length;
            const receiver = shuffled[receiverIndex];

            if (!isValidPair(giver, receiver, forbiddenPairs)) {
                success = false;
                break;
            }

            pairs.push({
                giver: giver.name,
                giverType: giver.type,
                receiver: receiver.name,
                receiverType: receiver.type,
                createdAt: new Date().toISOString()
            });
        }

        if (success) {
            console.log(`   ✅ ${attempt + 1}번째 시도에서 성공 (${pairs.length}개 쌍)`);
            return pairs;
        }
    }

    throw new Error(`그룹 내 유효한 쌍을 생성할 수 없습니다 (${participants.length}명). 참가자 구성을 확인해주세요.`);
}

function makeNewbieParticipants(newbies, leaders) {
    if (newbies.length === 0) {
        return [];
    }

    const newbieAndLeaders = [
        ...newbies.map(name => ({name, type: 'newbie'})),
        // ...leaders.map(name => ({name, type: 'leader'}))
    ];

    // 1. leader가 newbie 수보다 적은 경우: 모든 leader 포함
    if (leaders.length <= newbies.length) {
        newbieAndLeaders.push(...leaders.map(name => ({name, type: 'leader'})));
        return {
            "newbieAndLeaders": newbieAndLeaders,
            "remainLeaders": []
        };
    }
    // 2. leader가 newbie 수보다 많은 경우: 일부 leader만 포함. 랜덤추출
    const shuffledLeaders = [...leaders];
    for (let i = shuffledLeaders.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledLeaders[i], shuffledLeaders[j]] = [shuffledLeaders[j], shuffledLeaders[i]];
    }

    const selectedLeaders = shuffledLeaders.slice(0, newbies.length);
    newbieAndLeaders.push(...selectedLeaders.map(name => ({name, type: 'leader'})));
    const remainLeaders = shuffledLeaders.slice(newbies.length);

    return {
        "newbieAndLeaders": newbieAndLeaders,
        "remainLeaders": remainLeaders
    };
}


// 유효한 쌍인지 검증하는 함수
function isValidPair(giver, receiver, forbiddenPairs) {
    // 본인끼리는 불가
    if (giver.name === receiver.name) return false;

    // filterPairs에 금지된 쌍인지 확인
    if (forbiddenPairs && forbiddenPairs.has(`${giver.name}-${receiver.name}`)) return false;

    // 규칙 1: newbie가 giver 또는 receiver일 경우, 상대방은 newbie 또는 leader
    if (giver.type === 'newbie' && receiver.type === 'normal') return false;
    if (receiver.type === 'newbie' && giver.type === 'normal') return false;

    // 규칙 2: newbie끼리는 불가
    if (giver.type === 'newbie' && receiver.type === 'newbie') return false;

    // 규칙 3: normal은 누구와도 가능 (위 조건들을 통과했으면)
    return true;
}

function validResult(finalPairs) {
    // 서로 쌍이면 안됨 (A->B, B->A)
    const pairSet = new Set();
    for (const pair of finalPairs) {
        const forwardKey = `${pair.giver}-${pair.receiver}`;
        const reverseKey = `${pair.receiver}-${pair.giver}`;
        if (pairSet.has(reverseKey)) {
            throw new Error(`유효성 검사 실패: 서로 쌍이 되는 경우가 있습니다 (${pair.giver} <-> ${pair.receiver})`);
        }
    }
}

export {
    makePairs,
};
