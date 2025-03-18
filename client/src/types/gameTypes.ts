// 游戏类型定义

// 随从卡牌接口
export interface MinionCard {
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
  maxHealth?: number; // 添加最大生命值属性
}

// 战斗结果类型
export type BattleResult = 'win' | 'loss' | 'tie';