const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// 游戏状态管理
const games = {};
const players = {};

// 初始化Express应用
const app = express();
app.use(cors());
app.use(express.json());

// 创建HTTP服务器
const server = http.createServer(app);

// 初始化Socket.io
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// API路由
app.get('/', (req, res) => {
  res.send('炉石传说类游戏服务器运行中');
});

// 创建新游戏
app.post('/api/games', (req, res) => {
  const gameId = uuidv4();
  games[gameId] = {
    id: gameId,
    players: [],
    status: 'waiting', // waiting, playing, ended
    turn: null,
    board: {
      player1: {
        hand: [],
        board: [],
        deck: [],
        hero: { health: 30, armor: 0 },
        mana: { current: 0, max: 0 }
      },
      player2: {
        hand: [],
        board: [],
        deck: [],
        hero: { health: 30, armor: 0 },
        mana: { current: 0, max: 0 }
      }
    }
  };
  
  res.json({ gameId });
});

// Socket.io连接处理
io.on('connection', (socket) => {
  console.log('新连接:', socket.id);
  
  // 玩家加入游戏
  socket.on('joinGame', ({ gameId, playerName, deck }) => {
    // 检查游戏是否存在
    if (!games[gameId]) {
      socket.emit('error', { message: '游戏不存在' });
      return;
    }
    
    // 检查游戏是否已满
    if (games[gameId].players.length >= 2) {
      socket.emit('error', { message: '游戏已满' });
      return;
    }
    
    const playerId = socket.id;
    const playerIndex = games[gameId].players.length + 1;
    
    // 注册玩家
    players[playerId] = {
      id: playerId,
      name: playerName,
      gameId: gameId,
      index: playerIndex
    };
    
    // 将玩家添加到游戏
    games[gameId].players.push(playerId);
    
    // 初始化玩家牌组
    const shuffledDeck = shuffleDeck(deck);
    const playerKey = `player${playerIndex}`;
    games[gameId].board[playerKey].deck = shuffledDeck;
    
    // 通知玩家已加入
    socket.join(gameId);
    socket.emit('gameJoined', { gameId, playerIndex });
    
    // 如果两名玩家都已加入，开始游戏
    if (games[gameId].players.length === 2) {
      startGame(gameId);
    }
  });
  
  // 玩家出牌
  socket.on('playCard', ({ gameId, cardIndex, targetIndex }) => {
    const playerId = socket.id;
    const game = games[gameId];
    
    if (!game) {
      socket.emit('error', { message: '游戏不存在' });
      return;
    }
    
    // 检查是否轮到该玩家
    if (game.turn !== playerId) {
      socket.emit('error', { message: '不是你的回合' });
      return;
    }
    
    const playerIndex = players[playerId].index;
    const playerKey = `player${playerIndex}`;
    const hand = game.board[playerKey].hand;
    
    // 检查卡牌是否存在
    if (cardIndex < 0 || cardIndex >= hand.length) {
      socket.emit('error', { message: '无效的卡牌' });
      return;
    }
    
    const card = hand[cardIndex];
    
    // 检查法力值是否足够
    if (game.board[playerKey].mana.current < card.cost) {
      socket.emit('error', { message: '法力值不足' });
      return;
    }
    
    // 从手牌中移除卡牌
    hand.splice(cardIndex, 1);
    
    // 扣除法力值
    game.board[playerKey].mana.current -= card.cost;
    
    // 处理卡牌效果
    handleCardEffect(game, playerIndex, card, targetIndex);
    
    // 广播游戏状态更新
    io.to(gameId).emit('gameUpdated', getGameState(game, playerId));
  });
  
  // 玩家攻击
  socket.on('attack', ({ gameId, attackerIndex, targetIndex }) => {
    const playerId = socket.id;
    const game = games[gameId];
    
    if (!game) {
      socket.emit('error', { message: '游戏不存在' });
      return;
    }
    
    // 检查是否轮到该玩家
    if (game.turn !== playerId) {
      socket.emit('error', { message: '不是你的回合' });
      return;
    }
    
    const playerIndex = players[playerId].index;
    const opponentIndex = playerIndex === 1 ? 2 : 1;
    const playerKey = `player${playerIndex}`;
    const opponentKey = `player${opponentIndex}`;
    
    // 获取攻击者和目标
    const attacker = game.board[playerKey].board[attackerIndex];
    let target;
    
    // 目标是英雄
    if (targetIndex === -1) {
      target = game.board[opponentKey].hero;
    } else {
      // 目标是随从
      target = game.board[opponentKey].board[targetIndex];
    }
    
    // 检查攻击者是否存在
    if (!attacker) {
      socket.emit('error', { message: '无效的攻击者' });
      return;
    }
    
    // 检查目标是否存在
    if (!target) {
      socket.emit('error', { message: '无效的目标' });
      return;
    }
    
    // 检查攻击者是否已经攻击过
    if (attacker.hasAttacked) {
      socket.emit('error', { message: '该随从本回合已经攻击过' });
      return;
    }
    
    // 执行攻击
    target.health -= attacker.attack;
    attacker.health -= targetIndex === -1 ? 0 : target.attack;
    attacker.hasAttacked = true;
    
    // 检查随从是否死亡
    checkMinionsHealth(game);
    
    // 检查游戏是否结束
    if (checkGameOver(game)) {
      endGame(gameId);
    } else {
      // 广播游戏状态更新
      io.to(gameId).emit('gameUpdated', getGameState(game, playerId));
    }
  });
  
  // 玩家结束回合
  socket.on('endTurn', ({ gameId }) => {
    const playerId = socket.id;
    const game = games[gameId];
    
    if (!game) {
      socket.emit('error', { message: '游戏不存在' });
      return;
    }
    
    // 检查是否轮到该玩家
    if (game.turn !== playerId) {
      socket.emit('error', { message: '不是你的回合' });
      return;
    }
    
    // 切换回合
    switchTurn(game);
    
    // 广播游戏状态更新
    io.to(gameId).emit('gameUpdated', getGameState(game, playerId));
  });
  
  // 断开连接处理
  socket.on('disconnect', () => {
    const playerId = socket.id;
    const player = players[playerId];
    
    if (player) {
      const gameId = player.gameId;
      const game = games[gameId];
      
      if (game) {
        // 通知对手玩家已断开连接
        socket.to(gameId).emit('playerDisconnected', { playerId });
        
        // 结束游戏
        endGame(gameId, playerId);
      }
      
      // 清理玩家数据
      delete players[playerId];
    }
  });
});

// 游戏辅助函数

// 洗牌函数
function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 开始游戏
function startGame(gameId) {
  const game = games[gameId];
  game.status = 'playing';
  
  // 随机决定先手玩家
  const firstPlayerIndex = Math.random() < 0.5 ? 0 : 1;
  game.turn = game.players[firstPlayerIndex];
  
  // 初始化玩家手牌和法力值
  for (let i = 1; i <= 2; i++) {
    const playerKey = `player${i}`;
    const isFirstPlayer = (i - 1) === firstPlayerIndex;
    
    // 设置初始法力值
    game.board[playerKey].mana = { current: 1, max: 1 };
    
    // 抽初始手牌 (先手3张，后手4张加硬币)
    const initialCards = isFirstPlayer ? 3 : 4;
    for (let j = 0; j < initialCards; j++) {
      drawCard(game, i);
    }
    
    // 后手玩家获得硬币
    if (!isFirstPlayer) {
      game.board[playerKey].hand.push({
        id: 'coin',
        name: '硬币',
        cost: 0,
        type: 'spell',
        effect: 'gainMana',
        effectValue: 1,
        description: '获得一个法力水晶，仅限本回合使用。'
      });
    }
  }
  
  // 广播游戏开始
  io.to(gameId).emit('gameStarted', {
    firstPlayer: game.turn,
    gameState: getGameState(game)
  });
}

// 抽牌函数
function drawCard(game, playerIndex) {
  const playerKey = `player${playerIndex}`;
  const deck = game.board[playerKey].deck;
  const hand = game.board[playerKey].hand;
  
  if (deck.length > 0) {
    // 从牌组顶部抽一张牌
    const card = deck.shift();
    hand.push(card);
    return card;
  } else {
    // 疲劳伤害
    const fatigueDamage = game.board[playerKey].fatigue || 1;
    game.board[playerKey].hero.health -= fatigueDamage;
    game.board[playerKey].fatigue = fatigueDamage + 1;
    
    // 检查游戏是否结束
    if (checkGameOver(game)) {
      endGame(game.id);
    }
    
    return null;
  }
}

// 处理卡牌效果
function handleCardEffect(game, playerIndex, card, targetIndex) {
  const playerKey = `player${playerIndex}`;
  const opponentIndex = playerIndex === 1 ? 2 : 1;
  const opponentKey = `player${opponentIndex}`;
  
  // 根据卡牌类型处理效果
  switch (card.type) {
    case 'minion':
      // 将随从放置到战场
      const minion = {
        ...card,
        hasAttacked: !card.abilities?.includes('charge'), // 如果有冲锋，可以立即攻击
        canAttack: true
      };
      
      game.board[playerKey].board.push(minion);
      
      // 处理战吼效果
      if (card.abilities?.includes('battlecry')) {
        handleBattlecry(game, playerIndex, card, targetIndex);
      }
      break;
      
    case 'spell':
      // 处理法术效果
      handleSpellEffect(game, playerIndex, card, targetIndex);
      break;
      
    case 'weapon':
      // 装备武器
      game.board[playerKey].weapon = {
        ...card,
        durability: card.durability
      };
      break;
  }
}

// 处理战吼效果
function handleBattlecry(game, playerIndex, card, targetIndex) {
  const playerKey = `player${playerIndex}`;
  const opponentIndex = playerIndex === 1 ? 2 : 1;
  const opponentKey = `player${opponentIndex}`;
  
  // 根据卡牌ID处理特定的战吼效果
  switch (card.id) {
    // 这里可以添加特定卡牌的战吼效果
    case 'battlecry_damage':
      // 对目标造成伤害
      if (targetIndex === -1) {
        // 目标是英雄
        game.board[opponentKey].hero.health -= card.effectValue;
      } else {
        // 目标是随从
        const target = game.board[opponentKey].board[targetIndex];
        if (target) {
          target.health -= card.effectValue;
        }
      }
      break;
      
    case 'battlecry_heal':
      // 治疗目标
      if (targetIndex === -1) {
        // 目标是英雄
        game.board[playerKey].hero.health = Math.min(30, game.board[playerKey].hero.health + card.effectValue);
      } else {
        // 目标是随从
        const target = game.board[playerKey].board[targetIndex];
        if (target) {
          target.health = Math.min(target.maxHealth || target.health, target.health + card.effectValue);
        }
      }
      break;
      
    case 'battlecry_draw':
      // 抽牌
      for (let i = 0; i < card.effectValue; i++) {
        drawCard(game, playerIndex);
      }
      break;
      
    case 'battlecry_buff':
      // 增强随从
      if (targetIndex >= 0) {
        const target = game.board[playerKey].board[targetIndex];
        if (target) {
          target.attack += card.effectValue.attack || 0;
          target.health += card.effectValue.health || 0;
          target.maxHealth = (target.maxHealth || target.health) + (card.effectValue.health || 0);
        }
      }
      break;
  }
  
  // 检查随从是否死亡
  checkMinionsHealth(game);
}

// 处理法术效果
function handleSpellEffect(game, playerIndex, card, targetIndex) {
  const playerKey = `player${playerIndex}`;
  const opponentIndex = playerIndex === 1 ? 2 : 1;
  const opponentKey = `player${opponentIndex}`;
  
  // 根据法术效果类型处理
  switch (card.effect) {
    case 'damage':
      // 造成伤害
      if (targetIndex === -1) {
        // 目标是英雄
        game.board[opponentKey].hero.health -= card.effectValue;
      } else {
        // 目标是随从
        const target = game.board[opponentKey].board[targetIndex];
        if (target) {
          target.health -= card.effectValue;
        }
      }
      break;
      
    case 'heal':
      // 治疗
      if (targetIndex === -1) {
        // 目标是英雄
        game.board[playerKey].hero.health = Math.min(30, game.board[playerKey].hero.health + card.effectValue);
      } else {
        // 目标是随从
        const target = game.board[playerKey].board[targetIndex];
        if (target) {
          target.health = Math.min(target.maxHealth || target.health, target.health + card.effectValue);
        }
      }
      break;
      
    case 'draw':
      // 抽牌
      for (let i = 0; i < card.effectValue; i++) {
        drawCard(game, playerIndex);
      }
      break;
      
    case 'aoe_damage':
      // 群体伤害
      game.board[opponentKey].board.forEach(minion => {
        minion.health -= card.effectValue;
      });
      break;
      
    case 'gainMana':
      // 获得法力水晶
      game.board[playerKey].mana.current += card.effectValue;
      break;
  }
  
  // 检查随从是否死亡
  checkMinionsHealth(game);
}

// 处理亡语效果
function handleDeathrattle(game, playerIndex, card) {
  const playerKey = `player${playerIndex}`;
  const opponentIndex = playerIndex === 1 ? 2 : 1;
  const opponentKey = `player${opponentIndex}`;
  
  // 根据卡牌ID处理特定的亡语效果
  switch (card.id) {
    case 'deathrattle_draw':
      // 抽牌
      for (let i = 0; i < card.effectValue; i++) {
        drawCard(game, playerIndex);
      }
      break;
      
    case 'deathrattle_damage':
      // 对所有敌方随从造成伤害
      game.board[opponentKey].board.forEach(minion => {
        minion.health -= card.effectValue;
      });
      break;
      
    case 'deathrattle_summon':
      // 召唤随从
      if (game.board[playerKey].board.length < 7) { // 战场上最多7个随从
        game.board[playerKey].board.push({
          id: card.summonId,
          name: card.summonName,
          cost: card.summonCost,
          attack: card.summonAttack,
          health: card.summonHealth,
          type: 'minion',
          hasAttacked: true, // 刚召唤的随从不能攻击
          canAttack: false
        });
      }
      break;
  }
  
  // 检查随从是否死亡
  checkMinionsHealth(game);
}

// 检查随从生命值
function checkMinionsHealth(game) {
  // 检查双方随从
  for (let i = 1; i <= 2; i++) {
    const playerKey = `player${i}`;
    const board = game.board[playerKey].board;
    
    // 从后往前检查，以便安全地移除元素
    for (let j = board.length - 1; j >= 0; j--) {
      const minion = board[j];
      
      // 如果随从生命值小于等于0，触发亡语并移除
      if (minion.health <= 0) {
        // 触发亡语
        if (minion.abilities?.includes('deathrattle')) {
          handleDeathrattle(game, i, minion);
        }
        
        // 移除随从
        board.splice(j, 1);
      }
    }
  }
}

// 切换回合
function switchTurn(game) {
  // 获取当前玩家和下一个玩家的索引
  const currentPlayerIndex = game.players.indexOf(game.turn);
  const nextPlayerIndex = (currentPlayerIndex + 1) % 2;
  const nextPlayerId = game.players[nextPlayerIndex];
  
  // 更新回合
  game.turn = nextPlayerId;
  
  // 获取下一个玩家的键
  const playerIndex = players[nextPlayerId].index;
  const playerKey = `player${playerIndex}`;
  
  // 增加法力水晶上限（最多10个）
  game.board[playerKey].mana.max = Math.min(10, game.board[playerKey].mana.max + 1);
  
  // 恢复法力值
  game.board[playerKey].mana.current = game.board[playerKey].mana.max;
  
  // 抽一张牌
  drawCard(game, playerIndex);
  
  // 重置随从攻击状态
  game.board[playerKey].board.forEach(minion => {
    minion.hasAttacked = false;
    minion.canAttack = true;
  });
}

// 检查游戏是否结束
function checkGameOver(game) {
  // 检查双方英雄生命值
  return game.board.player1.hero.health <= 0 || game.board.player2.hero.health <= 0;
}

// 结束游戏
function endGame(gameId, disconnectedPlayerId) {
  const game = games[gameId];
  
  if (!game) return;
  
  game.status = 'ended';
  
  // 确定获胜者
  let winnerId;
  
  if (disconnectedPlayerId) {
    // 如果有玩家断开连接，另一个玩家获胜
    winnerId = game.players.find(id => id !== disconnectedPlayerId);
  } else {
    // 根据英雄生命值确定获胜者
    if (game.board.player1.hero.health <= 0) {
      winnerId = game.players[1]; // 玩家2获胜
    } else {
      winnerId = game.players[0]; // 玩家1获胜
    }
  }
  
  // 广播游戏结束
  io.to(gameId).emit('gameEnded', {
    winnerId,
    gameState: getGameState(game)
  });
  
  // 清理游戏数据
  setTimeout(() => {
    delete games[gameId];
  }, 60000); // 1分钟后清理
}

// 获取游戏状态（针对特定玩家）
function getGameState(game, playerId) {
  // 创建游戏状态副本
  const state = {
    id: game.id,
    status: game.status,
    turn: game.turn,
    board: JSON.parse(JSON.stringify(game.board)) // 深拷贝
  };
  
  // 如果指定了玩家ID，隐藏对手的手牌信息
  if (playerId) {
    const playerIndex = players[playerId]?.index;
    if (playerIndex) {
      const opponentIndex = playerIndex === 1 ? 2 : 1;
      const opponentKey = `player${opponentIndex}`;
      
      // 隐藏对手手牌的具体信息，只保留数量
      const handCount = state.board[opponentKey].hand.length;
      state.board[opponentKey].hand = Array(handCount).fill({ hidden: true });
      
      // 隐藏对手牌组的具体信息，只保留数量
      const deckCount = state.board[opponentKey].deck.length;
      state.board[opponentKey].deck = { count: deckCount };
    }
  }
  
  return state;
}

// 启动服务器
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});