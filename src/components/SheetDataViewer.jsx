import {useState, useEffect} from 'react';
import {getSheetDataService} from '../services/sheetDataService';

function SheetDataViewer() {
    const [dataService] = useState(() => getSheetDataService());
    const [data, setData] = useState({
        normals: [],
        newbies: [],
        leaders: [],
        filterPairs: [],
        metadata: null
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [generatedPairs, setGeneratedPairs] = useState(null);
    const [pairingInProgress, setPairingInProgress] = useState(false);
    const [savingPairs, setSavingPairs] = useState(false);
    const [pairingError, setPairingError] = useState(null);

    // 초기 데이터 로드
    useEffect(() => {
        loadData();
    }, []);

    // 데이터 로드 함수 (초기화 + 데이터 가져오기)
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await dataService.initializeAndFetch(
                '1IbHBh5SACa505qLB6eNZEARwRofDme_p1NmyRCL7xPA',
                'DB'
            );

            if (result.success) {
                setData(result.data);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(`데이터 로드 실패: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // 데이터 새로고침 함수
    const refreshData = async () => {
        if (!dataService.getInitializationStatus()) {
            await loadData(); // 초기화되지 않았다면 전체 로드
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const freshData = await dataService.fetchDefaultData('DB');
            setData(freshData);
        } catch (err) {
            setError(`새로고침 실패: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // 랜덤 페어 생성 함수
    const generateRandomPairs = async () => {
        if (!data || (!data.normals.length && !data.newbies.length && !data.leaders.length)) {
            setPairingError('참가자 데이터가 없습니다. 먼저 데이터를 로드해주세요.');
            return;
        }

        try {
            setPairingInProgress(true);
            setPairingError(null);
            setGeneratedPairs(null); // 이전 결과 초기화

            const pairResult = dataService.makeRandomPairs(data);
            setGeneratedPairs(pairResult);
            setPairingError(null); // 성공 시 에러 클리어

            console.log('쌍 생성 완료:', pairResult);
        } catch (err) {
            setPairingError(err.message);
            setGeneratedPairs(null); // 에러 시 이전 결과 클리어
            console.error('쌍 생성 실패:', err);
        } finally {
            setPairingInProgress(false);
        }
    };

    // 쌍 저장 함수
    const savePairsToSheet = async () => {
        if (!generatedPairs || !generatedPairs.pairs || generatedPairs.pairs.length === 0) {
            setError('저장할 쌍 데이터가 없습니다.');
            return;
        }

        try {
            setSavingPairs(true);
            setError(null);

            await dataService.savePairsToSheet(generatedPairs.pairs, 'DB');
            console.log('쌍 저장 완료');

            // 저장 성공 알림 (간단한 방법으로)
            alert('쌍이 성공적으로 스프레드시트에 저장되었습니다!');
        } catch (err) {
            setError(`쌍 저장 실패: ${err.message}`);
            console.error('쌍 저장 실패:', err);
        } finally {
            setSavingPairs(false);
        }
    };


    // 에러 상태 UI
    if (error && !loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="text-6xl mb-6">⚠️</div>
                    <h2 className="text-2xl font-bold text-red-600 mb-4">오류 발생</h2>
                    <p className="text-gray-700 mb-6 leading-relaxed break-words">{error}</p>
                    <button
                        onClick={loadData}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl
                                 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 w-full mb-4"
                    >
                        🔄 다시 시도
                    </button>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-amber-800 text-sm">
                            💡 환경 변수 VITE_SERVICE_ACCOUNT_CREDENTIALS가 올바르게 설정되었는지 확인해주세요.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="animate-spin text-6xl mb-6">⏳</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">데이터 로딩 중...</h2>
                    <p className="text-gray-600 leading-relaxed">스프레드시트에서 데이터를 가져오고 있습니다.</p>
                    <div className="mt-6">
                        <div className="bg-blue-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full animate-pulse w-3/4"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }


    // 통계 정보 계산
    const statistics = data.metadata ? dataService.getDataStatistics(data) : null;

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                        🎯 마니또 시스템
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600 break-all">
                        스프레드시트 ID: 1IbHBh5SACa505qLB6eNZEARwRofDme_p1NmyRCL7xPA
                    </p>
                </div>

                {/* Control Panel */}
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <button
                            onClick={refreshData}
                            disabled={loading}
                            className={`
                                flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium
                                transition-all duration-200 w-full sm:w-auto
                                ${loading
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                                }
                            `}
                        >
                            <span className="text-lg">🔄</span>
                            {loading ? '로딩 중...' : '데이터 새로고침'}
                        </button>

                        {statistics && (
                            <div className="bg-gray-100 rounded-lg p-3 text-sm w-full sm:flex-1">
                                <div className="font-semibold text-gray-800 mb-1">
                                    📊 통계: 총 {statistics.totalItems}개 항목, {statistics.totalPairs}개 페어
                                </div>
                                {data.metadata?.fetchedAt && (
                                    <div className="text-gray-600 text-xs">
                                        마지막 업데이트: {new Date(data.metadata.fetchedAt).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Participant Data Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
                    {/* Normals 섹션 */}
                    <div className="bg-white rounded-lg shadow-md border border-gray-200">
                        <div className="p-4 sm:p-6">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">👨‍💼</span>
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-600">Normals</h3>
                                    <p className="text-sm text-gray-500">(A4:A)</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-700 mb-4">총 {data.normals.length}개 항목</p>
                            <div className="max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-3">
                                {data.normals.length > 0 ? (
                                    <div className="space-y-2">
                                        {data.normals.map((item, index) => (
                                            <div key={index} className="bg-white rounded px-3 py-2 text-sm border border-gray-200">
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic text-sm text-center py-4">데이터가 없습니다.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Newbies 섹션 */}
                    <div className="bg-white rounded-lg shadow-md border border-gray-200">
                        <div className="p-4 sm:p-6">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">🌱</span>
                                <div>
                                    <h3 className="text-lg font-semibold text-green-600">Newbies</h3>
                                    <p className="text-sm text-gray-500">(B4:B)</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-700 mb-4">총 {data.newbies.length}개 항목</p>
                            <div className="max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-3">
                                {data.newbies.length > 0 ? (
                                    <div className="space-y-2">
                                        {data.newbies.map((item, index) => (
                                            <div key={index} className="bg-white rounded px-3 py-2 text-sm border border-gray-200">
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic text-sm text-center py-4">데이터가 없습니다.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Leaders 섹션 */}
                    <div className="bg-white rounded-lg shadow-md border border-gray-200">
                        <div className="p-4 sm:p-6">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">👑</span>
                                <div>
                                    <h3 className="text-lg font-semibold text-orange-600">Leaders</h3>
                                    <p className="text-sm text-gray-500">(C4:C)</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-700 mb-4">총 {data.leaders.length}개 항목</p>
                            <div className="max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-3">
                                {data.leaders.length > 0 ? (
                                    <div className="space-y-2">
                                        {data.leaders.map((item, index) => (
                                            <div key={index} className="bg-white rounded px-3 py-2 text-sm border border-gray-200">
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic text-sm text-center py-4">데이터가 없습니다.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter Pairs 섹션 */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
                    <div className="p-4 sm:p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">🚫</span>
                            <div>
                                <h3 className="text-lg font-semibold text-purple-600">Filter Pairs</h3>
                                <p className="text-sm text-gray-500">(G4:H40) - 금지된 쌍</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-4">총 {data.filterPairs.length}개 페어</p>

                        <div className="max-h-80 overflow-auto bg-gray-50 rounded-lg">
                            {data.filterPairs.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-full">
                                        <thead className="bg-purple-100 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-purple-700">
                                                    Column G
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-purple-700">
                                                    Column H
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {data.filterPairs.map((pair, index) => (
                                                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                                                        {pair[0]}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        {pair[1]}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-gray-500 italic text-sm">금지된 쌍이 없습니다.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>


                {/* 원시 데이터 표시 (디버깅용) */}
                <details className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
                    <summary className="p-4 cursor-pointer font-semibold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                        🔍 원시 배치 데이터 보기 (개발자용)
                    </summary>
                    <div className="p-4 border-t border-gray-200">
                        <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-xs text-gray-800 max-h-96">
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    </div>
                </details>

                {/* 랜덤 쌍 생성 버튼 */}
                <div className="text-center mb-6">
                    <button
                        onClick={generateRandomPairs}
                        disabled={loading || pairingInProgress || (!data.normals.length && !data.newbies.length && !data.leaders.length)}
                        className={`
                            inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-semibold rounded-xl
                            transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 w-full sm:w-auto
                            ${loading || pairingInProgress || (!data.normals.length && !data.newbies.length && !data.leaders.length)
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                            }
                        `}
                    >
                        <span className="text-2xl">{pairingInProgress ? '⏳' : '🎲'}</span>
                        {pairingInProgress ? '쌍 생성 중...' : '랜덤 쌍 생성'}
                    </button>
                </div>

                {/* 쌍 생성 에러 표시 */}
                {pairingError && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6">
                        <div className="text-center mb-4">
                            <h3 className="text-xl font-bold text-red-600 flex items-center justify-center gap-2">
                                <span className="text-2xl">⚠️</span>
                                쌍 생성 실패
                            </h3>
                        </div>

                        <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-6 text-center">
                            <p className="font-semibold text-red-800 mb-2">에러 메시지:</p>
                            <p className="text-red-700 text-sm leading-relaxed break-words">
                                {pairingError}
                            </p>
                        </div>

                        {/* 에러별 해결 방법 제시 */}
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                            <p className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                                <span>💡</span>
                                해결 방법:
                            </p>
                            <ul className="space-y-2 text-sm text-orange-700">
                                {pairingError.includes('newbie') && (
                                    <li className="flex items-start gap-2">
                                        <span className="text-orange-500 mt-1">•</span>
                                        newbie와 leader의 비율을 조정해보세요
                                    </li>
                                )}
                                {pairingError.includes('leader') && (
                                    <li className="flex items-start gap-2">
                                        <span className="text-orange-500 mt-1">•</span>
                                        leader끼리는 매칭이 불가능합니다. normal 참가자를 추가해보세요
                                    </li>
                                )}
                                {pairingError.includes('참가자 구성') && (
                                    <li className="flex items-start gap-2">
                                        <span className="text-orange-500 mt-1">•</span>
                                        참가자 구성을 변경하거나 filterPairs를 조정해보세요
                                    </li>
                                )}
                                {pairingError.includes('1명뿐') && (
                                    <li className="flex items-start gap-2">
                                        <span className="text-orange-500 mt-1">•</span>
                                        각 그룹에 최소 2명 이상의 참가자가 필요합니다
                                    </li>
                                )}
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    데이터를 새로고침한 후 다시 시도해보세요
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    filterPairs에서 너무 많은 쌍을 제외했는지 확인해보세요
                                </li>
                            </ul>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={generateRandomPairs}
                                disabled={pairingInProgress}
                                className={`
                                    flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                                    transition-all duration-200 ${pairingInProgress
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
                                    }
                                `}
                            >
                                <span>🔄</span>
                                다시 생성하기
                            </button>

                            <button
                                onClick={refreshData}
                                disabled={loading || pairingInProgress}
                                className={`
                                    flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                                    transition-all duration-200 ${loading || pairingInProgress
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                                    }
                                `}
                            >
                                <span>📊</span>
                                데이터 새로고침
                            </button>

                            <button
                                onClick={() => setPairingError(null)}
                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                                        bg-gray-500 hover:bg-gray-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
                            >
                                <span>✖️</span>
                                에러 메시지 닫기
                            </button>
                        </div>
                    </div>
                )}

                {/* 생성된 랜덤 쌍 표시 */}
                {generatedPairs && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 shadow-lg">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-green-700 flex items-center justify-center gap-3">
                                <span className="text-3xl">🎯</span>
                                생성된 랜덤 쌍
                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-lg font-bold">
                                    {generatedPairs.pairs.length}개
                                </span>
                            </h2>
                        </div>

                        {/* 쌍 생성 정보 */}
                        <div className="bg-green-100 rounded-xl p-4 mb-6 border border-green-200">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                <div className="text-center">
                                    <div className="font-semibold text-green-800">총 참가자</div>
                                    <div className="text-lg font-bold text-green-900">{generatedPairs.metadata.totalParticipants}명</div>
                                </div>
                                <div className="text-center">
                                    <div className="font-semibold text-green-800">페어 참여</div>
                                    <div className="text-lg font-bold text-green-900">{generatedPairs.metadata.usedParticipants}명</div>
                                </div>
                                {generatedPairs.metadata.excludedParticipants > 0 && (
                                    <div className="text-center">
                                        <div className="font-semibold text-orange-600">제외</div>
                                        <div className="text-lg font-bold text-orange-700">{generatedPairs.metadata.excludedParticipants}명</div>
                                    </div>
                                )}
                                <div className="text-center col-span-2 sm:col-span-1">
                                    <div className="font-semibold text-green-800">생성 시간</div>
                                    <div className="text-xs text-green-700">{new Date(generatedPairs.metadata.generatedAt).toLocaleString()}</div>
                                </div>
                            </div>

                            {generatedPairs.metadata.excluded.length > 0 && (
                                <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                    <div className="font-semibold text-orange-800 mb-2">제외된 참가자:</div>
                                    <div className="text-sm text-orange-700">
                                        {generatedPairs.metadata.excluded.map(p => `${p.name} (${p.type})`).join(', ')}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 쌍 목록 - 컴팩트 테이블 */}
                        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                            <table className="w-full text-sm">
                                <thead className="bg-green-600 text-white">
                                    <tr>
                                        <th className="px-2 py-2 text-left font-semibold">#</th>
                                        <th className="px-2 py-2 text-left font-semibold">GIVER</th>
                                        <th className="px-2 py-2 text-left font-semibold">RECEIVER</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {generatedPairs.pairs.map((pair, index) => (
                                        <tr key={pair.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                            <td className="px-2 py-2 font-medium text-gray-600">
                                                {pair.id}
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    <span className="font-medium text-gray-900">{pair.giver}</span>
                                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium text-white ${
                                                        pair.giverType === 'normal' ? 'bg-blue-500' :
                                                        pair.giverType === 'newbie' ? 'bg-green-500' : 'bg-orange-500'
                                                    }`}>
                                                        {pair.giverType}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    <span className="font-medium text-gray-900">{pair.receiver}</span>
                                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium text-white ${
                                                        pair.receiverType === 'normal' ? 'bg-blue-500' :
                                                        pair.receiverType === 'newbie' ? 'bg-green-500' : 'bg-orange-500'
                                                    }`}>
                                                        {pair.receiverType}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 버튼들 */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                            <button
                                onClick={generateRandomPairs}
                                disabled={pairingInProgress || savingPairs}
                                className={`
                                    flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold
                                    transition-all duration-300 shadow-lg hover:shadow-xl w-full sm:w-auto
                                    ${(pairingInProgress || savingPairs)
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-orange-500 hover:bg-orange-600 text-white transform hover:scale-105'
                                    }
                                `}
                            >
                                <span className="text-xl">🔄</span>
                                새로운 쌍 다시 생성
                            </button>

                            <button
                                onClick={savePairsToSheet}
                                disabled={pairingInProgress || savingPairs}
                                className={`
                                    flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold
                                    transition-all duration-300 shadow-lg hover:shadow-xl w-full sm:w-auto
                                    ${(pairingInProgress || savingPairs)
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105'
                                    }
                                `}
                            >
                                <span className="text-xl">{savingPairs ? '⏳' : '💾'}</span>
                                {savingPairs ? '저장 중...' : '이대로 저장하기'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SheetDataViewer;