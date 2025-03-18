import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { MinionCard as MinionCardType } from '../types/gameTypes';

// 战斗模拟组件属性
interface BattleSimulationProps {
  playerBoard: MinionCardType[];
  opponentBoard: MinionCardType[];
  onBattleEnd: (result: 'win' | 'loss' | 'tie', damage: number) => void;
  round: number;
}

// 战斗日志项
interface BattleLogItem {
  text: string;
  timestamp: number;
}

// 动画关键帧
const shake = keyframes`
  0% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-5px); }
  100% { transform: translateX(0); }
`;

const flash = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`;

const floatUp = keyframes`
  0% { transform: translate(-50%, -50%); opacity: 1; }
  100% { transform: translate(-50%, -100%); opacity: 0; }
`;

const attackMove = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0); }
`;

// 样式组件
const BattleContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  position: absolute;
  top: 0;
  left: 0;
  z-index: 100;
  color: white;
  padding: 20px;
`;

const BattleTitle = styled.h2`
  text-align: center;
  margin-bottom: 20px;
`;

const BattleArea = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 70%;
  margin-bottom: 20px;
`;

const BoardSide = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 45%;
  padding: 10px;
  position: relative;
`;

const BattleLog = styled.div`
  height: 20%;
  overflow-y: auto;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 5px;
  padding: 10px;
  margin-bottom: 10px;
  scroll-behavior: smooth;
`;

const LogItem = styled.div`
  margin-bottom: 5px;
  font-size: 14px;
`;

const MinionCard = styled.div<{ 
  health: number, 
  maxHealth: number, 
  isAttacking?: boolean, 
  isDefending?: boolean,
  isDead?: boolean
}>`
  width: 70px;
  height: 100px;
  margin: 0 5px;
  background-color: ${props => {
    if (props.isDead) return '#555';
    // 根据血量百分比改变颜色
    const healthPercent = props.health / props.maxHealth;
    if (healthPercent <= 0.3) return '#e74c3c';
    if (healthPercent <= 0.6) return '#f39c12';
    return '#2ecc71';
  }};
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 5px;
  position: relative;
  animation: ${props => {
    if (props.isAttacking) return `${attackMove} 0.5s ease-in-out`;
    if (props.isDefending) return `${shake} 0.5s ease-in-out, ${flash} 0.5s ease-in-out`;
    if (props.isDead) return `${flash} 1s ease-in-out`;
    return 'none';
  }};
  opacity: ${props => props.isDead ? 0.6 : 1};
  transition: background-color 0.3s, opacity 0.5s;
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

const DamageNumber = styled.div<{ isDamage: boolean }>`
  position: absolute;
  color: ${props => props.isDamage ? '#e74c3c' : '#2ecc71'};
  font-size: 28px;
  font-weight: bold;
  text-shadow: 0 0 5px black, 0 0 10px rgba(0, 0, 0, 0.5);
  animation: ${floatUp} 1.5s forwards;
  z-index: 10;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  padding: 5px 10px;
`;

const AttackLine = styled.div<{ fromX: number, fromY: number, toX: number, toY: number }>`
  position: absolute;
  width: 3px;
  height: ${props => Math.sqrt(Math.pow(props.toX - props.fromX, 2) + Math.pow(props.toY - props.fromY, 2))}px;
  background-color: #e74c3c;
  top: ${props => props.fromY}px;
  left: ${props => props.fromX}px;
  transform-origin: top left;
  transform: rotate(${props => Math.atan2(props.toY - props.fromY, props.toX - props.fromX) + Math.PI/2}rad);
  z-index: 5;
  opacity: 0.7;
`;

const SkipButton = styled.button`
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 8px 15px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
  align-self: center;
  
  &:hover {
    background-color: #c0392b;
  }
`;

const BattleResultDisplay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.8);
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  z-index: 20;
  animation: ${flash} 2s infinite;
`;

// 战斗模拟组件
const BattleSimulation: React.FC<BattleSimulationProps> = ({ 
  playerBoard, 
  opponentBoard, 
  onBattleEnd,
  round
}) => {
  // 克隆随从数组，避免修改原始数据
  const [playerMinions, setPlayerMinions] = useState<(MinionCardType & { maxHealth?: number, isDead?: boolean })[]>([]);
  const [opponentMinions, setOpponentMinions] = useState<(MinionCardType & { maxHealth?: number, isDead?: boolean })[]>([]);
  const [battleLogs, setBattleLogs] = useState<BattleLogItem[]>([]);
  const [currentAttacker, setCurrentAttacker] = useState<{side: 'player' | 'opponent', index: number} | null>(null);
  const [currentDefender, setCurrentDefender] = useState<{side: 'player' | 'opponent', index: number} | null>(null);
  const [damageNumbers, setDamageNumbers] = useState<{x: number, y: number, amount: number, isDamage: boolean}[]>([]);
  const [attackLines, setAttackLines] = useState<{fromX: number, fromY: number, toX: number, toY: number}[]>([]);
  const [battleEnded, setBattleEnded] = useState(false);
  const [battleResult, setBattleResult] = useState<{result: 'win' | 'loss' | 'tie', damage: number}>({result: 'tie', damage: 0});
  const [showResult, setShowResult] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  
  // 引用战斗日志区域，用于自动滚动
  const battleLogRef = useRef<HTMLDivElement>(null);
  
  // 初始化战斗
  useEffect(() => {
    // 深拷贝随从数组并添加最大生命值属性
    const playerMinionsCopy = JSON.parse(JSON.stringify(playerBoard));
    const opponentMinionsCopy = JSON.parse(JSON.stringify(opponentBoard));
    
    // 为每个随从添加最大生命值属性
    playerMinionsCopy.forEach((minion: MinionCardType & { maxHealth?: number }) => {
      minion.maxHealth = minion.health;
    });
    
    opponentMinionsCopy.forEach((minion: MinionCardType & { maxHealth?: number }) => {
      minion.maxHealth = minion.health;
    });
    
    setPlayerMinions(playerMinionsCopy);
    setOpponentMinions(opponentMinionsCopy);
    
    // 添加初始战斗日志
    addBattleLog('战斗开始！');
    
    // 如果任一方没有随从，直接结束战斗
    if (playerBoard.length === 0 || opponentBoard.length === 0) {
      handleBattleEnd();
    } else {
      // 开始战斗回合
      setTimeout(() => startBattleRound(), 1000);
    }
  }, []);
  
  // 自动滚动战斗日志到底部
  useEffect(() => {
    if (battleLogRef.current) {
      battleLogRef.current.scrollTop = battleLogRef.current.scrollHeight;
    }
  }, [battleLogs]);
  
  // 处理战斗结束
  const handleBattleEnd = () => {
    // 计算战斗结果
    const alivePlayers = playerMinions.filter(m => !m.isDead && m.health > 0);
    const aliveOpponents = opponentMinions.filter(m => !m.isDead && m.health > 0);
    
    let result: 'win' | 'loss' | 'tie';
    let damage = 0;
    
    if (alivePlayers.length > 0 && aliveOpponents.length === 0) {
      // 玩家胜利
      result = 'win';
      // 计算伤害：存活随从的等级总和
      damage = alivePlayers.reduce((sum, minion) => sum + minion.tier, 0);
      addBattleLog(`你赢了！对对手造成 ${damage} 点伤害！`);
    } else if (alivePlayers.length === 0 && aliveOpponents.length > 0) {
      // 玩家失败
      result = 'loss';
      // 计算伤害：存活随从的等级总和
      damage = aliveOpponents.reduce((sum, minion) => sum + minion.tier, 0);
      addBattleLog(`你输了！受到 ${damage} 点伤害！`);
    } else {
      // 平局
      result = 'tie';
      damage = 0;
      addBattleLog('战斗结束，平局！');
    }
    
    // 设置战斗结果
    setBattleResult({ result, damage });
    setBattleEnded(true);
    
    // 显示结果
    setTimeout(() => {
      setShowResult(true);
      
      // 延迟调用回调函数
      setTimeout(() => {
        if (onBattleEnd) {
          onBattleEnd(result, damage);
        }
      }, 2000);
    }, 1000);
  };
  
  // 跳过战斗
  const skipBattle = () => {
    // 立即结束战斗
    handleBattleEnd();
  };
  
  // 添加战斗日志
  const addBattleLog = (text: string) => {
    setBattleLogs(prev => [...prev, { text, timestamp: Date.now() }]);
  };
  
  // 渲染战斗日志
  const renderBattleLogs = () => {
    return (
      <BattleLog ref={battleLogRef}>
        {battleLogs.map((log, index) => (
          <LogItem key={index}>
            {log.text}
          </LogItem>
        ))}
      </BattleLog>
    );
  };
  
  // 渲染随从
  const renderMinion = (minion: MinionCardType & { maxHealth?: number, isDead?: boolean }, index: number, side: 'player' | 'opponent') => {
    const isAttacking = currentAttacker?.side === side && currentAttacker?.index === index;
    const isDefending = currentDefender?.side === side && currentDefender?.index === index;
    
    return (
      <MinionCard 
        key={index}
        health={minion.health}
        maxHealth={minion.maxHealth || minion.health}
        isAttacking={isAttacking}
        isDefending={isDefending}
        isDead={minion.isDead || minion.health <= 0}
      >
        <CardName>{minion.name}</CardName>
        <CardStats>
          <CardAttack>{minion.attack}</CardAttack>
          <CardHealth>{minion.health}</CardHealth>
        </CardStats>
        <TierBadge>{minion.tier}</TierBadge>
      </MinionCard>
    );
  };
  
  // 渲染伤害数字
  const renderDamageNumbers = () => {
    return damageNumbers.map((damage, index) => (
      <DamageNumber 
        key={index}
        style={{ top: damage.y, left: damage.x }}
        isDamage={damage.isDamage}
      >
        {damage.amount}
      </DamageNumber>
    ));
  };
  
  // 渲染攻击线
  const renderAttackLines = () => {
    return attackLines.map((line, index) => (
      <AttackLine 
        key={index}
        fromX={line.fromX}
        fromY={line.fromY}
        toX={line.toX}
        toY={line.toY}
      />
    ));
  };
  
  // 开始战斗回合
  const startBattleRound = () => {
    // 随机决定先手
    const playerFirst = Math.random() > 0.5;
    addBattleLog(`${playerFirst ? '你的随从' : '对手的随从'}先手攻击！`);
    
    // 开始战斗循环
    setTurnCount(0);
    simulateBattle(playerFirst);
  };
  
  // 渲染组件
  return (
    <BattleContainer>
      <BattleTitle>第 {round} 回合战斗</BattleTitle>
      
      <BattleArea>
        <BoardSide>
          {opponentMinions.map((minion, index) => renderMinion(minion, index, 'opponent'))}
        </BoardSide>
        
        <BoardSide>
          {playerMinions.map((minion, index) => renderMinion(minion, index, 'player'))}
        </BoardSide>
      </BattleArea>
      
      {renderBattleLogs()}
      
      {/* 渲染攻击线和伤害数字 */}
      {renderAttackLines()}
      {renderDamageNumbers()}
      
      {/* 跳过按钮 */}
      {!battleEnded && (
        <SkipButton onClick={skipBattle}>跳过战斗</SkipButton>
      )}
      
      {/* 战斗结果显示 */}
      {showResult && (
        <BattleResultDisplay>
          <h3>战斗结束</h3>
          <p>
            {battleResult.result === 'win' && `你赢了！造成 ${battleResult.damage} 点伤害`}
            {battleResult.result === 'loss' && `你输了！受到 ${battleResult.damage} 点伤害`}
            {battleResult.result === 'tie' && '战斗平局！'}
          </p>
        </BattleResultDisplay>
      )}
    </BattleContainer>
  );
  
  // 模拟战斗
  const simulateBattle = (playerTurn: boolean) => {
    // 增加回合计数
    setTurnCount(prev => prev + 1);
    
    // 如果回合数超过50，强制结束战斗以防止无限循环
    if (turnCount > 50) {
      addBattleLog('战斗时间过长，强制结束！');
      handleBattleEnd();
      return;
    }
    
    // 检查战斗是否应该结束
    const alivePlayers = playerMinions.filter(m => !m.isDead && m.health > 0);
    const aliveOpponents = opponentMinions.filter(m => !m.isDead && m.health > 0);
    
    if (alivePlayers.length === 0 || aliveOpponents.length === 0) {
      // 标记所有生命值为0的随从为死亡
      const updatedPlayerMinions = [...playerMinions];
      const updatedOpponentMinions = [...opponentMinions];
      
      updatedPlayerMinions.forEach(minion => {
        if (minion.health <= 0) minion.isDead = true;
      });
      
      updatedOpponentMinions.forEach(minion => {
        if (minion.health <= 0) minion.isDead = true;
      });
      
      setPlayerMinions(updatedPlayerMinions);
      setOpponentMinions(updatedOpponentMinions);
      
      // 延迟一段时间后结束战斗
      setTimeout(() => handleBattleEnd(), 1500);
      return;
    }
    
    // 决定当前攻击者和防御者
    let attackerSide: 'player' | 'opponent';
    let defenderSide: 'player' | 'opponent';
    
    if (playerTurn) {
      attackerSide = 'player';
      defenderSide = 'opponent';
    } else {
      attackerSide = 'opponent';
      defenderSide = 'player';
    }
    
    // 获取当前存活的随从
    const attackers = attackerSide === 'player' ? alivePlayers : aliveOpponents;
    const defenders = defenderSide === 'player' ? alivePlayers : aliveOpponents;
    
    if (attackers.length === 0 || defenders.length === 0) {
      // 如果任一方没有随从，结束战斗
      setTimeout(() => handleBattleEnd(), 1000);
      return;
    }
    
    // 使用更智能的攻击者选择策略 - 优先选择攻击力高的随从
    // 按攻击力排序并添加少量随机性
    const sortedAttackers = [...attackers].sort((a, b) => {
      // 80%的概率选择攻击力高的，20%的概率随机选择
      if (Math.random() < 0.8) {
        return b.attack - a.attack;
      } else {
        return Math.random() - 0.5;
      }
    });
    
    const attackerIndex = 0; // 选择排序后的第一个
    const attackerIndexInOriginalArray = attackerSide === 'player' 
      ? playerMinions.findIndex(m => m === sortedAttackers[attackerIndex])
      : opponentMinions.findIndex(m => m === sortedAttackers[attackerIndex]);
    
    // 使用更智能的防御者选择策略 - 优先选择生命值低的随从
    // 按生命值排序并添加少量随机性
    const sortedDefenders = [...defenders].sort((a, b) => {
      // 70%的概率选择生命值低的，30%的概率随机选择
      if (Math.random() < 0.7) {
        return a.health - b.health;
      } else {
        return Math.random() - 0.5;
      }
    });
    
    const defenderIndex = 0; // 选择排序后的第一个
    const defenderIndexInOriginalArray = defenderSide === 'player'
      ? playerMinions.findIndex(m => m === sortedDefenders[defenderIndex])
      : opponentMinions.findIndex(m => m === sortedDefenders[defenderIndex]);
    
    // 设置当前攻击者和防御者
    setCurrentAttacker({ side: attackerSide, index: attackerIndexInOriginalArray });
    setCurrentDefender({ side: defenderSide, index: defenderIndexInOriginalArray });
    
    // 添加战斗日志
    const attacker = attackerSide === 'player' 
      ? playerMinions[attackerIndexInOriginalArray] 
      : opponentMinions[attackerIndexInOriginalArray];
    const defender = defenderSide === 'player' 
      ? playerMinions[defenderIndexInOriginalArray] 
      : opponentMinions[defenderIndexInOriginalArray];
    
    addBattleLog(`${attackerSide === 'player' ? '你的' : '对手的'} ${attacker.name} (${attacker.attack}/${attacker.health}) 攻击 ${defenderSide === 'player' ? '你的' : '对手的'} ${defender.name} (${defender.attack}/${defender.health})`);
    
    // 创建攻击线动画
    // 使用更准确的位置计算方法
    // 计算攻击者位置 - 根据战场位置和索引计算
    const attackerX = window.innerWidth / 2 - (attackers.length * 40) + attackerIndexInOriginalArray * 80 + 35;
    const attackerY = attackerSide === 'player' ? window.innerHeight * 0.65 : window.innerHeight * 0.25;
    
    // 计算防御者位置
    const defenderX = window.innerWidth / 2 - (defenders.length * 40) + defenderIndexInOriginalArray * 80 + 35;
    const defenderY = defenderSide === 'player' ? window.innerHeight * 0.65 : window.innerHeight * 0.25;
    
    // 设置攻击线
    setAttackLines([{ fromX: attackerX, fromY: attackerY, toX: defenderX, toY: defenderY }]);
    
    // 记录位置信息用于伤害显示
    const attackerPos = { x: attackerX, y: attackerY };
    const defenderPos = { x: defenderX, y: defenderY };
    
    // 执行攻击逻辑
    const performAttack = () => {
      // 清除攻击线
      setAttackLines([]);
      
      // 执行攻击
      const updatedPlayerMinions = [...playerMinions];
      const updatedOpponentMinions = [...opponentMinions];
      
      // 计算伤害
      if (defenderSide === 'player') {
        // 计算实际伤害值（可能会有随机波动）
        const damage = Math.max(1, attacker.attack);
        updatedPlayerMinions[defenderIndexInOriginalArray].health -= damage;
        
        // 添加伤害数字动画 - 使用之前计算的位置
        setDamageNumbers(prev => [
          ...prev,
          { 
            x: defenderPos.x, 
            y: defenderPos.y, 
            amount: damage, 
            isDamage: true 
          }
        ]);
        
        // 添加战斗日志
        if (damage > 0) {
          addBattleLog(`${defender.name} 受到了 ${damage} 点伤害！`);
        }
      } else {
        // 计算实际伤害值
        const damage = Math.max(1, attacker.attack);
        updatedOpponentMinions[defenderIndexInOriginalArray].health -= damage;
        
        // 添加伤害数字动画
        setDamageNumbers(prev => [
          ...prev,
          { 
            x: defenderPos.x, 
            y: defenderPos.y, 
            amount: damage, 
            isDamage: true 
          }
        ]);
        
        // 添加战斗日志
        if (damage > 0) {
          addBattleLog(`${defender.name} 受到了 ${damage} 点伤害！`);
        }
      }
      
      // 反击伤害
      if (attackerSide === 'player') {
        // 计算反击伤害
        const counterDamage = Math.max(1, defender.attack);
        updatedPlayerMinions[attackerIndexInOriginalArray].health -= counterDamage;
        
        // 添加伤害数字动画
        setDamageNumbers(prev => [
          ...prev,
          { 
            x: attackerPos.x, 
            y: attackerPos.y, 
            amount: counterDamage, 
            isDamage: true 
          }
        ]);
        
        // 添加战斗日志
        if (counterDamage > 0) {
          addBattleLog(`${attacker.name} 受到了 ${counterDamage} 点反击伤害！`);
        }
      } else {
        // 计算反击伤害
        const counterDamage = Math.max(1, defender.attack);
        updatedOpponentMinions[attackerIndexInOriginalArray].health -= counterDamage;
        
        // 添加伤害数字动画
        setDamageNumbers(prev => [
          ...prev,
          { 
            x: attackerPos.x, 
            y: attackerPos.y, 
            amount: counterDamage, 
            isDamage: true 
          }
        ]);
        
        // 添加战斗日志
        if (counterDamage > 0) {
          addBattleLog(`${attacker.name} 受到了 ${counterDamage} 点反击伤害！`);
        }
      }
      
      // 检查是否有随从死亡
      updatedPlayerMinions.forEach(minion => {
        if (minion.health <= 0 && !minion.isDead) {
          minion.isDead = true;
          addBattleLog(`${minion.name} 被击败了！`);
        }
      });
      
      updatedOpponentMinions.forEach(minion => {
        if (minion.health <= 0 && !minion.isDead) {
          minion.isDead = true;
          addBattleLog(`${minion.name} 被击败了！`);
        }
      });
      
      // 更新随从状态
      setPlayerMinions(updatedPlayerMinions);
      setOpponentMinions(updatedOpponentMinions);
      
      // 清除当前攻击者和防御者
      setTimeout(() => {
        setCurrentAttacker(null);
        setCurrentDefender(null);
        
        // 清除伤害数字
        setTimeout(() => {
          setDamageNumbers([]);
          
          // 检查战斗是否应该结束
          const stillAlivePlayer = updatedPlayerMinions.filter(m => !m.isDead && m.health > 0);
          const stillAliveOpponent = updatedOpponentMinions.filter(m => !m.isDead && m.health > 0);
          
          if (stillAlivePlayer.length === 0 || stillAliveOpponent.length === 0) {
            // 战斗结束
            handleBattleEnd();
          } else {
            // 继续下一轮战斗
            setTimeout(() => simulateBattle(!playerTurn), 500);
          }
        }, 1000);
      }, 800);
    };
    
    // 延迟一段时间后执行攻击
    setTimeout(performAttack, 1000);