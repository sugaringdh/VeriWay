import React, { useState, useRef, useEffect } from 'react';
import { Send, Map, Loader2 } from 'lucide-react';

const ChatInterface = ({ onRouteFound }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: '안녕하세요! 숙명여자대학교 배리어프리 길안내 서비스 VeriWay입니다.\n어디로 가시나요? 이동 상황(예: 휠체어, 목발, 캐리어)을 함께 말씀해주시면 최적의 경로를 찾아드릴게요!',
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Mock API Call delay
    setTimeout(() => {
      // Mock n8n logic processing based on JSON specification
      const response = generateMockResponse(userMessage.text);
      
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        content: response.content
      }]);
      setIsLoading(false);
      
      if (response.routeData) {
        onRouteFound(response.routeData);
      }
    }, 2000); // 2 seconds delay to simulate LLM and n8n webhook
  };

  // Format AI response with Markdown-like structure based on n8n JSON
  const renderMessageText = (msg) => {
    if (msg.sender === 'user') return msg.text;
    
    if (msg.content) {
      return (
        <div>
          {msg.content.analysis && (
            <div>
              <div className="section-title">[이동 조건 분석]</div>
              <p>{msg.content.analysis}</p>
            </div>
          )}
          {msg.content.route && (
            <div>
              <div className="section-title">[추천 경로]</div>
              <p>{msg.content.route}</p>
            </div>
          )}
          {msg.content.facilities && (
            <div>
              <div className="section-title">[장애물 및 편의시설]</div>
              <p>{msg.content.facilities}</p>
            </div>
          )}
          {msg.content.indoorTip && (
            <div>
              <div className="section-title">[건물 내부 이동 팁]</div>
              <p>{msg.content.indoorTip}</p>
            </div>
          )}
        </div>
      );
    }
    
    // Fallback for initial string message
    return msg.text.split('\n').map((line, i) => (
      <p key={i}>{line}</p>
    ));
  };

  return (
    <div className="sidebar glass">
      <div className="app-title">
        <Map className="title-icon" color="var(--primary-color)" size={28} />
        Veri<span>Way</span>
      </div>
      
      <div className="chat-box">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            {renderMessageText(msg)}
          </div>
        ))}
        
        {isLoading && (
          <div className="typing-indicator">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="input-area">
        <input 
          type="text" 
          placeholder="예: 학생회관에서 중앙도서관까지 휠체어로..." 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
        />
        <button className="send-btn" onClick={handleSend} disabled={!input.trim() || isLoading}>
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </div>
    </div>
  );
};

// Mock function representing the n8n logic flow
function generateMockResponse(userInput) {
  if (userInput.includes('학생회관') && userInput.includes('도서관') && (userInput.includes('휠체어') || userInput.includes('유모차') || userInput.includes('캐리어'))) {
    return {
      content: {
        analysis: "출발지는 학생회관, 목적지는 중앙도서관이며 휠체어 이용 중이시군요. 계단을 피하고 엘리베이터와 평탄한 보도가 포함된 경로를 추천해드릴게요.",
        route: "학생회관 경사로 출입구 → 완만한 외부 보행로 → 중앙도서관 엘리베이터 출입구",
        facilities: "경사로, 엘리베이터, 평탄한 보도를 이용할 수 있습니다. 일부 경사 구간이 있으니 주의하세요.",
        indoorTip: "중앙도서관 내부 층 이동은 엘리베이터 이용을 권장합니다."
      },
      routeData: {
        startName: "학생회관",
        startCoords: [37.5458, 126.9650], 
        endName: "중앙도서관",
        endCoords: [37.5446, 126.9660],
        path: [[37.5458, 126.9650], [37.5452, 126.9655], [37.5446, 126.9660]]
      }
    };
  } else if (userInput.includes('목발') || userInput.includes('부상')) {
    return {
      content: {
        analysis: "출발지는 학생회관, 목적지는 순헌관이며 목발을 사용 중이시군요. 계단이 없는 완만한 경로를 안내합니다.",
        route: "학생회관 엘리베이터 이용 → 외부 완만한 경사로 → 순헌관 측면 출입구",
        facilities: "엘리베이터와 경사로를 이용할 수 있습니다. 비 오는 날 미끄럼 위험과 언덕 구간을 주의하세요.",
        indoorTip: "순헌관 내부 이동 시 계단 대신 엘리베이터를 이용하세요."
      },
      routeData: {
        startName: "학생회관",
        startCoords: [37.5458, 126.9650],
        endName: "순헌관",
        endCoords: [37.5450, 126.9635],
        path: [[37.5458, 126.9650], [37.5455, 126.9642], [37.5450, 126.9635]]
      }
    };
  } else {
    return {
      content: {
        analysis: "입력해주신 정보를 분석했습니다.",
        route: "현재 데모에서는 '학생회관'에서 '중앙도서관' 또는 '순헌관'으로 가는 경로 위주로 확인 가능합니다.",
        facilities: "출발지와 목적지를 정확하게 말씀해주시면 알맞은 경로를 찾아드릴게요."
      },
      routeData: null
    };
  }
}

export default ChatInterface;
