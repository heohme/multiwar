import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { io, Socket } from 'socket.io-client';
import { GameCard, getCardById, presetDecks } from '../data/cards';

// 游戏状态接口
interface GameState {
  id: string;
  status: 'waiting' | 'playing' | 'ended';
  turn: string;
  board: {
    player1: PlayerState;
    player2: PlayerState;
  };
}

// 玩家状态接口
interface PlayerState {
  hand: GameCard[] | { hidden: boolean }[];
  board: GameCard[];
  deck: GameCard[] | { count: number };
  hero: { health: number; armor: number };
  mana: { current: number; max: number };
  weapon?: GameCard;
}

// 游戏组件属性
interface GameProps {
  gameId: string;
  playerName: string;
  deckType: 'warrior' | 'mage';
  onGameEnd?: () => void;
}

// 创建样式组件
const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: #2c3e50;
  color: white;
  overflow: hidden;
  position: relative;
`;

const OpponentArea = styled.div`
  display: flex;
  flex-direction: column;
  height: 45%;
  padding: 10px;
  border-bottom: 2px solid #34495e;
`;

const PlayerArea = styled.div`
  display: flex;
  flex-direction: column;
  height: 45%;
  padding: 10px;
  border-top: 2px solid #34495e;
`;

const BoardArea = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 10%;
  background-color: #34495e;
  padding: 5px;
`;

const HandContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 40%;
  overflow-x: auto;
  padding: 5px;
`;

const BoardContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60%;
  padding: 5px;
`;

const HeroContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 80px;
  margin: 0 10px;
`;

const Card = styled.div<{ isPlayable: boolean }>`
  width: 80px;
  height: 120px;
  margin: 0 5px;
  background-color: ${props => props.isPlayable ? '#3498db' : '#7f8c8d'};
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 5px;
  cursor: ${props => props.isPlayable ? 'pointer' : 'default'};
  transition: transform 0.2s;
  
  &:hover {
    transform: ${props => props.isPlayable ? 'translateY(-10px)' : 'none'};
  }
`;

const MinionCard = styled.div<{ canAttack: boolean }>`
  width: 70px;
  height: 100px;
  margin: 0 5px;
  background-color: ${props => props.canAttack ? '#e74c3c' : '#95a5a6'};
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 5px;
  cursor: ${props => props.canAttack ? 'pointer' : 'default'};
  position: relative;
`;

const CardCost = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  background-color: #3498db;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
`;

const CardName = styled.div`
  font-size: 12px;
  text-align: center;
  margin-top: 20px;
`;

const CardStats = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: auto;
`;

const CardAttack = styled.div`
  background-color: #e74c3c;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
`;

const CardHealth = styled.div`
  background-color: #2ecc71;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
`;

const Hero = styled.div`
  width: 80px;
  height: 100px;
  background-color: #8e44ad;
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
`;

const HeroHealth = styled.div`
  background-color: #2ecc71;
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  position: absolute;
  bottom: 5px;
  right: 5px;
`;

const ManaContainer = styled.div`
  display: flex;
  align-items: center;
  margin: 10px;
`;

const ManaGem = styled.div<{ active: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: ${props => props.active ? '#3498db' : '#7f8c8d'};
  margin: 0 2px;
`;

const EndTurnButton = styled.button`
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 10px 20px;
  cursor: pointer;
  font-weight: bold;
  
  &:hover {
    background-color: #c0392b;
  }
`;

const StatusMessage = styled.div`
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 20px;
  border-radius: 5px;
  z-index: 10;
`;

// 游戏组件
const Game: React.FC<GameProps> = ({ gameId, playerName, deckType, onGameEnd }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerIndex, setPlayerIndex] = useState<number>(0);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [selectedMinion, setSelectedMinion] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // 连接Socket.io服务器
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);
    
    // 加入游戏
    newSocket.emit('joinGame', {
      gameId,
      playerName,
      deck: presetDecks[deckType].map(card => card.id)
    });
    
    // 监听游戏事件
    newSocket.on('gameJoined', (data) => {
      setPlayerIndex(data.playerIndex);
      setStatusMessage(`已加入游戏，等待对手...`);
    });
    
    newSocket.on('gameStarted', (data) => {
      setGameState(data.gameState);
      setStatusMessage(`游戏开始！${data.firstPlayer === newSocket.id ? '你' : '对手'}先手。`);
    });
    
    newSocket.on('gameUpdated', (data) => {
      setGameState(data);
      setSelectedCard(null);
      setSelectedMinion(null);
      
      if (data.turn === newSocket.id) {
        setStatusMessage('你的回合');
      } else {
        setStatusMessage('对手的回合');
      }
    });
    
    newSocket.on('gameEnded', (data) => {
      setGameState(data.gameState);
      setStatusMessage(`游戏结束！${data.winnerId === newSocket.id ? '你赢了！' : '你输了！'}`);
      
      // 延迟调用游戏结束回调
      setTimeout(() => {
        if (onGameEnd) onGameEnd();
      }, 3000);
    });
    
    newSocket.on('error', (data) => {
      setStatusMessage(`错误：${data.message}`);
      
      // 3秒后清除错误消息
      setTimeout(() => {
        setStatusMessage('');
      }, 3000);
    });
    
    newSocket.on('playerDisconnected', () => {
      setStatusMessage('对手已断开连接');
    });
    
    // 组件卸载时断开连接
    return () => {
      newSocket.disconnect();
    };
  }, [gameId, playerName, deckType, onGameEnd]);
  
  // 判断是否是当前玩家的回合
  const isPlayerTurn = gameState?.turn === socket?.id;
  
  // 获取当前玩家和对手的状态
  const getPlayerState = () => {
    if (!gameState || !playerIndex) return null;
    return gameState.board[`player${playerIndex}`];
  };
  
  const getOpponentState = () => {
    if (!gameState || !playerIndex) return null;
    const opponentIndex = playerIndex === 1 ? 2 : 1;
    return gameState.board[`player${opponentIndex}`];
  };
  
  // 处理出牌
  const handlePlayCard = (cardIndex: number) => {
    if (!isPlayerTurn || !socket) return;
    
    const playerState = getPlayerState();
    if (!playerState) return;
    
    const card = playerState.hand[cardIndex] as GameCard;
    
    // 检查法力值是否足够
    if (playerState.mana.current < card.cost) {
      setStatusMessage('法力值不足');
      setTimeout(() => setStatusMessage(''), 2000);
      return;
    }
    
    // 如果卡牌需要目标，选中卡牌等待选择目标
    if ((card.type === 'spell' && (card as any).targetRequired) || 
        (card.type === 'minion' && card.abilities?.includes('battlecry') && (card as any).battlecry?.targetRequired)) {
      setSelectedCard(cardIndex);
      setStatusMessage('选择一个目标');
    } else {
      // 直接打出卡牌
      socket.emit('playCard', {
        gameId,
        cardIndex,
        targetIndex: -1 // 无目标
      });
    }
  };
  
  // 处理选择目标
  const handleSelectTarget = (targetIndex: number, isHero: boolean = false) => {
    if (!isPlayerTurn || selectedCard === null || !socket) return;
    
    // 发送出牌请求
    socket.emit('playCard', {
      gameId,
      cardIndex: selectedCard,
      targetIndex: isHero ? -1 : targetIndex
    });
    
    // 重置选择状态
    setSelectedCard(null);
    setStatusMessage('');
  };
  
  // 处理随从攻击
  const handleMinionAttack = (minionIndex: number) => {
    if (!isPlayerTurn || !socket) return;
    
    const playerState = getPlayerState();
    if (!playerState) return;
    
    const minion = playerState.board[minionIndex];
    
    // 检查随从是否可以攻击
    if (minion.hasAttacked) {
      setStatusMessage('该随从本回合已经攻击过');
      setTimeout(() => setStatusMessage(''), 2000);
      return;
    }
    
    // 选中随从等待选择攻击目标
    setSelectedMinion(minionIndex);
    setStatusMessage('选择一个攻击目标');
  };
  
  // 处理选择攻击目标
  const handleSelectAttackTarget = (targetIndex: number, isHero: boolean = false) => {
    if (!isPlayerTurn || selectedMinion === null || !socket) return;
    
    // 发送攻击请求
    socket.emit('attack', {
      gameId,
      attackerIndex: selectedMinion,
      targetIndex: isHero ? -1 : targetIndex
    });
    
    // 重置选择状态
    setSelectedMinion(null);
    setStatusMessage('');
  };
  
  // 处理结束回合
  const handleEndTurn = () => {
    if (!isPlayerTurn || !socket) return;
    
    socket.emit('endTurn', { gameId });
  };
  
  // 渲染玩家手牌
  const renderPlayerHand = () => {
    const playerState = getPlayerState();
    if (!playerState) return null;
    
    return (
      <HandContainer>
        {(playerState.hand as GameCard[]).map((card, index) => (
          <Card 
            key={index} 
            isPlayable={isPlayerTurn && playerState.mana.current >= card.cost}
            onClick={() => handlePlayCard(index)}
          >
            <CardCost>{card.cost}</CardCost>
            <CardName>{card.name}</CardName>
            {card.type === 'minion' && (
              <CardStats>
                <CardAttack>{(card as any).attack}</CardAttack>
                <CardHealth>{(card as any).health}</CardHealth>
              </CardStats>
            )}
          </Card>
        ))}
      </HandContainer>
    );
  };
  
  // 渲染对手手牌
  const renderOpponentHand = () => {
    const opponentState = getOpponentState();
    if (!opponentState) return null;
    
    return (
      <HandContainer>
        {Array.isArray(opponentState.hand) && opponentState.hand.map((_, index) => (
          <Card key={index} isPlayable={false}>
            <CardName>对手手牌</CardName>
          </Card>
        ))}
      </HandContainer>
    );
  };
  
  // 渲染玩家战场
  const renderPlayerBoard = () => {
    const playerState = getPlayerState();
    if (!playerState) return null;
    
    return (
      <BoardContainer>
        {playerState.board.map((minion, index) => (
          <MinionCard 
            key={index} 
            canAttack={isPlayerTurn && !minion.hasAttacked}
            onClick={() => handleMinionAttack(index)}
          >
            <CardName>{minion.name}</CardName>
            <CardStats>
              <CardAttack>{minion.attack}</CardAttack>
              <CardHealth>{minion.health}</CardHealth>
            </CardStats>
          </MinionCard>
        ))}
      </BoardContainer>
    );
  };
  
  // 渲染对手战场
  const renderOpponentBoard = () => {
    const opponentState = getOpponentState();
    if (!opponentState) return null;
    
    return (
      <BoardContainer>
        {opponentState.board.map((minion, index) => (
          <MinionCard 
            key={index} 
            canAttack={false}
            onClick={() => {
              if (selectedCard !== null) {
                handleSelectTarget(index);
              } else if (selectedMinion !== null) {
                handleSelectAttackTarget(index);
              }
            }}
          >
            <CardName>{minion.name}</CardName>
            <CardStats>
              <CardAttack>{minion.attack}</CardAttack>
              <CardHealth>{minion.health}</CardHealth>
            </CardStats>
          </MinionCard>
        ))}
      </BoardContainer>
    );
  };
  
  // 渲染玩家英雄
  const renderPlayerHero = () => {
    const playerState = getPlayerState();
    if (!playerState) return null;
    
    return (
      <HeroContainer>
        <Hero>
          <HeroHealth>{playerState.hero.health}</HeroHealth>
        </Hero>
      </HeroContainer>
    );
  };
  
  // 渲染对手英雄
  const renderOpponentHero = () => {
    const opponentState = getOpponentState();
    if (!opponentState) return null;
    
    return (
      <HeroContainer>
        <Hero onClick={() => {
          if (selectedCard !== null) {
            handleSelectTarget(-1, true);
          } else if (selectedMinion !== null) {
            handleSelectAttackTarget(-1, true);
          }
        }}>
          <HeroHealth>{opponentState.hero.health}</HeroHealth>
        </Hero>
      </HeroContainer>
    );
  };
  
  // 渲染法力水晶
  const renderMana = () => {
    const playerState = getPlayerState();
    if (!playerState) return null;
    
    const { current, max } = playerState.mana;
    
    return (
      <ManaContainer>
        {Array.from({ length: 10 }).map((_, index) => (
          <ManaGem 
            key={index} 
            active={index < current} 
          />
        ))}
        <div style={{ marginLeft: '5px' }}>{current}/{max}</div>
      </ManaContainer>
    );
  };
  
  return (
    <GameContainer>
      {statusMessage && <StatusMessage>{statusMessage}</StatusMessage>}
      
      <OpponentArea>
        {renderOpponentHand()}
        {renderOpponentBoard()}
        {renderOpponentHero()}
      </OpponentArea>
      
      <BoardArea>
        {/* 中央区域，可以显示游戏状态或其他信息 */}
      </BoardArea>
      
      <PlayerArea>
        {renderPlayerHero()}
        {renderPlayerBoard()}
        {renderPlayerHand()}
        {renderMana()}
      </PlayerArea>
      
      {isPlayerTurn && (
        <EndTurnButton onClick={handleEndTurn}>
          结束回合
        </EndTurnButton>
      )}
    </GameContainer>
  );
};

export default Game;