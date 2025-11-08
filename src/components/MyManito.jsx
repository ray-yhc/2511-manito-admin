import {useState, useEffect} from 'react';
import {getSheetDataService} from '../services/sheetDataService';

function MyManito() {
    const [dataService] = useState(() => getSheetDataService());
    const [pairs, setPairs] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchName, setSearchName] = useState('');
    const [searchPassword, setSearchPassword] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [foundReceiver, setFoundReceiver] = useState(null);
    const [showResult, setShowResult] = useState(false);

    // 초기 데이터 로드
    useEffect(() => {
        loadPairData();
    }, []);

    // 쌍 데이터 로드 함수
    const loadPairData = async () => {
        try {
            setLoading(true);
            setError(null);

            // 서비스 초기화
            await dataService.initialize(
                '1IbHBh5SACa505qLB6eNZEARwRofDme_p1NmyRCL7xPA',
                'DB'
            );

            // J4:K1000 범위에서 쌍 데이터, M4:N1000 범위에서 사용자 인증 데이터 가져오기
            const batchData = await dataService.sheetsService.getBatchData([
                'DB!J4:K1000',
                'DB!M4:N1000'
            ]);

            const rawPairs = batchData['DB!J4:K1000'] || [];
            const rawUsers = batchData['DB!M4:N1000'] || [];

            // 빈 값 필터링하고 유효한 쌍만 추출
            const validPairs = rawPairs
                .filter(row =>
                    Array.isArray(row) &&
                    row.length >= 2 &&
                    row[0] && row[1] &&
                    typeof row[0] === 'string' &&
                    typeof row[1] === 'string' &&
                    row[0].trim() && row[1].trim()
                )
                .map(row => ({
                    giver: row[0].trim(),
                    receiver: row[1].trim()
                }));

            // 사용자 인증 데이터 처리
            const validUsers = rawUsers
                .filter(row =>
                    Array.isArray(row) &&
                    row.length >= 2 &&
                    row[0] && row[1] &&
                    typeof row[0] === 'string' &&
                    typeof row[1] === 'string' &&
                    row[0].trim() && row[1].trim()
                )
                .map(row => ({
                    name: row[0].trim(),
                    password: row[1].trim()
                }));

            setPairs(validPairs);
            setUsers(validUsers);
            console.log(`✅ ${validPairs.length}개의 쌍 데이터와 ${validUsers.length}개의 사용자 데이터를 로드했습니다.`);

        } catch (err) {
            console.error('쌍 데이터 로드 실패:', err);
            setError(`데이터 로드 실패: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // 검색 함수
    const handleSearch = async () => {
        const trimmedName = searchName.trim();
        const trimmedPassword = searchPassword.trim();

        if (!trimmedName) {
            setSearchError('이름을 입력해주세요.');
            return;
        }

        if (!trimmedPassword) {
            setSearchError('비밀번호를 입력해주세요.');
            return;
        }

        setSearching(true);
        setSearchError('');

        try {
            // 1. 사용자 인증 확인 (대소문자 구분 없이)
            const foundUser = users.find(user =>
                user.name.toLowerCase() === trimmedName.toLowerCase()
            );

            if (!foundUser) {
                setSearchError('존재하지 않는 사용자입니다. 이름을 확인해주세요.');
                return;
            }

            if (foundUser.password !== trimmedPassword) {
                setSearchError('비밀번호가 일치하지 않습니다. 다시 확인해주세요.');
                return;
            }

            // 2. 인증 성공 후 기버-리시버 쌍 찾기
            const foundPair = pairs.find(pair =>
                pair.giver.toLowerCase() === trimmedName.toLowerCase()
            );

            if (foundPair) {
                setFoundReceiver(foundPair.receiver);
                setShowResult(true);
                console.log(`✅ ${trimmedName}님이 인증되었고 리시버를 찾았습니다: ${foundPair.receiver}`);
            } else {
                setSearchError('해당 사용자의 리시버 정보를 찾을 수 없습니다.');
            }
        } catch (err) {
            setSearchError('검색 중 오류가 발생했습니다.');
            console.error('검색 오류:', err);
        } finally {
            setSearching(false);
        }
    };

    // 엔터키 처리
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // 다시 검색하기
    const handleSearchAgain = () => {
        setShowResult(false);
        setFoundReceiver(null);
        setSearchName('');
        setSearchPassword('');
        setSearchError('');
    };

    // 로딩 상태
    if (loading) {
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-pink-50  to-red-200 flex items-center justify-center p-4">
                <div className="w-full max-w-md ">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
                        <div className="flex flex-col items-center">
                            <div className="text-7xl mb-6 animate-spin">🎁</div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-3">데이터 로딩 중</h2>
                            <p className="text-gray-500 text-sm mb-6">마니또 쌍 정보를 가져오고 있습니다</p>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-red-500 to-pink-500 h-full rounded-full transition-all duration-1000 ease-out animate-loading-bar"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 에러 상태
    if (error) {
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-pink-50  to-red-200 flex items-center justify-center p-4">
                <div className="w-full max-w-md ">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
                        <div className="flex flex-col items-center">
                            <div className="text-7xl mb-6">⚠️</div>
                            <h2 className="text-2xl font-bold text-red-600 mb-3">오류 발생</h2>
                            <p className="text-gray-600 text-sm text-center mb-8 leading-relaxed break-words">{error}</p>
                            <button
                                onClick={loadPairData}
                                className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600
                                         text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300
                                         shadow-lg hover:shadow-xl active:scale-95"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <span>🔄</span>
                                    <span>다시 시도</span>
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen  bg-gradient-to-br from-pink-50  to-red-200 flex items-center justify-center p-4">
            <div className="w-full max-w-md ">
                {!showResult ? (
                    // 검색 화면
                    <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
                        {/* 제목과 아이콘 */}
                        <div className="text-center mb-8">
                            <p className="text-gray-700 text-lg">두근두근</p>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                                💌 내 윈터 찾기
                            </h1>
                            <p className="text-gray-500 text-sm">이름을 입력하여 확인하세요</p>
                        </div>

                        {/* 검색 입력 */}
                        <div className="mb-6 space-y-4">
                            <div>
                                <label htmlFor="searchName" className="block text-sm font-semibold text-gray-700 mb-3">
                                    나의 이름
                                </label>
                                <input
                                    id="searchName"
                                    type="text"
                                    value={searchName}
                                    onChange={(e) => setSearchName(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="예: 홍길동"
                                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl text-lg
                                             focus:border-red-400 focus:ring-4 focus:ring-red-100 focus:outline-none
                                             transition-all duration-300 placeholder:text-gray-400"
                                    disabled={searching}
                                    autoComplete="off"
                                />
                            </div>
                            <div>
                                <label htmlFor="searchPassword"
                                       className="block text-sm font-semibold text-gray-700 mb-3">
                                    비밀번호
                                </label>
                                <input
                                    id="searchPassword"
                                    type="password"
                                    value={searchPassword}
                                    onChange={(e) => setSearchPassword(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="비밀번호를 입력해주세요"
                                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl text-lg
                                             focus:border-red-400 focus:ring-4 focus:ring-red-100 focus:outline-none
                                             transition-all duration-300 placeholder:text-gray-400"
                                    disabled={searching}
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        {/* 에러 메시지 */}
                        {searchError && (
                            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                                <p className="text-red-700 text-sm font-medium flex items-center gap-2">
                                    <span className="text-lg">⚠️</span>
                                    <span>{searchError}</span>
                                </p>
                            </div>
                        )}

                        {/* 찾기 버튼 */}
                        <button
                            onClick={handleSearch}
                            disabled={searching || !searchName.trim() || !searchPassword.trim()}
                            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 
                                      shadow-lg active:scale-95 ${
                                searching || !searchName.trim() || !searchPassword.trim()
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                                    : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white hover:shadow-xl'
                            }`}
                        >
                            {searching ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="animate-spin text-xl">🔍</div>
                                    <span>검색 중...</span>
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="text-xl">🔍</span>
                                    <span>찾기</span>
                                </span>
                            )}
                        </button>

                        {/* 안내 메시지 */}
                        <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
                            <p className="text-blue-700 text-sm flex items-start gap-2">
                                <span className="text-lg flex-shrink-0">💡</span>
                                <span className="leading-relaxed">
                                    정확한 이름과 비밀번호를 입력해주세요.
                                </span>
                            </p>
                        </div>
                    </div>
                ) : (
                    // 결과 화면
                    <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
                        {/* 성공 애니메이션과 결과 */}
                        <div className="text-center mb-8">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 leading-relaxed">
                                나의 윈터는
                            </h2>
                            <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl p-6 mb-4 relative">
                                <span className="relative inline-block w-full">
                                    <p className="absolute inset-0 animate-ping  opacity-25 text-4xl sm:text-5xl font-black text-transparent bg-clip-text
                                                bg-gradient-to-r from-red-500 to-pink-500 break-words">
                                        {foundReceiver}
                                    </p>
                                    <p className="relative text-4xl sm:text-5xl font-black text-transparent bg-clip-text
                                                bg-gradient-to-r from-red-500 to-pink-500 break-words">
                                        {foundReceiver}
                                    </p>
                                </span>
                            </div>
                            <p className="text-xl sm:text-2xl font-bold text-gray-800">
                                입니다!
                            </p>
                        </div>

                        {/* 축하 메시지 */}
                        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200
                                      rounded-2xl p-6 mb-6">
                            <p className="text-gray-700 font-medium text-center leading-relaxed">
                                <p className="text-red-600"> ※ 오픈채팅방 입장 안내 ※</p><br/>
                                오늘 저녁 8시경에 청1단톡방을 통해<br/>
                                오픈채팅방 링크를 공유해드릴 예정입니다.<br/><br/>
                                <strong className="text-red-600">{foundReceiver}의 마니또</strong> 닉네임으로 입장해주세요.<br/>
                                그럼 2주간 행복한 마니또 되시길 바랍니다! 🎉
                            </p>
                        </div>

                        {/* 다시 검색하기 버튼 */}
                        <button
                            onClick={handleSearchAgain}
                            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-6
                                     rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl
                                     active:scale-95"
                        >
                            <span className="flex items-center justify-center gap-2">
                                <span className="text-xl">🔍</span>
                                <span>다시 검색하기</span>
                            </span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MyManito;