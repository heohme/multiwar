import React, { useState } from 'react';
import styled from 'styled-components';
import TavernBrawl from './components/TavernBrawl';
import './App.css';

// 样式组件
const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #2c3e50;
  color: white;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 2rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
`;

const Card = styled.div`
  background-color: #34495e;
  border-radius: 10px;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
`;

const Button = styled.button`
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 0.8rem 1.5rem;
  font-size: 1rem;
  margin: 0.5rem;
  cursor: pointer;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: #c0392b;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.8rem;
  margin: 0.5rem 0;
  border-radius: 5px;
  border: none;
  font-size: 1rem;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 1rem;
`;

const ErrorMessage = styled.div`
  color: #e74c3c;
  margin-top: 1rem;
  text-align: center;
`;

// 应用组件
function App() {
  const [screen, setScreen] = useState<'home' | 'tavern' | 'game'>('home');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  
  // 返回主页
  const handleBackToHome = () => {
    setScreen('home');
    setError('');
  };
  
  // 游戏结束处理
  const handleGameEnd = () => {
    setScreen('home');
  };
  
  // 渲染主页
  const renderHome = () => (
    <Card>
      <Title>酒馆战棋</Title>
      <ButtonContainer>
        <Button onClick={() => setScreen('tavern')}>进入酒馆</Button>
      </ButtonContainer>
    </Card>
  );
  
  // 渲染酒馆战棋页面
  const renderTavern = () => (
    <Card>
      <h2>酒馆战棋</h2>
      <Input 
        type="text" 
        placeholder="输入玩家名称" 
        value={playerName} 
        onChange={(e) => setPlayerName(e.target.value)} 
      />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <ButtonContainer>
        <Button onClick={handleBackToHome}>返回</Button>
        <Button onClick={() => {
          if (!playerName) {
            setError('请输入玩家名称');
            return;
          }
          setScreen('game');
        }}>开始游戏</Button>
      </ButtonContainer>
    </Card>
  );
  
  // 渲染游戏界面
  const renderGame = () => (
    <TavernBrawl 
      playerName={playerName}
      onGameEnd={handleGameEnd}
    />
  );
  
  // 根据当前屏幕渲染不同内容
  const renderScreen = () => {
    switch (screen) {
      case 'home':
        return renderHome();
      case 'tavern':
        return renderTavern();
      case 'game':
        return renderGame();
      default:
        return renderHome();
    }
  };
  
  return (
    <AppContainer>
      {renderScreen()}
    </AppContainer>
  );
}

export default App;
