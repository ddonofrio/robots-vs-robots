import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, rm, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { once } from 'node:events';
import { inflateSync } from 'node:zlib';
import { createRvrWorld, loadWorldGenerator, minerals } from '../src/world';
import { MAX_PLAYERS } from '../src/shared/protocol';
import { parseEntityOrder } from '../src/shared/orders';
import { enabledProviders, normalizeReasoningSettings, providersFromEnv } from './agents/providers';
import { WorldRuntime } from './world-runtime';

const port=Number(process.env.PORT??3000),host=process.env.HOST?.trim()||'127.0.0.1';
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be a valid TCP port.');
const dataDirectory=resolve(process.env.DATA_DIR??'data');
const generator=loadWorldGenerator(process.env.WORLD_GENERATOR?.trim()||'noise');
const world=createRvrWorld(generator);
const providerConfigs=providersFromEnv(),reasoning=normalizeReasoningSettings(undefined);
const maxTurns=process.env.AGENT_MAX_TURNS?.trim()?Number(process.env.AGENT_MAX_TURNS):null;
if(maxTurns!==null&&(!Number.isInteger(maxTurns)||maxTurns<=0))throw new Error('AGENT_MAX_TURNS must be a positive integer.');

let stopping=false;
const createRuntime=()=>new WorldRuntime(world,dataDirectory,{
  providers:enabledProviders(providerConfigs),providerStrategy:'fallback',reasoning,maxTurns,
  scriptedDemo:process.env.SCRIPTED_DEMO==='true',
  fatal(error){console.error('RvR world failure:',error);void shutdown(1);},
});
let runtime=createRuntime();

const production=process.argv.includes('--production');
const vite=production?undefined:await(await import('vite')).createServer({server:{middlewareMode:true},appType:'spa'});
const mime:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const json=(res:ServerResponse,value:unknown,code=200)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
const body=async(req:IncomingMessage,limit=32_768)=>{let value='';for await(const chunk of req){value+=chunk;if(value.length>limit)throw new Error('Request too large.');}return value?JSON.parse(value) as Record<string,unknown>:{};};
const adminAuthorized=(req:IncomingMessage)=>{
  const loopback=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress??'');
  if(loopback)return true;
  const configured=process.env.ADMIN_TOKEN?.trim();
  return !!configured&&req.headers['x-rvr-admin']===configured;
};
const publicLlmConfig=()=>({
  strategy:runtime.agents.inference.providers.length<2?'first-only':runtime.agents.inference.strategy,
  reasoning:runtime.agents.reasoningSettings,currentStatus:runtime.agents.inference.currentStatus,
  providers:providerConfigs.map(provider=>({id:provider.id,type:provider.type??'openai-compatible',enabled:provider.enabled!==false,name:provider.name,baseUrl:provider.baseUrl,model:provider.model,region:provider.region,displayModel:provider.displayModel,apiKeyConfigured:!!provider.apiKey,vastTokenConfigured:!!provider.vastToken,tokenless:provider.tokenless===true,health:runtime.agents.inference.healthFor(provider.id)})),
});
const metadata=()=>({...runtime.metadata(publicLlmConfig()),generator:generator.id,maxPlayers:MAX_PLAYERS});
const mineralIds=new Set(minerals.map(mineral=>mineral.id));

async function resetWorld(){
  runtime.close();
  const recording=resolve(dataDirectory,'world.sqlite');
  await Promise.all([recording,`${recording}-shm`,`${recording}-wal`].map(path=>rm(path,{force:true})));
  runtime=createRuntime();
}

const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url??'/',`http://${req.headers.host??`${host}:${port}`}`);
    if(req.headers.origin&&new URL(req.headers.origin).host!==(req.headers.host??'')){json(res,{error:'Cross-origin access is disabled.'},403);return;}
    if(url.pathname.startsWith('/api/')){
      const {engine,store,clock}=runtime;
      if(url.pathname==='/api/health'&&req.method==='GET'){json(res,{ok:true,tick:engine.tick,generator:generator.id,maxPlayers:MAX_PLAYERS});return;}
      if(url.pathname==='/api/meta'&&req.method==='GET'){json(res,metadata());return;}
      if(url.pathname==='/api/llm-config'&&req.method==='GET'){json(res,publicLlmConfig());return;}
      if(url.pathname==='/api/control'&&req.method==='POST'){
        if(!adminAuthorized(req)){json(res,{error:'Administrator access is required.'},403);return;}
        const data=await body(req);
        if(data.reset===true){await resetWorld();json(res,{...metadata(),reset:true});return;}
        if(typeof data.running==='boolean'){json(res,{...metadata(),running:runtime.setRunning(data.running)});return;}
        if(typeof data.parallelRequests==='boolean'){runtime.agents.setParallelRequests(data.parallelRequests);json(res,metadata());return;}
        if(typeof data.entityId==='string'&&['manual','automaton'].includes(String(data.controlMode))){
          if(engine.setEntityControlMode(data.entityId,String(data.controlMode) as 'manual'|'automaton')){clock.entityChanged();runtime.publishFrame(true);}json(res,{...metadata(),entity:engine.entity(data.entityId)});return;
        }
        if(typeof data.entityId==='string'&&['up','down','left','right'].includes(String(data.manualDirection))){
          const entity=engine.entity(data.entityId);
          if(entity.controller!=='static'){json(res,{error:'Arrow-key control is only available for static characters.'},409);return;}
          if(entity.motion){json(res,{error:`${entity.name} is still moving.`},409);return;}
          const offsets:Record<string,[number,number]>={up:[0,-.5],down:[0,.5],left:[-.5,0],right:[.5,0]},offset=offsets[String(data.manualDirection)];
          const result=engine.act(entity.id,{action:'walk',target:[entity.position[0]+offset[0],entity.position[1],entity.position[2]+offset[1]]},'manual');
          clock.entityChanged();runtime.publishFrame(true);json(res,{...metadata(),entity:engine.entity(entity.id),result});return;
        }
        if(typeof data.entityId==='string'&&typeof data.entityEnabled==='boolean'){
          if(engine.setEntityEnabled(data.entityId,data.entityEnabled)){clock.entityChanged();runtime.publishFrame(true);}json(res,{...metadata(),entity:engine.entity(data.entityId)});return;
        }
        json(res,{error:'Unsupported control request.'},400);return;
      }
      if(url.pathname==='/api/orders'&&req.method==='POST'){
        if(!adminAuthorized(req)){json(res,{error:'Commander access is required.'},403);return;}
        const data=await body(req),entityIds=Array.isArray(data.entityIds)?data.entityIds.filter((id):id is string=>typeof id==='string'):[];
        const order=parseEntityOrder(data.order,mineralIds),result=engine.queueOrders(entityIds,order);
        clock.entityChanged();runtime.publishFrame(true);json(res,{...metadata(),orderId:result.id,entities:result.entities});return;
      }
      if(url.pathname==='/api/orders/cancel'&&req.method==='POST'){
        if(!adminAuthorized(req)){json(res,{error:'Commander access is required.'},403);return;}
        const data=await body(req),entityIds=Array.isArray(data.entityIds)?data.entityIds.filter((id):id is string=>typeof id==='string'):[];
        if(typeof data.orderId!=='string'){json(res,{error:'Order ID is required.'},400);return;}
        const cancelled=engine.cancelOrder(entityIds,data.orderId);clock.entityChanged();runtime.publishFrame(true);json(res,{...metadata(),cancelled,entities:entityIds.map(id=>engine.entity(id))});return;
      }
      if(req.method!=='GET'){json(res,{error:'Method not allowed.'},405);return;}
      const requestedTick=Number(url.searchParams.get('tick')??engine.tick);
      if(!Number.isFinite(requestedTick)||requestedTick<0){json(res,{error:'Invalid tick.'},400);return;}
      if(url.pathname==='/api/state'){json(res,{...metadata(),state:store.stateAt(requestedTick),events:store.eventsAt(requestedTick)});return;}
      if(url.pathname==='/api/memory'){if(!adminAuthorized(req)){json(res,{error:'Administrator access is required.'},403);return;}const actor=url.searchParams.get('actor')?.trim();if(!actor){json(res,{error:'Actor is required.'},400);return;}json(res,store.memoryAt(requestedTick,actor));return;}
      if(url.pathname==='/api/events'){json(res,store.eventsAt(requestedTick,url.searchParams.get('actor')??'',120));return;}
      if(url.pathname==='/api/frames'){json(res,store.framesAfter(requestedTick));return;}
      if(url.pathname==='/api/stream'){
        res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive','X-Accel-Buffering':'no'});
        res.write(`event: boot\ndata: ${JSON.stringify({...metadata(),state:engine.state(),events:store.eventsAt(engine.tick)})}\n\n`);
        runtime.clients.add(res);req.on('close',()=>runtime.clients.delete(res));return;
      }
      if(url.pathname==='/api/export'){
        const endTick=store.latestTick();res.writeHead(200,{'Content-Type':'application/x-ndjson','Content-Disposition':`attachment; filename="rvr-day-${engine.day}.ndjson"`});
        res.write(JSON.stringify({type:'world',clock:metadata().clock,world:runtime.world.manifest,state:store.stateAt(0)})+'\n');
        for(const row of store.db.prepare('SELECT data FROM frames WHERE tick <= ? ORDER BY tick').iterate(endTick) as Iterable<{data:Uint8Array}>){if(res.destroyed)break;if(!res.write(JSON.stringify({type:'frame',frame:JSON.parse(inflateSync(row.data).toString())})+'\n'))await once(res,'drain');}
        res.end();return;
      }
      json(res,{error:'Unknown endpoint.'},404);return;
    }
    if(vite){vite.middlewares(req,res);return;}
    const root=resolve('dist');let path=resolve(root,'.'+decodeURIComponent(url.pathname));
    if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    if(url.pathname==='/'||!(await stat(path).catch(()=>null))?.isFile())path=resolve(root,'index.html');
    res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream'});res.end(await readFile(path));
  }catch(error){if(!res.headersSent)json(res,{error:error instanceof Error?error.message:'Request failed.'},500);else res.end();}
});

const timer=setInterval(()=>{try{runtime.pump();}catch(error){console.error('Simulation stopped:',error);void shutdown(1);}},20);
const heartbeat=setInterval(()=>runtime.broadcast('status',{runtime:runtime.clock.status()}),10_000);
server.listen(port,host,()=>console.log(`RvR server: http://${host}:${port} (generator: ${generator.id}, max players: ${MAX_PLAYERS})`));
server.on('error',error=>{console.error(error);void shutdown(1);});
async function shutdown(code=0){if(stopping)return;stopping=true;clearInterval(timer);clearInterval(heartbeat);try{runtime.close();}catch(error){console.error(error);code=1;}await vite?.close();server.close();process.exit(code);}
process.on('SIGINT',()=>void shutdown());process.on('SIGTERM',()=>void shutdown());
