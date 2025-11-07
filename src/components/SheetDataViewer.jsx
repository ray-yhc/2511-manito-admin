import { useState, useEffect } from 'react';
import {
  createGoogleSheetsService,
  parseServiceAccountCredentials,
  createSheetConfig
} from '../sheetServices';

function SheetDataViewer() {
  const [sheetsService, setSheetsService] = useState(null);
  const [initError, setInitError] = useState(null);
  const [data, setData] = useState({
    normals: [],
    newbies: [],
    leaders: [],
    filterPairs: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 스프레드시트 서비스 초기화
  useEffect(() => {
    try {
      const credentials = parseServiceAccountCredentials('VITE_SERVICE_ACCOUNT_CREDENTIALS');
      const config = createSheetConfig({
        spreadsheetId: '1IbHBh5SACa505qLB6eNZEARwRofDme_p1NmyRCL7xPA',
        sheetName: 'DB',
        range: 'A1:Z1000'
      });

      const service = createGoogleSheetsService(config, credentials);
      setSheetsService(service);
    } catch (error) {
      setInitError(`서비스 초기화 실패: ${error.message}`);
    }
  }, []);

  // 데이터 가져오기 함수
  const fetchData = async () => {
    if (!sheetsService) return;

    try {
      setLoading(true);
      setError(null);

      // 배치로 모든 범위 가져오기
      const batchData = await sheetsService.getBatchData([
        'DB!A4:A',    // normals
        'DB!B4:B',    // newbies
        'DB!C4:C',    // leaders
        'DB!G4:H40'   // filterPairs
      ]);

      // 데이터 가공
      const normals = batchData['DB!A4:A'] ?
        batchData['DB!A4:A'].flat().filter(item => item && item.trim()) : [];

      const newbies = batchData['DB!B4:B'] ?
        batchData['DB!B4:B'].flat().filter(item => item && item.trim()) : [];

      const leaders = batchData['DB!C4:C'] ?
        batchData['DB!C4:C'].flat().filter(item => item && item.trim()) : [];

      const filterPairs = batchData['DB!G4:H40'] ?
        batchData['DB!G4:H40'].filter(row => row && row.length >= 2 && row[0] && row[1]) : [];

      setData({
        normals,
        newbies,
        leaders,
        filterPairs
      });

    } catch (err) {
      setError(err.message);
      console.error('데이터 가져오기 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  // 서비스 초기화 완료 시 데이터 가져오기
  useEffect(() => {
    if (sheetsService) {
      fetchData();
    }
  }, [sheetsService]);


  if (initError) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>초기화 오류</h2>
        <p>{initError}</p>
        <p>환경 변수 VITE_SERVICE_ACCOUNT_CREDENTIALS가 올바르게 설정되었는지 확인해주세요.</p>
      </div>
    );
  }

  if (!sheetsService) {
    return (
      <div style={{ padding: '20px' }}>
        <p>서비스 초기화 중...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Google Sheets 데이터 로딩 중...</h2>
        <p>스프레드시트에서 데이터를 가져오고 있습니다.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>데이터 로딩 오류</h2>
        <p>{error}</p>
        <button onClick={refetch}>재시도</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Google Sheets 데이터 뷰어</h1>
      <p>스프레드시트 ID: 1IbHBh5SACa505qLB6eNZEARwRofDme_p1NmyRCL7xPA</p>

      <button onClick={fetchData} style={{ marginBottom: '20px', padding: '10px 20px' }}>
        데이터 새로고침
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Normals 섹션 */}
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
          <h3 style={{ color: '#2196F3', marginTop: 0 }}>Normals (A4:A)</h3>
          <p>총 {data.normals.length}개 항목</p>
          <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '3px' }}>
            {data.normals.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {data.normals.map((item, index) => (
                  <li key={index} style={{ marginBottom: '5px' }}>{item}</li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>데이터가 없습니다.</p>
            )}
          </div>
        </div>

        {/* Newbies 섹션 */}
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
          <h3 style={{ color: '#4CAF50', marginTop: 0 }}>Newbies (B4:B)</h3>
          <p>총 {data.newbies.length}개 항목</p>
          <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '3px' }}>
            {data.newbies.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {data.newbies.map((item, index) => (
                  <li key={index} style={{ marginBottom: '5px' }}>{item}</li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>데이터가 없습니다.</p>
            )}
          </div>
        </div>

        {/* Leaders 섹션 */}
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
          <h3 style={{ color: '#FF9800', marginTop: 0 }}>Leaders (C4:C)</h3>
          <p>총 {data.leaders.length}개 항목</p>
          <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '3px' }}>
            {data.leaders.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {data.leaders.map((item, index) => (
                  <li key={index} style={{ marginBottom: '5px' }}>{item}</li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>데이터가 없습니다.</p>
            )}
          </div>
        </div>
      </div>

      {/* Filter Pairs 섹션 */}
      <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
        <h3 style={{ color: '#9C27B0', marginTop: 0 }}>Filter Pairs (G4:H40)</h3>
        <p>총 {data.filterPairs.length}개 페어</p>
        <div style={{ maxHeight: '300px', overflowY: 'auto', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '3px' }}>
          {data.filterPairs.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#e0e0e0' }}>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ccc' }}>Column G</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ccc' }}>Column H</th>
                </tr>
              </thead>
              <tbody>
                {data.filterPairs.map((pair, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{pair[0]}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{pair[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>데이터가 없습니다.</p>
          )}
        </div>
      </div>

      {/* 원시 데이터 표시 (디버깅용) */}
      <details style={{ marginTop: '20px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>원시 배치 데이터 보기</summary>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', overflow: 'auto', fontSize: '12px' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export default SheetDataViewer;