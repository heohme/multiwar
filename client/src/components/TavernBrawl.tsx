import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { io, Socket } from 'socket.io-client';
import { GameCard } from '../data/cards';
import BattleSimulation from './BattleSimulation';
import { MinionCard } from '../types/gameTypes';

// 酒馆战棋状态接口
interface TavernState {
  id: string;
  status: 'recruiting' | 'battling' | 'ended';
  turn: number;
  players: {
    [key: string]: TavernPlayerState;
  };
  currentPhase: 'recruit' | 'battle';
  round: number;
}

// 酒馆玩家状态接口
interface TavernPlayerState {
  name: string;
  health: number;
  gold: number;
  tavernTier: number;
  board: MinionCard[];
  hand: MinionCard[];
  availableMinions: MinionCard[];
  lastBattleResult?: 'win' | 'loss' | 'tie';
}

// 随从卡牌接口
interface MinionCardInterface {
  id: string;
  name: string;
  attack: number;
  health: number;
  tier: number;
  abilities?: string[];
  tribe?: 'beast' | 'demon' | 'dragon' | 'elemental' | 'mech' | 'murloc' | 'pirate';
  battlecry?: any;
  deathrattle?: any;
  cost?: number;
}

// 酒馆战棋组件属性
interface TavernBrawlProps {
  playerName: string;
  onGameEnd?: () => void;
}

// 样式组件
const TavernContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: #2c3e50;
  color: white;
  overflow: hidden;
  position: relative;
`;

const StatusBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: #34495e;
  border-bottom: 2px solid #2c3e50;
`;

const RecruitArea = styled.div`
  display: flex;
  flex-direction: column;
  height: 70%;
  padding: 10px;
`;

const TavernMinions = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 150px;
  margin: 10px 0;
  overflow-x: auto;
`;

const PlayerBoard = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 150px;
  margin: 10px 0;
  overflow-x: auto;
`;

const ControlPanel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: #34495e;
  border-top: 2px solid #2c3e50;
`;

const MinionCardStyled = styled.div<{ tier: number, isPlayable: boolean }>`
  width: 80px;
  height: 120px;
  margin: 0 5px;
  background-color: ${props => {
    // 根据随从等级设置不同的背景色
    switch(props.tier) {
      case 1: return '#95a5a6';
      case 2: return '#3498db';
      case 3: return '#2ecc71';
      case 4: return '#f1c40f';
      case 5: return '#e67e22';
      case 6: return '#9b59b6';
      default: return '#95a5a6';
    }
  }};
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

const TierBadge = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  background-color: #f39c12;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
`;

const Button = styled.button`
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 8px 15px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: #c0392b;
  }
  
  &:disabled {
    background-color: #7f8c8d;
    cursor: not-allowed;
  }
`;

const GoldDisplay = styled.div`
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: bold;
`;

const GoldCoin = styled.div`
  width: 20px;
  height: 20px;
  background-color: #f1c40f;
  border-radius: 50%;
  margin-right: 5px;
`;

const HealthDisplay = styled.div`
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: bold;
`;

const HealthIcon = styled.div`
  width: 20px;
  height: 20px;
  background-color: #e74c3c;
  border-radius: 50%;
  margin-right: 5px;
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

// 随从池（简化版）
const minionPool: { [key: number]: MinionCardInterface[] } = {
  1: [
    { id: '1', name: '微型机器人', attack: 1, health: 2, tier: 1, tribe: 'mech' },
    { id: '2', name: '淤泥爬行者', attack: 1, health: 2, tier: 1, tribe: 'murloc' },
    { id: '3', name: '暴怒的狼人', attack: 2, health: 2, tier: 1 },
    { id: '4', name: '石塘猎人', attack: 2, health: 3, tier: 1, tribe: 'beast' },
    { id: '5', name: '火焰小鬼', attack: 3, health: 2, tier: 1, tribe: 'demon' },
  ],
  2: [
    { id: '6', name: '收割者', attack: 2, health: 3, tier: 2, tribe: 'mech' },
    { id: '7', name: '鱼人猎潮者', attack: 2, health: 3, tier: 2, tribe: 'murloc' },
    { id: '8', name: '噬骨鬣狗', attack: 2, health: 4, tier: 2, tribe: 'beast' },
    { id: '9', name: '恶魔卫士', attack: 3, health: 4, tier: 2, tribe: 'demon' },
    { id: '10', name: '火山幼龙', attack: 3, health: 3, tier: 2, tribe: 'dragon' },
  ],
  3: [
    { id: '11', name: '铁甲恶犬', attack: 4, health: 4, tier: 3, tribe: 'mech' },
    { id: '12', name: '鱼人领军', attack: 3, health: 3, tier: 3, tribe: 'murloc' },
    { id: '13', name: '丛林猎手', attack: 4, health: 5, tier: 3, tribe: 'beast' },
    { id: '14', name: '深渊领主', attack: 5, health: 4, tier: 3, tribe: 'demon' },
    { id: '15', name: '青铜守卫', attack: 4, health: 5, tier: 3, tribe: 'dragon' },
  ],
};

// 酒馆战棋组件
const TavernBrawl: React.FC<TavernBrawlProps> = ({ playerName, onGameEnd }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [tavernState, setTavernState] = useState<TavernState | null>(null);
  const [playerState, setPlayerState] = useState<TavernPlayerState | null>(null);
  const [selectedHandMinion, setSelectedHandMinion] = useState<number | null>(null);
  const [selectedBoardMinion, setSelectedBoardMinion] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // 连接Socket.io服务器
  useEffect(() => {
    // 在实际实现中，这里应该连接到服务器
    // 但现在我们先模拟本地状态
    initLocalGameState();
    
    return () => {
      // 清理函数
    };
  }, [playerName]);
  
  // 初始化本地游戏状态（模拟）
  const initLocalGameState = () => {
    // 创建初始玩家状态
    const initialPlayerState: TavernPlayerState = {
      name: playerName,
      health: 30,
      gold: 3,
      tavernTier: 1,
      board: [],
      hand: [],
      availableMinions: getRandomMinions(1, 3), // 获取3个1级随从
    };
    
    // 创建初始游戏状态
    const initialTavernState: TavernState = {
      id: 'local-game',
      status: 'recruiting',
      turn: 1,
      players: {
        [playerName]: initialPlayerState
      },
      currentPhase: 'recruit',
      round: 1
    };
    
    setTavernState(initialTavernState);
    setPlayerState(initialPlayerState);
    setStatusMessage('招募阶段开始！');
  };
  
  // 获取随机随从
  const getRandomMinions = (tier: number, count: number): MinionCard[] => {
    const availableTiers = Object.keys(minionPool)
      .map(Number)
      .filter(t => t <= tier);
    
    const result: MinionCard[] = [];
    
    for (let i = 0; i < count; i++) {
      // 随机选择一个可用的等级
      const randomTier = availableTiers[Math.floor(Math.random() * availableTiers.length)];
      // 从该等级的随从池中随机选择一个随从
      const tierPool = minionPool[randomTier];
      const randomMinion = tierPool[Math.floor(Math.random() * tierPool.length)];
      
      // 创建随从的副本（避免引用相同对象）
      result.push({...randomMinion});
    }
    
    return result;
  };
  
  // 刷新酒馆
  const refreshTavern = () => {
    if (!playerState) return;
    
    // 检查金币是否足够
    if (playerState.gold < 1) {
      setStatusMessage('金币不足！');
      setTimeout(() => setStatusMessage(''), 2000);
      return;
    }
    
    // 更新玩家状态
    const updatedPlayerState = {
      ...playerState,
      gold: playerState.gold - 1,
      availableMinions: getRandomMinions(playerState.tavernTier, 3)
    };
    
    setPlayerState(updatedPlayerState);
    
    // 更新游戏状态
    if (tavernState) {
      const updatedTavernState = {
        ...tavernState,
        players: {
          ...tavernState.players,
          [playerName]: updatedPlayerState
        }
      };
      
      setTavernState(updatedTavernState);
    }
  };
  
  // 购买随从
  const buyMinion = (index: number) => {
    if (!playerState) return    // 检查金币是否足够
    if (playerState.gold < 3) {
      setStatusMessage('金币不足！');
      setTimeout(() => setStatusMessage(''), 2000);
      return;
    }
    
    // 检查随从是否存在
    if (!playerState.availableMinions[index]) {
      return;
    }
    
    const minion = playerState.availableMinions[index];
    
    // 更新玩家状态
    const updatedPlayerState = {
      ...playerState,
      gold: playerState.gold - 3,
      hand: [...playerState.hand, minion],
      availableMinions: playerState.availableMinions.filter((_, i) => i !== index)
    };
    
    setPlayerState(updatedPlayerState);
    
    // 更新游戏状态
    if (tavernState) {
      const updatedTavernState = {
        ...tavernState,
        players: {
          ...tavernState.players,
          [playerName]: updatedPlayerState
        }
      };
      
      setTavernState(updatedTavernState);
    }
  };
  
  // 升级酒馆等级
  const upgradeTavernTier = () => {
    if (!playerState) return;
    
    // 检查是否已经达到最高等级
    if (playerState.tavernTier >= 6) {
      setStatusMessage('已达到最高酒馆等级！');
      setTimeout(() => setStatusMessage(''), 2000);
      return;
    }
    
    // 计算升级费用
    const upgradeCost = Math.max(5 - playerState.tavernTier, 0);
    
    // 检查金币是否足够
    if (playerState.gold < upgradeCost) {
      setStatusMessage('金币不足！');
      setTimeout(() => setStatusMessage(''), 2000);
      return;
    }
    
    // 更新玩家状态
    const updatedPlayerState = {
      ...playerState,
      gold: playerState.gold - upgradeCost,
      tavernTier: playerState.tavernTier + 1
    };
    
    setPlayerState(updatedPlayerState);
    
    // 更新游戏状态
    if (tavernState) {
      const updatedTavernState = {
        ...tavernState,
        players: {
          ...tavernState.players,
          [playerName]: updatedPlayerState
        }
      };
      
      setTavernState(updatedTavernState);
    }
    
    setStatusMessage(`酒馆升级到 ${playerState.tavernTier + 1} 级！`);
    setTimeout(() => setStatusMessage(''), 2000);
  };
  
  // 放置随从到战场
  const playMinionToBoard = (handIndex: number) => {
    if (!playerState) return;
    
    // 检查战场是否已满
    if (playerState.board.length >= 7) {
      setStatusMessage('战场已满！');
      setTimeout(() => setStatusMessage(''), 2000);
      return;
    }
    
    const minion = playerState.hand[handIndex];
    
    // 更新玩家状态
    const updatedPlayerState = {
      ...playerState,
      board: [...playerState.board, minion],
      hand: playerState.hand.filter((_, i) => i !== handIndex)
    };
    
    setPlayerState(updatedPlayerState);
    
    // 更新游戏状态
    if (tavernState) {
      const updatedTavernState = {
        ...tavernState,
        players: {
          ...tavernState.players,
          [playerName]: updatedPlayerState
        }
      };
      
      setTavernState(updatedTavernState);
    }
  };
  
  // 生成对手随从
  const generateOpponentBoard = (round: number): MinionCard[] => {
    // 根据回合数生成对手随从，回合数越高，随从越强
    const opponentMinions: MinionCard[] = [];
    const minionCount = Math.min(Math.floor(round / 2) + 1, 7); // 随从数量随回合增加，最多7个
    
    // 计算对手可用的随从等级
    const maxTier = Math.min(Math.ceil(round / 2), 3); // 回合越高，可用的随从等级越高
    
    for (let i = 0; i < minionCount; i++) {
      // 随机选择随从等级，偏向于较高等级
      const tier = Math.min(Math.ceil(Math.random() * maxTier), 3);
      const tierPool = minionPool[tier];
      const randomMinion = tierPool[Math.floor(Math.random() * tierPool.length)];
      
      // 创建随从的副本
      opponentMinions.push({...randomMinion});
    }
    
    return opponentMinions;
  };
  
  // 添加战斗状态
  const [showBattle, setShowBattle] = useState(false);
  const [opponentBattleBoard, setOpponentBattleBoard] = useState<MinionCard[]>([]);
  
  // 结束回合
  const endTurn = () => {
    if (!playerState || !tavernState) return;
    
    // 模拟战斗阶段
    setStatusMessage('战斗阶段开始...');
    
    // 生成对手的随从
    const opponentBoard = generateOpponentBoard(tavernState.round);
    setOpponentBattleBoard(opponentBoard);
    
    // 显示战斗模拟组件
    setShowBattle(true);
  };
  
  // 处理战斗结束
  const handleBattleEnd = (result: 'win' | 'loss' | 'tie', damage: number) => {
    if (!playerState || !tavernState) return;
    
    // 隐藏战斗模拟组件
    setShowBattle(false);
    
    // 根据战斗结果更新玩家状态
    let healthChange = result === 'loss' ? -damage : 0;
    
    // 更新玩家状态
    const updatedPlayerState = {
      ...playerState,
      health: playerState.health + healthChange,
      gold: Math.min(tavernState.round + 2, 10), // 每回合金币上限增加
      lastBattleResult: result
    };
    
    // 检查游戏是否结束
    if (updatedPlayerState.health <= 0) {
      setStatusMessage('游戏结束！你被击败了！');
      setTimeout(() => {
        if (onGameEnd) onGameEnd();
      }, 3000);
      return;
    }
    
    setPlayerState(updatedPlayerState);
    
    // 更新游戏状态，进入下一回合
    const updatedTavernState = {
      ...tavernState,
      round: tavernState.round + 1,
      players: {
        ...tavernState.players,
        [playerName]: updatedPlayerState
      }
    };
    
    setTavernState(updatedTavernState);
    
    // 回到招募阶段
    setStatusMessage(`第 ${updatedTavernState.round} 回合招募阶段开始！`);
    // 刷新酒馆随从
    refreshTavern();
  };
  
  // 渲染酒馆随从
  const renderTavernMinions = () => {
    if (!playerState) return null;
    
    return (
      <TavernMinions>
        {playerState.availableMinions.map((minion, index) => (
          <MinionCardStyled 
            key={index} 
            tier={minion.tier}
            isPlayable={playerState.gold >= 3}
            onClick={() => buyMinion(index)}
          >
            <CardName>{minion.name}</CardName>
            <CardStats>
              <CardAttack>{minion.attack}</CardAttack>
              <CardHealth>{minion.health}</CardHealth>
            </CardStats>
            <TierBadge>{minion.tier}</TierBadge>
          </MinionCardStyled>
        ))}
      </TavernMinions>
    );
  };
  
  // 渲染玩家手牌
  const renderPlayerHand = () => {
    if (!playerState) return null;
    
    return (
      <TavernMinions>
        {playerState.hand.map((minion, index) => (
          <MinionCardStyled 
            key={index} 
            tier={minion.tier}
            isPlayable={true}
            onClick={() => playMinionToBoard(index)}
          >
            <CardName>{minion.name}</CardName>
            <CardStats>
              <CardAttack>{minion.attack}</CardAttack>
              <CardHealth>{minion.health}</CardHealth>
            </CardStats>
            <TierBadge>{minion.tier}</TierBadge>
          </MinionCardStyled>
        ))}
      </TavernMinions>
    );
  };
  
  // 渲染玩家战场
  const renderPlayerBoard = () => {
    if (!playerState) return null;
    
    return (
      <PlayerBoard>
        {playerState.board.map((minion, index) => (
          <MinionCardStyled 
            key={index} 
            tier={minion.tier}
            isPlayable={false}
          >
            <CardName>{minion.name}</CardName>
            <CardStats>
              <CardAttack>{minion.attack}</CardAttack>
              <CardHealth>{minion.health}</CardHealth>
            </CardStats>
            <TierBadge>{minion.tier}</TierBadge>
          </MinionCardStyled>
        ))}
      </PlayerBoard>
    );
  };
  
  return (
    <TavernContainer>
      {statusMessage && <StatusMessage>{statusMessage}</StatusMessage>}
      
      {/* 当showBattle为true时显示战斗模拟组件 */}
      {showBattle && playerState && (
        <BattleSimulation
          playerBoard={playerState.board}
          opponentBoard={opponentBattleBoard}
          onBattleEnd={handleBattleEnd}
          round={tavernState?.round || 1}
        />
      )}
      
      {/* 只有在不显示战斗时才显示酒馆界面 */}
      {!showBattle && (
        <>
          <StatusBar>
            <HealthDisplay>
              <HealthIcon />
              {playerState?.health || 0}
            </HealthDisplay>
            
            <div>回合: {tavernState?.round || 1}</div>
            
            <GoldDisplay>
              <GoldCoin />
              {playerState?.gold || 0}
            </GoldDisplay>
          </StatusBar>
          
          <RecruitArea>
            <h3>酒馆 (等级 {playerState?.tavernTier || 1})</h3>
            {renderTavernMinions()}
            
            <h3>手牌</h3>
            {renderPlayerHand()}
            
            <h3>战场</h3>
            {renderPlayerBoard()}
          </RecruitArea>
          
          <ControlPanel>
            <Button onClick={refreshTavern} disabled={!playerState || playerState.gold < 1}>
              刷新 (1金币)
            </Button>
            
            <Button onClick={upgradeTavernTier} disabled={!playerState || playerState.gold < Math.max(5 - (playerState?.tavernTier || 0), 0) || (playerState?.tavernTier || 0) >= 6}>
              升级酒馆 ({playerState ? Math.max(5 - playerState.tavernTier, 0) : 0}金币)
            </Button>
            
            <Button onClick={endTurn}>
              结束回合
            </Button>
          </ControlPanel>
        </>
      )}
    </TavernContainer>
  );
};

export default TavernBrawl;