import {
    createGoogleSheetsService,
    parseServiceAccountCredentials,
    createSheetConfig
} from '../sheetServices';

/**
 * Sheet 데이터 처리를 담당하는 서비스 클래스
 */
export class SheetDataService {
    constructor() {
        this.sheetsService = null;
        this.isInitialized = false;
    }

    /**
     * 서비스 초기화
     * @param {string} spreadsheetId - 스프레드시트 ID
     * @param {string} sheetName - 시트명
     * @param {string} envVar - 환경변수명 (기본값: 'VITE_SERVICE_ACCOUNT_CREDENTIALS')
     * @returns {Promise<boolean>} 초기화 성공 여부
     */
    async initialize(spreadsheetId, sheetName = 'Sheet1', envVar = 'VITE_SERVICE_ACCOUNT_CREDENTIALS') {
        try {
            const credentials = parseServiceAccountCredentials(envVar);
            const config = createSheetConfig({
                spreadsheetId,
                sheetName,
                range: 'A1:Z1000'
            });

            this.sheetsService = createGoogleSheetsService(config, credentials);
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('SheetDataService 초기화 실패:', error);
            throw new Error(`서비스 초기화 실패: ${error.message}`);
        }
    }

    /**
     * 초기화 상태 확인
     * @returns {boolean} 초기화 여부
     */
    getInitializationStatus() {
        return this.isInitialized;
    }

    /**
     * 기본 범위 설정으로 데이터를 가져와서 구조화된 객체로 반환
     * @param {string} sheetName - 시트명 (선택사항, 기본값: 'DB')
     * @returns {Promise<Object>} 구조화된 데이터 객체
     */
    async fetchDefaultData(sheetName = 'DB') {
        const defaultRangeConfig = {
            normals: 'A4:A',
            newbies: 'B4:B',
            leaders: 'C4:C',
            filterPairs: 'G4:H40'
        };

        return this.fetchStructuredData(defaultRangeConfig, sheetName);
    }

    /**
     * 지정된 범위들에서 데이터를 가져와서 구조화된 객체로 반환
     * @param {Object} rangeConfig - 범위 설정 객체
     * @param {string} rangeConfig.normals - normals 데이터 범위 (예: 'A4:A')
     * @param {string} rangeConfig.newbies - newbies 데이터 범위 (예: 'B4:B')
     * @param {string} rangeConfig.leaders - leaders 데이터 범위 (예: 'C4:C')
     * @param {string} rangeConfig.filterPairs - filterPairs 데이터 범위 (예: 'G4:H40')
     * @param {string} sheetName - 시트명 (선택사항)
     * @returns {Promise<Object>} 구조화된 데이터 객체
     */
    async fetchStructuredData(rangeConfig, sheetName = 'DB') {
        if (!this.isInitialized || !this.sheetsService) {
            throw new Error('서비스가 초기화되지 않았습니다. initialize()를 먼저 호출하세요.');
        }

        try {
            // 모든 범위를 시트명과 함께 구성
            const ranges = [
                `${sheetName}!${rangeConfig.normals}`,
                `${sheetName}!${rangeConfig.newbies}`,
                `${sheetName}!${rangeConfig.leaders}`,
                `${sheetName}!${rangeConfig.filterPairs}`
            ];

            console.log('📊 배치 데이터 조회 시작:', ranges);

            // 배치로 모든 범위 가져오기
            const batchData = await this.sheetsService.getBatchData(ranges);

            // 데이터 가공 및 구조화
            const structuredData = this.processRawData(batchData, ranges, rangeConfig);

            console.log('✅ 데이터 가공 완료');
            return structuredData;

        } catch (error) {
            console.error('❌ 구조화된 데이터 조회 실패:', error);
            throw new Error(`데이터 조회 실패: ${error.message}`);
        }
    }

    /**
     * 서비스 초기화와 데이터 가져오기를 한 번에 수행
     * @param {string} spreadsheetId - 스프레드시트 ID
     * @param {string} sheetName - 시트명 (기본값: 'DB')
     * @param {string} envVar - 환경변수명 (기본값: 'VITE_SERVICE_ACCOUNT_CREDENTIALS')
     * @returns {Promise<Object>} 초기화 결과와 데이터
     */
    async initializeAndFetch(spreadsheetId, sheetName = 'DB', envVar = 'VITE_SERVICE_ACCOUNT_CREDENTIALS') {
        try {
            // 서비스 초기화
            await this.initialize(spreadsheetId, sheetName, envVar);

            // 데이터 가져오기
            const data = await this.fetchDefaultData(sheetName);

            return {
                success: true,
                data,
                message: '초기화 및 데이터 로드 완료'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '초기화 또는 데이터 로드 실패'
            };
        }
    }

    /**
     * 원시 배치 데이터를 구조화된 객체로 가공
     * @param {Object} batchData - getBatchData에서 반환된 원시 데이터
     * @param {Array<string>} ranges - 요청한 범위 배열
     * @param {Object} rangeConfig - 범위 설정 객체
     * @returns {Object} 구조화된 데이터
     */
    processRawData(batchData, ranges, rangeConfig) {
        // 각 범위별로 데이터 처리
        const normals = this.extractColumnData(batchData[ranges[0]]);
        const newbies = this.extractColumnData(batchData[ranges[1]]);
        const leaders = this.extractColumnData(batchData[ranges[2]]);
        const filterPairs = this.extractPairData(batchData[ranges[3]]);

        return {
            normals,
            newbies,
            leaders,
            filterPairs,
            metadata: {
                ranges: rangeConfig,
                fetchedAt: new Date().toISOString(),
                counts: {
                    normals: normals.length,
                    newbies: newbies.length,
                    leaders: leaders.length,
                    filterPairs: filterPairs.length
                }
            }
        };
    }

    /**
     * 단일 컬럼 데이터를 추출하여 필터링
     * @param {Array<Array<string>>} rawData - 2차원 배열 형태의 원시 데이터
     * @returns {Array<string>} 필터링된 1차원 배열
     */
    extractColumnData(rawData) {
        if (!rawData || !Array.isArray(rawData)) {
            return [];
        }

        return rawData
            .flat() // 2차원 배열을 1차원으로 평탄화
            .filter(item => item && typeof item === 'string' && item.trim()) // 빈 값 및 공백 제거
            .map(item => item.trim()); // 앞뒤 공백 제거
    }

    /**
     * 페어 데이터(2컬럼)를 추출하여 필터링
     * @param {Array<Array<string>>} rawData - 2차원 배열 형태의 원시 데이터
     * @returns {Array<Array<string>>} 필터링된 페어 배열
     */
    extractPairData(rawData) {
        if (!rawData || !Array.isArray(rawData)) {
            return [];
        }

        return rawData
            .filter(row =>
                Array.isArray(row) &&
                row.length >= 2 &&
                row[0] && row[1] &&
                typeof row[0] === 'string' &&
                typeof row[1] === 'string' &&
                row[0].trim() && row[1].trim()
            ) // 유효한 페어만 필터링
            .map(row => [row[0].trim(), row[1].trim()]); // 각 값의 앞뒤 공백 제거
    }

    /**
     * 데이터 통계 정보 계산
     * @param {Object} structuredData - 구조화된 데이터
     * @returns {Object} 통계 정보
     */
    getDataStatistics(structuredData) {
        if (!structuredData) {
            return null;
        }

        const totalItems = structuredData.normals.length +
            structuredData.newbies.length +
            structuredData.leaders.length;

        return {
            totalItems,
            totalPairs: structuredData.filterPairs.length,
            breakdown: {
                normals: structuredData.normals.length,
                newbies: structuredData.newbies.length,
                leaders: structuredData.leaders.length,
                filterPairs: structuredData.filterPairs.length
            },
            lastUpdated: structuredData.metadata?.fetchedAt
        };
    }

    /**
     * 특정 타입의 데이터에서 검색
     * @param {Object} structuredData - 구조화된 데이터
     * @param {string} searchTerm - 검색어
     * @param {Array<string>} searchTypes - 검색할 타입들 (기본값: ['normals', 'newbies', 'leaders'])
     * @returns {Object} 검색 결과
     */
    searchInData(structuredData, searchTerm, searchTypes = ['normals', 'newbies', 'leaders']) {
        if (!structuredData || !searchTerm) {
            return {results: [], totalFound: 0};
        }

        const results = [];
        const term = searchTerm.toLowerCase().trim();

        searchTypes.forEach(type => {
            if (structuredData[type] && Array.isArray(structuredData[type])) {
                const matches = structuredData[type]
                    .map((item, index) => ({item, index, type}))
                    .filter(({item}) =>
                        typeof item === 'string' &&
                        item.toLowerCase().includes(term)
                    );

                results.push(...matches);
            }
        });

        // filterPairs에서도 검색 (searchTypes에 포함된 경우)
        if (searchTypes.includes('filterPairs') && structuredData.filterPairs) {
            const pairMatches = structuredData.filterPairs
                .map((pair, index) => ({item: pair, index, type: 'filterPairs'}))
                .filter(({item}) =>
                    item[0].toLowerCase().includes(term) ||
                    item[1].toLowerCase().includes(term)
                );

            results.push(...pairMatches);
        }

        return {
            results,
            totalFound: results.length,
            searchTerm: searchTerm
        };
    }

    /**
     * 서비스 정리 (메모리 정리용)
     */
    cleanup() {
        this.sheetsService = null;
        this.isInitialized = false;
    }

  makeRandomPairs(data) {

  }
}

/**
 * 싱글톤 인스턴스 생성
 */
let sheetDataServiceInstance = null;

/**
 * SheetDataService 싱글톤 인스턴스를 반환하는 팩토리 함수
 * @returns {SheetDataService} 서비스 인스턴스
 */
export function getSheetDataService() {
    if (!sheetDataServiceInstance) {
        sheetDataServiceInstance = new SheetDataService();
    }
    return sheetDataServiceInstance;
}

/**
 * 새로운 SheetDataService 인스턴스를 생성하는 팩토리 함수 (싱글톤이 아닌 경우)
 * @returns {SheetDataService} 새로운 서비스 인스턴스
 */
export function createSheetDataService() {
    return new SheetDataService();
}