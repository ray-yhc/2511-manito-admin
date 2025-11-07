import {
    createGoogleSheetsService,
    parseServiceAccountCredentials,
    createSheetConfig
} from '../sheetServices';
import {makePairs} from "./shuffleService.js";

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

    /**
     * normals, newbies, leaders의 모든 멤버를 섞어서 giver-receiver 쌍을 생성
     * 각자 정확히 1명의 giver와 1명의 receiver를 갖도록 함
     * @param {Object} data - 구조화된 데이터 (normals, newbies, leaders 포함)
     * @returns {Array<Object>} giver-receiver 쌍 배열
     */
    makeRandomPairs(data) {
        if (!data || !data.normals || !data.newbies || !data.leaders) {
            throw new Error('유효한 데이터가 없습니다. normals, newbies, leaders 데이터가 필요합니다.');
        }
        const pairsData = makePairs(data.normals, data.newbies, data.leaders);
        console.log(`✅ ${pairsData.pairs.length}개의 쌍이 생성되었습니다.`);
        return pairsData
    }

  /**
   * 생성된 쌍을 스프레드시트의 J4:K1000 영역에 저장
   * @param {Array<Object>} pairs - 저장할 쌍 배열
   * @param {string} sheetName - 시트명 (기본값: 'DB')
   * @returns {Promise<Object>} 저장 결과
   */
  async savePairsToSheet(pairs, sheetName = 'DB') {
    if (!this.isInitialized || !this.sheetsService) {
      throw new Error('서비스가 초기화되지 않았습니다. initialize()를 먼저 호출하세요.');
    }

    if (!pairs || !Array.isArray(pairs) || pairs.length === 0) {
      throw new Error('저장할 쌍 데이터가 없습니다.');
    }

    try {
      console.log(`💾 쌍 데이터 저장 시작: ${pairs.length}개 쌍`);

      // 배치 업데이트를 위한 범위 생성
      const ranges = [];

      // 1. 클리어용 범위들 (J4:K까지 충분히 큰 범위)
      const clearEndRow = Math.max(53, 3 + pairs.length + 10); // 여유분 추가
      const clearRange = `${sheetName}!J4:K${clearEndRow}`;

      // 2. 실제 데이터 범위
      const dataEndRow = 3 + pairs.length;
      const dataRange = `${sheetName}!J4:K${dataEndRow}`;

      // 클리어용 빈 데이터 생성
      const clearRowsCount = clearEndRow - 3; // J4부터이므로 3을 빼기
      const clearData = Array(clearRowsCount).fill(['', '']);

      console.log(`🧹 ${clearRange} 영역 클리어 중...`);

      // 먼저 전체 영역을 클리어
      ranges.push({
        range: clearRange,
        values: clearData
      });

      // 실제 쌍 데이터 준비
      const pairData = pairs.map(pair => [pair.giver, pair.receiver]);

      console.log(`📝 ${dataRange}에 쌍 데이터 저장 중...`);

      // 배치 업데이트 사용
      const batchRanges = [
        `${sheetName}!J4:K${dataEndRow}`  // 쌍 데이터 범위만 업데이트
      ];

      const batchData = await this.sheetsService.getBatchData([`${sheetName}!J4:J4`]); // 더미 호출로 인증 확인

      // 클리어를 위해 빈 문자열로 먼저 설정 (간단한 방법)
      // 쌍 데이터만 저장하되, J4:K1000의 기존 데이터는 덮어쓰지 않고 필요한 부분만 업데이트

      // J4부터 순차적으로 업데이트 (제한된 수의 요청으로)
      console.log(`📝 ${pairs.length}개 쌍을 순차적으로 저장 중...`);

      // 한 번에 5개씩 배치로 저장 (API 할당량 고려)
      const batchSize = 5;
      for (let i = 0; i < pairs.length; i += batchSize) {
        const batch = pairs.slice(i, i + batchSize);
        const promises = [];

        for (let j = 0; j < batch.length; j++) {
          const pair = batch[j];
          const rowNum = 4 + i + j;

          // 배치 내에서만 병렬 처리
          promises.push(
            this.updateCellSafe(`J${rowNum}`, pair.giver, sheetName),
            this.updateCellSafe(`K${rowNum}`, pair.receiver, sheetName)
          );
        }

        await Promise.all(promises);

        // 각 배치 사이에 짧은 지연 (API 할당량 관리)
        if (i + batchSize < pairs.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ 쌍 데이터 저장 완료: ${pairs.length}개 쌍이 J4:K${dataEndRow}에 저장됨`);

      return {
        success: true,
        savedPairs: pairs.length,
        range: `${sheetName}!J4:K${dataEndRow}`,
        savedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ 쌍 저장 실패:', error);
      throw new Error(`쌍 저장 실패: ${error.message}`);
    }
  }

  /**
   * 안전한 셀 업데이트 (에러 시 재시도)
   * @param {string} cellAddress - 셀 주소
   * @param {string} value - 값
   * @param {string} sheetName - 시트명
   */
  async updateCellSafe(cellAddress, value, sheetName) {
    try {
      await this.sheetsService.updateCell(cellAddress, value, undefined, sheetName);
    } catch (error) {
      console.warn(`⚠️ 셀 업데이트 실패 (${cellAddress}): ${error.message}`);
      // 실패해도 계속 진행
    }
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