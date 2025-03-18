// 卡牌数据定义

// 卡牌类型
export type CardType = 'minion' | 'spell' | 'weapon';

// 卡牌能力
export type CardAbility = 'battlecry' | 'deathrattle' | 'charge' | 'taunt' | 'divine_shield';

// 基础卡牌接口
export interface Card {
  id: string;
  name: string;
  cost: number;
  type: CardType;
  description: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  abilities?: CardAbility[];
  class?: string;
}

// 随从卡牌
export interface MinionCard extends Card {
  type: 'minion';
  attack: number;
  health: number;
  // 战吼效果
  battlecry?: {
    effect: string;
    effectValue: number | { attack: number; health: number };
    targetRequired?: boolean;
  };
  // 亡语效果
  deathrattle?: {
    effect: string;
    effectValue: number;
    summonId?: string;
    summonName?: string;
    summonCost?: number;
    summonAttack?: number;
    summonHealth?: number;
  };
}

// 法术卡牌
export interface SpellCard extends Card {
  type: 'spell';
  effect: string;
  effectValue: number;
  targetRequired?: boolean;
}

// 武器卡牌
export interface WeaponCard extends Card {
  type: 'weapon';
  attack: number;
  durability: number;
}

// 所有卡牌类型的联合类型
export type GameCard = MinionCard | SpellCard | WeaponCard;

// 基础卡牌集合
export const basicCards: GameCard[] = [
  // 基础随从
  {
    id: 'basic_minion_1',
    name: '步兵',
    cost: 1,
    type: 'minion',
    attack: 1,
    health: 2,
    abilities: ['taunt'],
    description: '嘲讽',
    rarity: 'common',
    class: 'neutral'
  },
  {
    id: 'basic_minion_2',
    name: '见习法师',
    cost: 2,
    type: 'minion',
    attack: 1,
    health: 3,
    abilities: ['battlecry'],
    description: '战吼：造成1点伤害',
    rarity: 'common',
    class: 'neutral',
    battlecry: {
      effect: 'damage',
      effectValue: 1,
      targetRequired: true
    }
  },
  {
    id: 'basic_minion_3',
    name: '冲锋战士',
    cost: 3,
    type: 'minion',
    attack: 2,
    health: 2,
    abilities: ['charge'],
    description: '冲锋',
    rarity: 'common',
    class: 'neutral'
  },
  {
    id: 'basic_minion_4',
    name: '团队领袖',
    cost: 3,
    type: 'minion',
    attack: 2,
    health: 2,
    description: '你的其他随从获得+1攻击力',
    rarity: 'common',
    class: 'neutral'
  },
  {
    id: 'basic_minion_5',
    name: '食尸鬼',
    cost: 3,
    type: 'minion',
    attack: 2,
    health: 3,
    abilities: ['deathrattle'],
    description: '亡语：抽一张牌',
    rarity: 'common',
    class: 'neutral',
    deathrattle: {
      effect: 'draw',
      effectValue: 1
    }
  },
  {
    id: 'basic_minion_6',
    name: '暴风城骑士',
    cost: 4,
    type: 'minion',
    attack: 2,
    health: 5,
    abilities: ['taunt'],
    description: '嘲讽',
    rarity: 'common',
    class: 'neutral'
  },
  {
    id: 'basic_minion_7',
    name: '爆炸工程师',
    cost: 5,
    type: 'minion',
    attack: 3,
    health: 3,
    abilities: ['deathrattle'],
    description: '亡语：对所有敌方随从造成2点伤害',
    rarity: 'rare',
    class: 'neutral',
    deathrattle: {
      effect: 'damage',
      effectValue: 2
    }
  },
  {
    id: 'basic_minion_8',
    name: '战场指挥官',
    cost: 6,
    type: 'minion',
    attack: 4,
    health: 5,
    abilities: ['battlecry'],
    description: '战吼：使你的所有其他随从获得+2/+2',
    rarity: 'rare',
    class: 'neutral',
    battlecry: {
      effect: 'buff',
      effectValue: { attack: 2, health: 2 }
    }
  },
  
  // 基础法术
  {
    id: 'basic_spell_1',
    name: '火球术',
    cost: 4,
    type: 'spell',
    effect: 'damage',
    effectValue: 6,
    targetRequired: true,
    description: '造成6点伤害',
    rarity: 'common',
    class: 'mage'
  },
  {
    id: 'basic_spell_2',
    name: '治疗之触',
    cost: 3,
    type: 'spell',
    effect: 'heal',
    effectValue: 8,
    targetRequired: true,
    description: '恢复8点生命值',
    rarity: 'common',
    class: 'priest'
  },
  {
    id: 'basic_spell_3',
    name: '奥术智慧',
    cost: 3,
    type: 'spell',
    effect: 'draw',
    effectValue: 2,
    description: '抽两张牌',
    rarity: 'common',
    class: 'mage'
  },
  {
    id: 'basic_spell_4',
    name: '烈焰风暴',
    cost: 7,
    type: 'spell',
    effect: 'aoe_damage',
    effectValue: 4,
    description: '对所有敌方随从造成4点伤害',
    rarity: 'rare',
    class: 'mage'
  },
  
  // 基础武器
  {
    id: 'basic_weapon_1',
    name: '战斧',
    cost: 3,
    type: 'weapon',
    attack: 3,
    durability: 2,
    description: '',
    rarity: 'common',
    class: 'warrior'
  },
  {
    id: 'basic_weapon_2',
    name: '轻型短剑',
    cost: 1,
    type: 'weapon',
    attack: 1,
    durability: 2,
    description: '',
    rarity: 'common',
    class: 'rogue'
  }
];

// 预设牌组
export const presetDecks = {
  // 基础战士牌组
  warrior: [
    'basic_minion_1', 'basic_minion_1',
    'basic_minion_3', 'basic_minion_3',
    'basic_minion_4', 'basic_minion_4',
    'basic_minion_5', 'basic_minion_5',
    'basic_minion_6', 'basic_minion_6',
    'basic_minion_7', 'basic_minion_7',
    'basic_minion_8', 'basic_minion_8',
    'basic_weapon_1', 'basic_weapon_1',
    'basic_spell_2', 'basic_spell_2',
    'basic_spell_3', 'basic_spell_3',
  ].map(id => basicCards.find(card => card.id === id)!),
  
  // 基础法师牌组
  mage: [
    'basic_minion_1', 'basic_minion_1',
    'basic_minion_2', 'basic_minion_2',
    'basic_minion_4', 'basic_minion_4',
    'basic_minion_5', 'basic_minion_5',
    'basic_minion_6', 'basic_minion_6',
    'basic_minion_7', 'basic_minion_7',
    'basic_minion_8',
    'basic_spell_1', 'basic_spell_1',
    'basic_spell_3', 'basic_spell_3',
    'basic_spell_4', 'basic_spell_4',
  ].map(id => basicCards.find(card => card.id === id)!),
};

// 根据ID获取卡牌
export function getCardById(id: string): GameCard | undefined {
  return basicCards.find(card => card.id === id);
}

// 获取牌组中的所有卡牌
export function getDeckCards(deckIds: string[]): GameCard[] {
  return deckIds.map(id => getCardById(id)).filter(card => card !== undefined) as GameCard[];
}