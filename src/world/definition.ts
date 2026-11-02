import { standardMaterials } from '../core/materials';
import { WORLD_DAY_SECONDS } from '../core/time';
import type { Action, Entity, WorldDefinition, Vec3 } from '../core/types';
import { mineralMaterials } from './content/minerals';
import { noiseGenerator } from './generation/noise';
import type { WorldGenerator } from './generation/types';

const materials={
  ...standardMaterials,
  bedrock:{color:'#252b30',solid:true,floats:false,breakable:false},
  ...mineralMaterials,
};
const worldSeed=1701;
const terrain=noiseGenerator.terrain!;
const frontZ=.5,batteryZ=-2.22,reactorZ=-4.94,fullRadius=.86,slimRadius=.7;
const formationX={min01:-2.22,min02:.5,min03:3.06};
const spawn=(x:number,z:number):Vec3=>noiseGenerator.spawn(worldSeed,x,z);

interface SquareAutomation {
  routine:'square';origin:Vec3;forward:[number,number];right:[number,number];startYaw:number;
  corner:0|1|2|3;phase:'patrol'|'showcase'|'reverse'|'return';lastCommand:'path'|'detour'|'showcase';avoidSide:-1|1;cycles:number;
}

function initializeSquare(entity:Entity){
  const startYaw=((Math.round(entity.yaw/90)*90)%360+360)%360,angle=startYaw*Math.PI/180,forward:[number,number]=[Math.sin(angle),Math.cos(angle)],right:[number,number]=[Math.cos(angle),-Math.sin(angle)];
  entity.yaw=startYaw;entity.automation={routine:'square',origin:[...entity.position],forward,right,startYaw,corner:0,phase:'patrol',lastCommand:'path',avoidSide:1,cycles:0} satisfies SquareAutomation;
}

function squareAutomationAction(entity:Entity):Action|undefined{
  if(entity.kind!=='miner-robot')return;
  if(entity.automation?.routine!=='square')initializeSquare(entity);
  const state=entity.automation as unknown as SquareAutomation;
  if(state.phase==='showcase'){state.phase='reverse';state.lastCommand='showcase';return{action:'reverse',distance:1.5};}
  if(state.phase==='reverse'){state.phase='return';return{action:'walk',target:[...state.origin]};}
  if(state.phase==='return'){
    if(Math.hypot(entity.position[0]-state.origin[0],entity.position[2]-state.origin[2])>.12)return{action:'walk',target:[...state.origin]};
    state.phase='patrol';entity.yaw=state.startYaw;delete entity.lastAction;
  }
  const f=state.forward,r=state.right,o=state.origin,corners:Vec3[]=[
    [o[0]+f[0]*10,o[1],o[2]+f[1]*10],
    [o[0]+f[0]*10+r[0]*10,o[1],o[2]+f[1]*10+r[1]*10],
    [o[0]+r[0]*10,o[1],o[2]+r[1]*10],
    [...o],
  ];
  let target=corners[state.corner];
  if(Math.hypot(entity.position[0]-target[0],entity.position[2]-target[2])<=.12){
    if(state.corner===3){
      state.corner=0;state.phase='showcase';state.lastCommand='showcase';state.cycles++;entity.yaw=state.startYaw;delete entity.lastAction;
      entity.motion={kind:'showcase',destination:[...entity.position],origin:[...entity.position],speed:0,progress:0,duration:3,startYaw:state.startYaw};entity.status='showcasing';return;
    }
    state.corner=(state.corner+1) as 0|1|2|3;target=corners[state.corner];delete entity.lastAction;
  }
  if(entity.lastAction?.ok===false){
    if(state.lastCommand==='detour')state.avoidSide=state.avoidSide===1?-1:1;
    const dx=target[0]-entity.position[0],dz=target[2]-entity.position[2],length=Math.max(.001,Math.hypot(dx,dz)),ahead:[number,number]=[dx/length,dz/length],side:[number,number]=[ahead[1]*state.avoidSide,-ahead[0]*state.avoidSide];
    state.lastCommand='detour';delete entity.lastAction;
    return{action:'walk',target:[entity.position[0]+side[0]*2.25,entity.position[1],entity.position[2]+side[1]*2.25]};
  }
  state.lastCommand='path';return{action:'walk',target};
}

const min01: Entity = {
  id: 'min-01',
  name: 'MIN-01',
  kind: 'miner-robot',
  team: 'commander-fleet',
  controller: 'static',
  enabled: true,
  position: spawn(formationX.min01,frontZ),
  yaw: 0,
  height: 2.86,
  hitbox: { radius: .86, height: 2.86, terrainRadius:.86 },
  color: '#7b817b',
  inventory: {stacks:[],selected:null,capacity:640},
  orderCapabilities:['move','patrol','search','mine','defend','repair'],
  status: 'idle',
  appearance:{material:'iron'},
};

const min02: Entity = {
  ...min01,
  id: 'min-02',
  name: 'MIN-02',
  position: spawn(formationX.min02,frontZ),
  color: '#c4cbcd',
  hitbox: { ...min01.hitbox! },
  appearance:{material:'steel'},
};

const min03: Entity = {
  ...min01,
  id:'min-03',
  name:'MIN-03',
  position:spawn(formationX.min03,frontZ),
  color:'#e6eef1',
  hitbox:{radius:slimRadius,height:2.86,terrainRadius:slimRadius},
  appearance:{material:'titanium',widthScale:.82,metalness:.99,roughness:.16},
};

const poweredVariant=(base:Entity,id:string,name:string,z:number,powerModule:'lithium-battery'|'nuclear-reactor'):Entity=>({
  ...base,id,name,position:spawn(base.position[0],z),hitbox:{...base.hitbox!},appearance:{...base.appearance,powerModule},
});
const baseMiners=[min01,min02,min03];
const batteryMiners=[
  poweredVariant(min01,'min-01bt','MIN-01BT',batteryZ,'lithium-battery'),
  poweredVariant(min02,'min-02bt','MIN-02BT',batteryZ,'lithium-battery'),
  poweredVariant(min03,'min-03bt','MIN-03BT',batteryZ,'lithium-battery'),
];
const reactorMiners=[
  poweredVariant(min01,'min-01nr','MIN-01NR',reactorZ,'nuclear-reactor'),
  poweredVariant(min02,'min-02nr','MIN-02NR',reactorZ,'nuclear-reactor'),
  poweredVariant(min03,'min-03nr','MIN-03NR',reactorZ,'nuclear-reactor'),
];
const miners=[...baseMiners,...batteryMiners,...reactorMiners];

export function createRvrWorld(generator: WorldGenerator = noiseGenerator): WorldDefinition {
  const generatedMiners=miners.map(robot=>({...robot,position:generator.spawn(worldSeed,robot.position[0],robot.position[2])}));
  const waterLevel=generator.terrain?.type==='noise'?generator.terrain.waterLevel:-32;
  return {
  manifest: {
    id: 'robots-vs-robots',
    version: 3,
    name: 'Robots vs Robots',
    seed: worldSeed,
    description: `${generator.description} Persistent server world for robots, vehicles and up to 20 players.`,
    bounds: { min: [-1_000_000_000, -32, -1_000_000_000], max: [1_000_000_000, 64, 1_000_000_000] },
    infiniteHorizontal: true,
    terrain:generator.terrain,
    view: { overviewPosition: [18, 18, 26], overviewTarget: [.5, 4, .5], maxDistance: 120, fog: { near: 75, far: 150 } },
    waterLevel,
    gravity: 9.81,
    daySeconds: WORLD_DAY_SECONDS,
    vocabulary: [],
    perception: { range: 18, fieldOfView: 120, maxBlocks: 96 },
    materials,
    agentInstructions: 'You are {name}, an embodied robot in an unbounded physical world. Choose your own goals and success conditions from what you can perceive and remember.',
    planningInstructions: 'Choose and maintain your own direction, project, immediate task, and success conditions from your local experience.',
  },
  generate: () => ({ blocks: generator.initialBlocks?.()??[], entities: generatedMiners }),
  initializeAutomaton:initializeSquare,
  automatonAction:squareAutomationAction,
  migrateState(state) {
    const exact=generatedMiners.every(template=>{
      const existing=state.entities.find(entity=>entity.id===template.id);
      return existing&&JSON.stringify(existing.hitbox)===JSON.stringify(template.hitbox)&&JSON.stringify(existing.appearance)===JSON.stringify(template.appearance);
    });
    if(exact){
      const needsOrderUpgrade=generatedMiners.some(template=>{const existing=state.entities.find(entity=>entity.id===template.id);return existing?.team!==template.team||JSON.stringify(existing?.orderCapabilities)!==JSON.stringify(template.orderCapabilities)||!existing?.inventory;});
      if(!needsOrderUpgrade)return;
      const templates=new Map(generatedMiners.map(robot=>[robot.id,robot]));
      return{state:{...state,entities:state.entities.map(entity=>{const template=templates.get(entity.id);return template?{...entity,team:template.team,orderCapabilities:template.orderCapabilities?[...template.orderCapabilities]:undefined,inventory:entity.inventory??{stacks:[],selected:null,capacity:640}}:entity;})},events:[{actor:'world',type:'order-system-upgrade',message:'The miner fleet received queued movement, harvesting, defense, repair, and teammate right-of-way capabilities.'}]};
    }
    const migrated=generatedMiners.map(template=>{
      const existing=state.entities.find(entity=>entity.id===template.id),robot:Entity={...existing,...template,enabled:existing?.enabled!==false,controller:'static',status:'idle',inventory:existing?.inventory??{stacks:[],selected:null,capacity:640}};
      delete robot.plan;delete robot.motion;delete robot.following;delete robot.lastAction;delete robot.automation;
      delete robot.movementPrompt;delete robot.followInvitation;delete robot.speech;delete robot.speechBudget;return robot;
    });
    const ids=new Set(['duck',...generatedMiners.map(robot=>robot.id)]);
    return {
      state:{...state,entities:[...state.entities.filter(entity=>!ids.has(entity.id)),...migrated]},
      events:[{
        actor:'world',type:'entity-formation',message:'The base miners formed the front row, their lithium-battery variants formed behind them, and their compact nuclear-reactor variants formed the rear row. All nine robots face forward with at least one metre of clearance.',
        data:{removed:['duck'],robots:migrated.map(robot=>({id:robot.id,position:robot.position,material:robot.appearance?.material}))},
      }],
    };
  },
  };
}

export const rvrWorld = createRvrWorld();
