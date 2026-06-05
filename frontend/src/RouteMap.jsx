import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getBuildingCoords } from './buildings.js'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// 번호 마커 아이콘 생성
const createNumberedIcon = (index, total, label) => {
  const isFirst = index === 0
  const isLast  = index === total - 1
  const bg = isFirst ? '#7c5aff' : isLast ? '#00d4aa' : '#ff9f43'
  const emoji = isFirst ? '🚩' : isLast ? '🏁' : `${index}`

  return L.divIcon({
    className: '',
    html: `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
      ">
        <div style="
          background: ${bg};
          border: 2.5px solid white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isFirst || isLast ? '15px' : '12px'};
          font-weight: 700;
          color: white;
          box-shadow: 0 3px 10px rgba(0,0,0,0.4);
          flex-shrink: 0;
        ">${emoji}</div>
        <div style="
          background: rgba(10,12,20,0.88);
          border: 1px solid ${bg};
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 10px;
          margin-top: 3px;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          max-width: 90px;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: 'Pretendard', sans-serif;
        ">${label}</div>
      </div>
    `,
    iconSize: [32, 56],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
  })
}

/**
 * 좌표 문자열 파싱
 * [[37.54,126.96],[37.54,126.96]] 형식
 */
function parseCoordinates(raw) {
  if (!raw) return []
  const str = String(raw).trim()
  if (str.startsWith('[[')) {
    try {
      const parsed = JSON.parse(str)
      if (Array.isArray(parsed)) {
        return parsed
          .map(p => Array.isArray(p) ? [parseFloat(p[0]), parseFloat(p[1])] : null)
          .filter(p => p && !isNaN(p[0]) && !isNaN(p[1]))
      }
    } catch {
      const matches = [...str.matchAll(/\[([0-9.]+),([0-9.]+)\]/g)]
      return matches.map(m => [parseFloat(m[1]), parseFloat(m[2])])
    }
  }
  if (str.includes('|')) {
    return str.split('|').map(s => {
      const [lat, lng] = s.trim().split(',').map(parseFloat)
      return (!isNaN(lat) && !isNaN(lng)) ? [lat, lng] : null
    }).filter(Boolean)
  }
  const parts = str.split(',')
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0])
    const lng = parseFloat(parts[1])
    if (!isNaN(lat) && !isNaN(lng)) return [[lat, lng]]
  }
  return []
}

/**
 * 경로 설명 파싱
 * "명신관 ->새힘관 -> 행정관 -> 정문" → ["명신관","새힘관","행정관","정문"]
 */
function parseRouteSteps(description) {
  if (!description) return []
  return description
    .split(/->|→|>/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

export default function RouteMap({ coordinates, routeDescription, pathStops, startLabel, endLabel }) {
  const mapRef      = useRef(null)
  const mapInstance = useRef(null)

  // 경로 단계: pathStops(Dijkstra 배열) 우선, 없으면 routeDescription 파싱
  const steps = pathStops && pathStops.length > 0
    ? pathStops
    : parseRouteSteps(routeDescription)

  // 좌표 결정:
  // 1순위 - 시트의 지도좌표 컬럼 (명시적 좌표)
  // 2순위 - buildings.js 자동 조회 (경로 설명 → 건물명 → 좌표)
  let points = parseCoordinates(coordinates)

  if (points.length === 0 && steps.length > 0) {
    // buildings.js 에서 각 경유지 좌표 자동 조회
    const looked = steps
      .map(step => getBuildingCoords(step))
      .filter(Boolean)
    if (looked.length > 0) points = looked
  }

  const center = points.length > 0 ? points[Math.floor(points.length / 2)] : null

  useEffect(() => {
    if (!mapRef.current || points.length === 0) return

    if (mapInstance.current) {
      mapInstance.current.remove()
      mapInstance.current = null
    }

    const map = L.map(mapRef.current, { center, zoom: 17, zoomControl: true })
    mapInstance.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    // 경로 배경 라인 (글로우)
    if (points.length >= 2) {
      L.polyline(points, {
        color: 'rgba(124,90,255,0.18)',
        weight: 12,
        lineJoin: 'round',
      }).addTo(map)

      // 경로 메인 라인
      L.polyline(points, {
        color: '#7c5aff',
        weight: 4,
        opacity: 0.9,
        dashArray: '10, 6',
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(map)
    }

    // 각 지점 마커 (좌표 ↔ 경로 이름 1:1 매핑)
    points.forEach((pt, i) => {
      // 경로 설명에서 이름 가져오기, 없으면 순번으로 표시
      const label = steps[i] || (i === 0 ? (startLabel || '출발') : i === points.length - 1 ? (endLabel || '도착') : `경유${i}`)

      const icon = createNumberedIcon(i, points.length, label)

      L.marker(pt, { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:'Pretendard',sans-serif;min-width:120px;">
            <div style="font-size:13px;font-weight:700;color:#7c5aff;margin-bottom:4px;">
              ${i === 0 ? '🚩 출발' : i === points.length - 1 ? '🏁 도착' : `📍 경유 ${i}`}
            </div>
            <div style="font-size:14px;font-weight:600;">${label}</div>
          </div>
        `, { maxWidth: 200 })
    })

    // 전체 경로 보이도록 범위 맞춤
    map.fitBounds(points, { padding: [52, 52] })

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [coordinates, routeDescription])

  if (points.length === 0) {
    return (
      <div className="map-placeholder">
        <div className="map-placeholder-icon">🗺️</div>
        <div className="map-placeholder-text">
          좌표 데이터가 없거나 형식이 달라요<br />
          <small style={{ opacity: 0.6 }}>
            <b>지도좌표</b> 컬럼: <code>[[위도,경도],[위도,경도]]</code>
          </small>
        </div>
      </div>
    )
  }

  return (
    <div className="route-map-wrapper">
      <div ref={mapRef} className="route-map" />

      {/* 가로 타임라인 경유지 */}
      {steps.length > 0 && (
        <div className="map-timeline">
          {points.map((_, i) => {
            const label = steps[i] || `${i + 1}`
            const isFirst = i === 0
            const isLast  = i === points.length - 1
            const dotColor = isFirst ? '#7c5aff' : isLast ? '#00d4aa' : '#ff9f43'
            return (
              <div key={i} className="map-tl-item">
                {/* 왼쪽 연결선 */}
                {i > 0 && <div className="map-tl-line" style={{
                  background: `linear-gradient(90deg, ${points[i-1] ? (i-1===0?'#7c5aff':'#ff9f43') : '#ff9f43'}, ${dotColor})`
                }} />}
                <div className="map-tl-stop">
                  <div className="map-tl-dot" style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}55` }}>
                    {isFirst ? '🚩' : isLast ? '🏁' : i}
                  </div>
                  <span className="map-tl-label">{label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
