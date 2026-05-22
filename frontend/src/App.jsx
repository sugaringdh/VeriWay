import { useState, useRef, useCallback } from 'react'
import './App.css'
import RouteMap from './RouteMap.jsx'

// Vite proxy: /api/webhook → http://localhost:5678/webhook-test/veriway-route
// (CORS를 피하기 위해 Vite 프록시 경유)
const DEFAULT_WEBHOOK = '/api/webhook'

const QUICK_EXAMPLES = [
  '🦽 학생회관에서 명신관까지 휠체어로 가고 싶어',
  '🩼 명신관에서 미술대학까지 목발 짚고 가야 해',
  '🧳 정문에서 순헌관까지 캐리어 끌고 가',
  '👶 정문에서 프라임관까지 유모차 끌어야 해',
]

const MOBILITY_ICONS = {
  '휠체어': '🦽',
  '목발/부상': '🩼',
  '캐리어/짐': '🧳',
  '유모차': '👶',
  '임산부/노약자': '🤰',
  '일반': '🚶',
}

const LOADING_STEPS = [
  { id: 'parse', label: '입력 분석 중...' },
  { id: 'ai',    label: 'AI 이동 조건 추출 중...' },
  { id: 'db',    label: '경로 데이터베이스 검색 중...' },
  { id: 'guide', label: '맞춤 안내문 생성 중...' },
]

function LoadingCard({ step }) {
  return (
    <div className="loading-card">
      <div className="loading-dots">
        <div className="loading-dot" />
        <div className="loading-dot" />
        <div className="loading-dot" />
      </div>
      <p className="loading-text">VeriWay AI가 최적 경로를 찾고 있어요</p>
      <div className="loading-steps">
        {LOADING_STEPS.map((s, i) => {
          const status = i < step ? 'done' : i === step ? 'active' : ''
          return (
            <div key={s.id} className={`loading-step ${status}`}>
              <span className="step-icon">
                {i < step ? '✅' : i === step ? '⏳' : '○'}
              </span>
              {s.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RouteResult({ data, onReset }) {
  const [showReport, setShowReport] = useState(false)
  const [reportType, setReportType] = useState('')
  const [reportDetail, setReportDetail] = useState('')

  const SECTION_META = {
    '이동 조건 분석':   { icon: '🔍', cls: 'card-icon-purple' },
    '추천 경로':       { icon: '🗺️', cls: 'card-icon-blue'   },
    '피해야 할 장애물': { icon: '⚠️', cls: 'card-icon-orange' },
    '이용 가능한 편의시설': { icon: '♿', cls: 'card-icon-teal' },
    '건물 내부 길찾기': { icon: '🏢', cls: 'card-icon-blue'   },
    '이동 안내':       { icon: '🚶', cls: 'card-icon-teal'   },
    '주의할 점':       { icon: '⚠️', cls: 'card-icon-orange' },
  }

  const parseSections = (text) => {
    const result = []
    const regex = /\[([^\]]+)\]/g
    let match
    const indices = []
    while ((match = regex.exec(text)) !== null) {
      indices.push({ title: match[1], start: match.index, end: match.index + match[0].length })
    }
    for (let i = 0; i < indices.length; i++) {
      const { title, end } = indices[i]
      const nextStart = indices[i + 1]?.start ?? text.length
      const body = text.slice(end, nextStart).trim()
      if (body) result.push({ title, body })
    }
    return result
  }


  const FORM_BASE = 'https://docs.google.com/forms/d/e/1FAIpQLSdK-T_po1e81kbkoNKUlIMlbwSNweGejmbBbLJ-LKki5Ke80Q/viewform'
  const openReport = () => {
    const params = new URLSearchParams({
      'entry.1576593929': data.start || '',
      'entry.1525740734': data.destination || '',
      'entry.1684461551': reportType || '경로 오류',
      'entry.2058519063': reportDetail || '',
      'usp': 'pp_url'
    })
    window.open(`${FORM_BASE}?${params.toString()}`, '_blank')
    setShowReport(false)
    setReportType('')
    setReportDetail('')
  }
  const hasRoute = data.has_route !== false && data.answer && !data.answer.includes('찾지 못했어요')

  if (!hasRoute) {
    return (
      <div className="no-route-card">
        <div className="no-route-icon">🗺️</div>
        <div className="no-route-title">등록된 경로를 찾지 못했어요</div>
        <p className="no-route-desc">
          VeriWay는 팀이 직접 답사한 검증된 경로만 안내해요.<br />
          아래 지원 경로 중에서 선택해보세요.
        </p>
        {data.supported_routes && (
          <div className="supported-routes">
            {data.supported_routes.map((r, i) => (
              <div key={i} className="supported-route-item">📍 {r}</div>
            ))}
          </div>
        )}
        <button className="reset-btn" onClick={onReset}>↩ 다시 검색하기</button>
      </div>
    )
  }

  const mobilityIcon = MOBILITY_ICONS[data.mobility_condition] || '🚶'
  const sections = parseSections(data.answer || '')

  return (
    <div className="result-section">

      {/* ── 컴팩트 경로 바 ── */}
      <div className="route-bar">
        <div className="route-bar-path">
          <span className="route-bar-start">{data.start || '—'}</span>
          <span className="route-bar-arrow">→</span>
          <span className="route-bar-end">{data.destination || '—'}</span>
        </div>
        <div className="route-bar-badges">
          <span className="badge badge-neutral">{mobilityIcon} {data.mobility_condition || '일반'}</span>
          {data.route_id && <span className="badge badge-good">🗂 AUTO</span>}
          {data.obstacles && <span className="badge badge-warn">⚠️ 장애물</span>}
        </div>
      </div>

      {/* ── 지도 헤더 (2컬럼 위에 full-width) ── */}
      <div className="map-section-header">
        <div className="card-icon card-icon-blue" style={{ width:32,height:32,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>📍</div>
        <span className="map-section-title">경로 지도</span>
        <span className="map-section-sub">OpenStreetMap 기반</span>
      </div>

      {/* ── 2컬럼 레이아웃 ── */}
      <div className="result-columns">

        {/* 왼쪽: 지도 */}
        <div className="result-col-map">
          <RouteMap
            coordinates={data.coordinates}
            routeDescription={data.route_description}
            pathStops={Array.isArray(data.path) && data.path.length > 0 ? data.path : null}
            startLabel={data.start}
            endLabel={data.destination}
            routeName={`${data.start} → ${data.destination}`}
          />
        </div>

        {/* 오른쪽: AI 안내 섹션 카드들 */}
        <div className="result-col-info">

          {/* AI 섹션 카드 */}
          {sections.length > 0 ? sections.map((sec, i) => {
            const meta = SECTION_META[sec.title] || { icon: '📋', cls: 'card-icon-purple' }
            const isFirst = i === 0
            const isRoute = sec.title === '추천 경로'
            const isObstacle = sec.title === '피해야 할 장애물'
            const isFacility = sec.title === '이용 가능한 편의시설'
            const pathStops = Array.isArray(data.path) && data.path.length > 0 ? data.path : null

            // 실제 데이터 우선 사용
            const realItems = isObstacle && data.obstacles
              ? data.obstacles.split(/[,，、\n]/).map(s => s.trim()).filter(Boolean)
              : isFacility && data.facilities
              ? data.facilities.split(/[,，、\n]/).map(s => s.trim()).filter(Boolean)
              : null

            const aiLines = sec.body.split('\n').filter(Boolean)

            return (
              <div key={i} className="info-card">
                <div className="card-header" style={{ marginBottom: 8 }}>
                  <div className={`card-icon ${meta.cls}`}>{meta.icon}</div>
                  <div>
                    <div className="card-title">{sec.title}</div>
                    {isFirst && <div className="card-subtitle">Solar-pro3 기반 맞춤 안내문</div>}
                  </div>
                </div>
                {isRoute && pathStops && (
                  <div className="path-flow">
                    {pathStops.map((stop, k) => (
                      <span key={k} className="path-flow-item">
                        <span className="path-stop">{stop}</span>
                        {k < pathStops.length - 1 && <span className="path-arrow">→</span>}
                      </span>
                    ))}
                  </div>
                )}
                <div className="info-list">
                  {(realItems || aiLines).map((line, j) => (
                    <div key={j} className="info-item">
                      <span className="info-item-icon">{isObstacle ? '🚧' : isFacility ? '✅' : '🔹'}</span>
                      <span style={{ wordBreak: 'break-word' }}>{line.replace(/^[-•]\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }) : (
            <div className="answer-card">
              <div className="card-header">
                <div className="card-icon card-icon-purple">🤖</div>
                <div>
                  <div className="card-title">AI 경로 안내</div>
                  <div className="card-subtitle">Solar-pro3 기반 맞춤 안내문</div>
                </div>
              </div>
              <div className="answer-text">
                {(data.answer || '').split('\n').filter(Boolean).map((line, i) => (
                  <p key={i} style={{ margin: '4px 0' }}>{line}</p>
                ))}
              </div>
            </div>
          )}





          {/* 편의시설 */}
          {data.facilities && (
            <div className="info-card">
              <div className="card-header" style={{ marginBottom:0,paddingBottom:0,border:'none' }}>
                <div className="card-icon card-icon-teal">♿</div>
                <div className="card-title">이용 가능 편의시설</div>
              </div>
              <div className="info-list">
                {data.facilities.split(/[,，、]/).map((f, i) => (
                  <div key={i} className="info-item">
                    <span className="info-item-icon">✅</span>
                    <span>{f.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 장애물 */}
          {data.obstacles && (
            <div className="info-card">
              <div className="card-header" style={{ marginBottom:0,paddingBottom:0,border:'none' }}>
                <div className="card-icon card-icon-orange">⚠️</div>
                <div className="card-title">주의할 장애물</div>
              </div>
              <div className="info-list">
                {data.obstacles.split(/[,，、]/).map((o, i) => (
                  <div key={i} className="info-item">
                    <span className="info-item-icon">🚧</span>
                    <span>{o.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button className="report-btn" onClick={() => setShowReport(true)}>🚨 경로 신고</button>
          <button className="reset-btn" onClick={onReset}>↩ 새로운 경로 검색</button>

          {/* 신고 모달 */}
          {showReport && (
            <div className="modal-overlay" onClick={() => setShowReport(false)}>
              <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <span>🚨 경로 오류 신고</span>
                  <button className="modal-close" onClick={() => setShowReport(false)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="modal-route-info">
                    📍 {data.start} → {data.destination}
                  </div>
                  <label className="modal-label">신고 유형</label>
                  <div className="modal-radio-group">
                    {['경로 오류', '장애물 정보 오류', '접근 불가', '기타'].map(t => (
                      <label key={t} className={`modal-radio ${reportType === t ? 'selected' : ''}`}>
                        <input type="radio" name="rtype" value={t} onChange={() => setReportType(t)} />
                        {t}
                      </label>
                    ))}
                  </div>
                  <label className="modal-label">상세 내용 (선택)</label>
                  <textarea
                    className="modal-textarea"
                    placeholder="어떤 문제가 있었나요?"
                    value={reportDetail}
                    onChange={e => setReportDetail(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="modal-footer">
                  <button className="modal-cancel" onClick={() => setShowReport(false)}>취소</button>
                  <button className="modal-submit" onClick={openReport} disabled={!reportType}>신고 제출 →</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [webhookUrl, setWebhookUrl] = useState(DEFAULT_WEBHOOK)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [showConfig, setShowConfig] = useState(false)
  const textareaRef = useRef(null)

  const handleQuickChip = (text) => {
    const stripped = text.replace(/^[^\s]+\s/, '')
    setInput(stripped)
    textareaRef.current?.focus()
  }

  const advanceStep = (step, delay = 800) =>
    new Promise(res => setTimeout(() => { setLoadingStep(step); res() }, delay))

  // ── 건물명 추출 (n8n 의존 없이 프론트에서 직접 처리) ──
  const BUILDINGS = [
    '백주년기념관','행파교수회관','눈꽃광장','중앙도서관',
    '미술대학','음악대학','약학대학','약학대',
    '학생회관','명신관','순헌관','행정관','새힘관','진리관','명재관',
    '기숙사','과학관','다목적관','창학관','프라임관','프라이관',
    '정문','도서관'
  ]

  const handleSubmit = async () => {
    if (!input.trim() || loading) return
    setLoading(true)
    setResult(null)
    setError(null)
    setLoadingStep(0)

    // 프론트에서 출발지/목적지 추출
    const txt = input.trim()
    let extractedStart = ''
    let extractedDestination = ''
    for (const b of BUILDINGS) {
      if (txt.includes(b + '에서')) { extractedStart = b; break }
    }
    for (const b of BUILDINGS) {
      if (b === extractedStart) continue
      if (txt.includes(b)) { extractedDestination = b; break }
    }

    // Solar가 확실히 인식하도록 구조화된 chatInput 생성
    let chatInput = txt
    if (extractedStart && extractedDestination) {
      chatInput = `출발지: ${extractedStart}, 목적지: ${extractedDestination}. 원본 요청: ${txt}`
    }

    console.log('🚀 [VeriWay] 전송:', { chatInput, start: extractedStart, destination: extractedDestination })

    try {
      await advanceStep(1, 600)
      await advanceStep(2, 800)

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatInput,
          start: extractedStart,
          destination: extractedDestination,
        }),
      })



      // 응답 텍스트를 먼저 읽어서 JSON 파싱 실패 시 원인 파악
      const rawText = await res.text()

      if (!res.ok) {
        throw new Error(`n8n 오류 (${res.status}): ${rawText.slice(0, 120)}`)
      }

      if (!rawText || rawText.trim() === '') {
        throw new Error('n8n이 빈 응답을 보냈어요. 워크플로우 실행 로그를 확인해주세요.')
      }

      let data
      try {
        data = JSON.parse(rawText)
        console.log('📥 [VeriWay] n8n 응답 전체:', data)
      } catch {
        // n8n이 JSON 배열로 응답하는 경우도 처리
        throw new Error(`응답 파싱 실패. n8n 응답: ${rawText.slice(0, 200)}`)
      }

      // n8n이 배열로 감싸서 응답하는 경우 첫 번째 항목 사용
      if (Array.isArray(data)) {
        data = data[0]
      }

      await advanceStep(3, 400)
      setResult(data)
    } catch (e) {
      if (e.message === 'Failed to fetch') {
        setError('n8n에 연결할 수 없어요. n8n이 실행 중인지, Webhook 노드가 "Listen for test event" 상태인지 확인해주세요.')
      } else {
        setError(e.message || '알 수 없는 오류가 발생했어요.')
      }
    } finally {
      setLoading(false)
      setLoadingStep(0)
    }
  }


  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon">♿</div>
            <span className="logo-text">VeriWay</span>
            <span className="logo-badge">BETA</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              className="reset-btn"
              style={{ marginTop: 0, fontSize: '11px', padding: '5px 12px' }}
              onClick={() => setShowConfig(v => !v)}
            >
              ⚙️ 설정
            </button>
            <div className="header-status">
              <div className="status-dot" />
              AI 온라인
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        {/* Config Bar */}
        {showConfig && (
          <div className="config-bar">
            <span className="config-label">🔗 웹훅 URL</span>
            <input
              className="config-input"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="/api/webhook  (또는 직접 n8n URL 입력)"
            />
          </div>
        )}

        {!result && !loading && (
          <>
            {/* Hero */}
            <section className="hero">
              <div className="hero-eyebrow">
                ♿ 배리어프리 이동경로
              </div>
              <h1 className="hero-title">
                누구나 편하게<br />
                <span className="gradient">이동할 권리</span>
              </h1>
              <p className="hero-desc">
                자연어로 말해주세요. AI가 당신의 이동 상태에 맞는
                최적의 배리어프리 경로를 안내해드려요.
              </p>

              {/* Quick Chips */}
              <div className="quick-chips">
                {QUICK_EXAMPLES.map((ex, i) => (
                  <button key={i} className="quick-chip" onClick={() => handleQuickChip(ex)}>
                    {ex}
                  </button>
                ))}
              </div>
            </section>

            {/* Search Box */}
            <section className="search-section">
              <div className="search-box">
                <div className="search-label">💬 어떻게 이동하실 예정인가요?</div>
                <textarea
                  ref={textareaRef}
                  className="search-input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="예) 학생회관에서 명신관까지 휠체어로 이동하고 싶어요..."
                  rows={3}
                />
                <div className="search-footer">
                  <span className="search-hint">
                    ↵ Enter로 검색 · Shift+Enter 줄바꿈
                  </span>
                  <button
                    className="search-btn"
                    onClick={handleSubmit}
                    disabled={!input.trim() || loading}
                    id="search-submit-btn"
                  >
                    {loading
                      ? <><div className="btn-spinner" /> 분석 중...</>
                      : <>🔍 경로 찾기</>
                    }
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Loading */}
        {loading && <LoadingCard step={loadingStep} />}

        {/* Error */}
        {error && !loading && (
          <div className="error-card">
            ⚠️ {error}
            <br/>
            <small style={{ opacity: 0.7 }}>n8n이 실행 중인지, 웹훅 URL이 올바른지 확인해주세요.</small>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <RouteResult data={result} onReset={() => { setResult(null); setInput('') }} />
        )}
      </main>

      <footer className="footer">
        VeriWay © 2026 · Team FIT · Powered by <a href="#">Upstage Solar AI</a> · 배리어프리 이동경로 서비스
      </footer>
    </div>
  )
}
