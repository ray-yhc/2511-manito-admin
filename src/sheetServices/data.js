// sheetServices/data.js

import { DEFAULT_REQUEST_OPTIONS } from './config.js';

/**
 * Google Sheets 데이터 조회를 담당하는 클래스
 * 인증된 상태에서 스프레드시트 데이터를 가져오고 처리
 */
export class GoogleSheetsData {
    constructor(authInstance, config) {
        if (!authInstance) {
            throw new Error('Authentication instance is required');
        }
        if (!config) {
            throw new Error('Configuration is required');
        }
        this.auth = authInstance;
        this.config = config;
    }

    /**
     * API 요청 헬퍼 메서드
     * @param {string} url - 요청 URL
     * @param {Object} options - fetch 옵션
     * @returns {Promise<Object>} API 응답 데이터
     */
    async makeApiRequest(url, options = {}) {
        try {
            // 토큰 유효성 확인 및 필요시 갱신
            await this.auth.ensureValidToken(this.credentials);

            const requestOptions = {
                headers: {
                    ...this.auth.getAuthHeaders(),
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            };

            const response = await fetch(url, requestOptions);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // 401 에러인 경우 인증 재시도
                if (response.status === 401) {
                    console.log('🔄 401 오류 - 인증 재시도');
                    this.auth.clearAuthentication();
                    await this.auth.authenticate(this.credentials);

                    // 재인증 후 재시도
                    const retryRequestOptions = {
                        ...requestOptions,
                        headers: {
                            ...this.auth.getAuthHeaders(),
                            'Content-Type': 'application/json',
                            ...options.headers
                        }
                    };

                    const retryResponse = await fetch(url, retryRequestOptions);

                    if (!retryResponse.ok) {
                        const retryErrorData = await retryResponse.json().catch(() => ({}));
                        throw new Error(`API 요청 재시도 실패: ${retryResponse.status} - ${retryErrorData.error?.message || retryResponse.statusText}`);
                    }

                    return await retryResponse.json();
                }

                throw new Error(`API 요청 실패: ${response.status} - ${errorData.error?.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API 요청 중 오류:', error);
            throw error;
        }
    }

    /**
     * 자격 증명 설정
     * @param {Object} credentials - 서비스 계정 자격 증명
     */
    setCredentials(credentials) {
        this.credentials = credentials;
    }

    /**
     * 스프레드시트 데이터 조회
     * @param {string} spreadsheetId - 스프레드시트 ID
     * @param {string} sheetName - 시트명
     * @param {string} range - 데이터 범위
     * @returns {Promise<Array<Array<string>>>} 스프레드시트 데이터 배열
     */
    async getSheetData(
        spreadsheetId = this.config.spreadsheetId,
        sheetName = this.config.sheetName,
        range = this.config.range
    ) {
        try {
            console.log(`📊 데이터 조회 시작: ${sheetName}!${range}`);

            const encodedSheetName = encodeURIComponent(sheetName);
            const encodedRange = encodeURIComponent(range);

            const queryParams = new URLSearchParams({
                valueRenderOption: DEFAULT_REQUEST_OPTIONS.valueRenderOption,
                dateTimeRenderOption: DEFAULT_REQUEST_OPTIONS.dateTimeRenderOption
            });

            const url = `${this.config.api.baseUrl}/${spreadsheetId}/values/${encodedSheetName}!${encodedRange}?${queryParams}`;

            const data = await this.makeApiRequest(url);

            if (!data.values || data.values.length === 0) {
                console.warn('⚠️ 조회된 데이터가 없습니다.');
                return [];
            }

            console.log(`✅ 데이터 조회 완료: ${data.values.length}행`);
            return data.values;
        } catch (error) {
            console.error('❌ 데이터 조회 실패:', error.message);
            throw new Error(`스프레드시트 데이터 조회 실패: ${error.message}`);
        }
    }

    /**
     * 특정 셀의 현재 값을 조회
     * @param {string} spreadsheetId - 스프레드시트 ID
     * @param {string} sheetName - 시트명
     * @param {string} cellAddress - 셀 주소 (예: 'C3')
     * @returns {Promise<string>} 현재 셀 값
     */
    async getCellValue(
        spreadsheetId = this.config.spreadsheetId,
        sheetName = this.config.sheetName,
        cellAddress
    ) {
        try {
            console.log(`🔍 셀 값 조회: ${sheetName}!${cellAddress}`);

            const encodedSheetName = encodeURIComponent(sheetName);
            const encodedRange = encodeURIComponent(cellAddress);

            const queryParams = new URLSearchParams({
                valueRenderOption: DEFAULT_REQUEST_OPTIONS.valueRenderOption,
                dateTimeRenderOption: DEFAULT_REQUEST_OPTIONS.dateTimeRenderOption
            });

            const url = `${this.config.api.baseUrl}/${spreadsheetId}/values/${encodedSheetName}!${encodedRange}?${queryParams}`;
            const data = await this.makeApiRequest(url);

            const currentValue = data.values?.[0]?.[0] || '';
            console.log(`✅ 현재 셀 값: "${currentValue}"`);

            return currentValue;
        } catch (error) {
            console.error('❌ 셀 값 조회 실패:', error.message);
            throw new Error(`셀 값 조회 실패: ${error.message}`);
        }
    }

    /**
     * 단일 셀 값 업데이트
     * @param {string} spreadsheetId - 스프레드시트 ID
     * @param {string} sheetName - 시트명
     * @param {string} cellAddress - 셀 주소 (예: 'C3')
     * @param {string} value - 새로운 값
     * @returns {Promise<Object>} 업데이트 결과
     */
    async updateCell(
        spreadsheetId = this.config.spreadsheetId,
        sheetName = this.config.sheetName,
        cellAddress,
        value
    ) {
        try {
            console.log(`📝 셀 업데이트 시작: ${sheetName}!${cellAddress} = "${value}"`);

            const encodedSheetName = encodeURIComponent(sheetName);
            const encodedRange = encodeURIComponent(cellAddress);

            const url = `${this.config.api.baseUrl}/${spreadsheetId}/values/${encodedSheetName}!${encodedRange}`;

            const requestBody = {
                range: `${sheetName}!${cellAddress}`,
                majorDimension: "ROWS",
                values: [[value]]
            };

            const queryParams = new URLSearchParams({
                valueInputOption: 'USER_ENTERED',
                includeValuesInResponse: true,
                responseValueRenderOption: DEFAULT_REQUEST_OPTIONS.valueRenderOption,
                responseDateTimeRenderOption: DEFAULT_REQUEST_OPTIONS.dateTimeRenderOption
            });

            const data = await this.makeApiRequest(`${url}?${queryParams}`, {
                method: 'PUT',
                body: JSON.stringify(requestBody)
            });

            console.log(`✅ 셀 업데이트 완료: ${sheetName}!${cellAddress}`);
            return {
                success: true,
                updatedRange: data.updatedRange,
                updatedRows: data.updatedRows,
                updatedColumns: data.updatedColumns,
                updatedCells: data.updatedCells,
                updatedData: data.updatedData
            };
        } catch (error) {
            console.error('❌ 셀 업데이트 실패:', error.message);
            throw new Error(`셀 업데이트 실패: ${error.message}`);
        }
    }

    /**
     * CAS (Compare-And-Swap)를 사용한 안전한 셀 업데이트
     * @param {string} spreadsheetId - 스프레드시트 ID
     * @param {string} sheetName - 시트명
     * @param {string} cellAddress - 셀 주소
     * @param {string} newValue - 새로운 값
     * @param {string} expectedValue - 예상되는 현재 값
     * @returns {Promise<Object>} 업데이트 결과
     */
    async updateCellWithCAS(
        spreadsheetId = this.config.spreadsheetId,
        sheetName = this.config.sheetName,
        cellAddress,
        newValue,
        expectedValue
    ) {
        try {
            console.log(`🔒 CAS 업데이트 시작: ${sheetName}!${cellAddress}`);
            console.log(`   예상값: "${expectedValue}" → 새값: "${newValue}"`);

            // 1. 현재 값 조회
            const currentValue = await this.getCellValue(spreadsheetId, sheetName, cellAddress);

            // 2. 값 비교 - 기본적인 문자열 비교
            const normalizedCurrent = (currentValue || '').toString().trim();
            const normalizedExpected = (expectedValue || '').toString().trim();

            if (normalizedCurrent !== normalizedExpected) {
                console.log(`❌ CAS 실패: 현재값="${normalizedCurrent}", 예상값="${normalizedExpected}"`);
                throw new Error(`CONFLICT: 데이터가 이미 수정되었습니다. 현재 값: "${normalizedCurrent}"`);
            }

            // 3. 값이 동일하면 업데이트 수행
            const updateResult = await this.updateCell(spreadsheetId, sheetName, cellAddress, newValue);

            console.log(`✅ CAS 업데이트 완료: ${sheetName}!${cellAddress}`);
            return {
                ...updateResult,
                casSuccess: true,
                previousValue: currentValue,
                newValue: newValue
            };
        } catch (error) {
            console.error('❌ CAS 업데이트 실패:', error.message);

            // CAS 충돌인지 다른 에러인지 구분
            if (error.message.includes('CONFLICT:')) {
                throw error; // CAS 충돌 에러는 그대로 전달
            } else {
                throw new Error(`CAS 업데이트 실패: ${error.message}`);
            }
        }
    }

    /**
     * 여러 범위의 데이터를 한 번에 조회
     * @param {string} spreadsheetId - 스프레드시트 ID
     * @param {Array<string>} ranges - 범위 배열 (예: ['Sheet1!A1:C10', 'Sheet2!A1:B5'])
     * @returns {Promise<Object>} 범위별 데이터 객체
     */
    async getBatchData(spreadsheetId = this.config.spreadsheetId, ranges) {
        try {
            console.log(`📊 배치 데이터 조회 시작: ${ranges.length}개 범위`);

            const queryParams = new URLSearchParams({
                valueRenderOption: DEFAULT_REQUEST_OPTIONS.valueRenderOption,
                dateTimeRenderOption: DEFAULT_REQUEST_OPTIONS.dateTimeRenderOption
            });

            // 각 범위를 쿼리 파라미터로 추가
            ranges.forEach(range => queryParams.append('ranges', range));

            const url = `${this.config.api.baseUrl}/${spreadsheetId}/values:batchGet?${queryParams}`;

            const data = await this.makeApiRequest(url);

            const result = {};
            if (data.valueRanges) {
                data.valueRanges.forEach((valueRange, index) => {
                    const originalRange = ranges[index];
                    result[originalRange] = valueRange.values || [];
                });
            }

            console.log(`✅ 배치 데이터 조회 완료: ${Object.keys(result).length}개 범위`);
            return result;
        } catch (error) {
            console.error('❌ 배치 데이터 조회 실패:', error.message);
            throw new Error(`배치 데이터 조회 실패: ${error.message}`);
        }
    }

    /**
     * 스프레드시트 메타데이터 조회
     * @param {string} spreadsheetId - 스프레드시트 ID
     * @returns {Promise<Object>} 스프레드시트 메타데이터
     */
    async getSpreadsheetMetadata(spreadsheetId = this.config.spreadsheetId) {
        try {
            console.log(`📋 스프레드시트 메타데이터 조회: ${spreadsheetId}`);

            const url = `${this.config.api.baseUrl}/${spreadsheetId}`;
            const data = await this.makeApiRequest(url);

            console.log(`✅ 메타데이터 조회 완료: ${data.properties?.title}`);
            return data;
        } catch (error) {
            console.error('❌ 메타데이터 조회 실패:', error.message);
            throw new Error(`스프레드시트 메타데이터 조회 실패: ${error.message}`);
        }
    }

    /**
     * 연결 상태 테스트
     * @returns {Promise<boolean>} 연결 성공 여부
     */
    async testConnection() {
        try {
            console.log('🔍 연결 상태 테스트 중...');
            await this.getSpreadsheetMetadata();
            console.log('✅ 연결 상태 테스트 성공');
            return true;
        } catch (error) {
            console.error('❌ 연결 상태 테스트 실패:', error.message);
            return false;
        }
    }

    /**
     * 설정 업데이트
     * @param {Object} newConfig - 새로운 설정
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
}

/**
 * 데이터 서비스 인스턴스 생성 함수
 * @param {Object} authInstance - 인증 인스턴스
 * @param {Object} config - 설정 객체
 * @returns {GoogleSheetsData} 데이터 서비스 인스턴스
 */
export function createDataService(authInstance, config) {
    return new GoogleSheetsData(authInstance, config);
}