import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import MapArea from './components/MapArea';

function App() {
  const [currentRoute, setCurrentRoute] = useState(null);

  const handleRouteFound = (routeData) => {
    setCurrentRoute(routeData);
  };

  return (
    <div className="layout-container">
      <ChatInterface onRouteFound={handleRouteFound} />
      <MapArea routeData={currentRoute} />
    </div>
  );
}

export default App;
