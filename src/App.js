import { createInitialGame, reduceAction, completePlayerTurn, punishOptions, RETRY_REASONS } from './core/gameState.js';
import { episodes } from './data/episodes/index.js';
import { navigation } from './components/Navigation.js';
import { Splash, lobbyControls } from './screens/opening/Splash.js';
import { TravellerSetup, otherSeatMarkup } from './screens/opening/TravellerSetup.js';
import { roomCodeFromUrl, inviteLink, createRoom, joinRoom, roomStatus, connectRoom, sendAct, sendProfile, sendReady, saveSession, loadSession, clearSession, copyText } from './core/multiplayer.js';
import { Proclamation } from './screens/opening/Proclamation.js';
import { Skills } from './screens/opening/Skills.js';
import { Episode01 } from './screens/episodes/Episode01/index.js';
import { Episode02 } from './screens/episodes/Episode02/index.js';
import { Episode03 } from './screens/episodes/Episode03/index.js';
import { Episode04 } from './screens/episodes/Episode04/index.js';
import { Episode05 } from './screens/episodes/Episode05/index.js';
import { challenges as episode01Challenges } from './data/episodes/episode01Challenges.js';
import { startAmbient, stopAmbient, fadeAmbient, startGameplay, stopGameplay, toggleAmbient, pauseGameplay, resumeGameplay, isSoundEnabled, playGameMove } from './core/audio.js';
import { mapCameraPose } from './components/GameMap.js';
import { currentChallenge } from './core/challengeSelect.js';
import { checkListeningAnswer, LISTENING_POINTS } from './core/listeningEngine.js';
import { checkQuizAnswer, checkReadingAnswer, checkWritingLength, writingVerdicts, POINTS } from './core/challengeBank.js';

const TURN_FEEDBACK_MS = 1800;
const CAMERA_MS = 2400;
const MOVE_MS = 4200;
const BACK_MS = 2000;
const isLocked = state => state?.status === 'correct' || state?.status === 'incorrect';
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export function createApp(root) {
  let game = createInitialGame();
  let timer = null;
  let previewTimer = null;
  let previewKey = null;
  let mapDrag = null;
  let turnTimer = null;
  let writingSync = null;
  let cameraFrame = null;
  let recognition = null;
  const gameEpisodes = episodes.map(item => item.id===1 ? {...item, challenges: episode01Challenges} : item);

  // Shows the card's green/red feedback, then hands the turn to the other player.
  function finishTurn(points){
    playGameMove(points > 0 ? 'correct' : 'incorrect');
    const owner=game.activePlayer;
    clearTimeout(turnTimer);
    turnTimer=setTimeout(()=>{
      if(game.screen!=='challenge' || game.activePlayer!==owner) return;
      game=completePlayerTurn(game,points);
      render();
      runMoveAnimation();
    },TURN_FEEDBACK_MS);
  }

  // Cinematic move: the camera follows the mover while the avatar travels the new leg of the route.
  function runMoveAnimation(){
    const anim=game.moveAnim;
    animateMapTo(game.camera);
    runBackAnimation();
    if(!anim) return;
    const legs=[];
    for(let leg=anim.from;leg<anim.to;leg++){const path=root.querySelector(`#leg-${leg}`);if(path) legs.push(path);}
    if(!legs.length) return;
    const start=performance.now();
    const step=now=>{
      const pin=root.querySelector(`[data-pin="${anim.player}"]`);
      if(!pin) return;
      const elapsed=Math.max(0,now-start);
      const index=Math.min(legs.length-1,Math.floor(elapsed/MOVE_MS));
      const t=Math.min(1,(elapsed-index*MOVE_MS)/MOVE_MS);
      const path=legs[index];
      const point=path.getPointAtLength(path.getTotalLength()*ease(t));
      pin.setAttribute('transform',`translate(${(point.x+Number(pin.dataset.offset)).toFixed(1)} ${(point.y+12).toFixed(1)})`);
      if(elapsed<legs.length*MOVE_MS) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  // A setback: the affected avatar walks back along the leg it last travelled.
  function runBackAnimation(){
    const back=game.backAnim;
    if(!back) return;
    const path=root.querySelector(`#leg-${back.from-1}`);
    if(!path) return;
    const length=path.getTotalLength();
    const start=performance.now();
    const step=now=>{
      const pin=root.querySelector(`[data-pin="${back.player}"]`);
      if(!pin) return;
      const t=Math.min(1,Math.max(0,now-start)/BACK_MS);
      const point=path.getPointAtLength(length*(1-ease(t)));
      pin.setAttribute('transform',`translate(${(point.x+Number(pin.dataset.offset)).toFixed(1)} ${(point.y+12).toFixed(1)})`);
      if(t<1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Audio that finishes (or cannot load) unlocks the answer field, keeping any text already typed.
  function markListeningPlayed(){
    if(game.screen!=='challenge' || game.listening?.played) return;
    const input=root.querySelector('#listening-answer');
    game={...game,listening:{...game.listening,played:true,value:input?.value ?? ''}};
    render();
    root.querySelector('#listening-answer')?.focus();
  }

  function formatTime(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}

  function startTimer(){
    clearInterval(timer);
    timer=setInterval(()=>{
      if(!['map','challenge','result'].includes(game.screen)){stopTimer();return;}
      if(game.timerSeconds<=0){stopTimer();game.screen='report';render();return;}
      game.timerSeconds--;
      const clock=document.querySelector('.hud-clock strong');
      if(clock) clock.textContent=formatTime(game.timerSeconds);
    },1000);
  }
  function stopTimer(){clearInterval(timer);timer=null;}

  function applyMapView(view) {
    const world = root.querySelector('.map-world');
    if (world) world.setAttribute('transform', `translate(${view.x.toFixed(1)} ${view.y.toFixed(1)}) scale(${view.scale.toFixed(2)})`);
  }

  function animateMapTo(camera) {
    const target = mapCameraPose(camera);
    const from = game.mapView || mapCameraPose('overview');
    cancelAnimationFrame(cameraFrame);
    const start = performance.now();
    const step = now => {
      if (!root.querySelector('.map-world')) return;
      const e = ease(Math.min(1, (now - start) / CAMERA_MS));
      game.mapView = {
        scale: from.scale + (target.scale - from.scale) * e,
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e
      };
      applyMapView(game.mapView);
      if (e < 1) cameraFrame = requestAnimationFrame(step);
    };
    cameraFrame = requestAnimationFrame(step);
  }


  function mapPoint(svg, event) {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(svg.getScreenCTM().inverse());
  }

  function zoomMap(nextScale, anchor = { x: 800, y: 460 }) {
    const current = game.mapView || mapCameraPose(game.camera);
    const scale = Math.max(1, Math.min(6, nextScale));
    const ratio = scale / current.scale;
    game.mapView = {
      scale,
      x: anchor.x - (anchor.x - current.x) * ratio,
      y: anchor.y - (anchor.y - current.y) * ratio
    };
    applyMapView(game.mapView);
  }

  function screenMarkup(){
    if(game.screen==='splash') return Splash(isSoundEnabled(),lobby);
    if(game.screen==='proclamation') return Proclamation(isSoundEnabled());
    if(game.screen==='mission') return Skills(isSoundEnabled());
    if(game.screen==='setup') return TravellerSetup(net ? {...game,net} : game, isSoundEnabled());
    if(game.screen==='episode1Briefing') return Episode01({game:net ? {...game,net} : game,episodes:gameEpisodes});
    if(game.screen==='challenge' || game.screen==='result' || game.screen==='report') return Episode01({game:net ? {...game,net} : game,episodes:gameEpisodes});
    const episode=gameEpisodes[(game.previewEpisode??1)-1] ?? episodes[0];
    if(episode.id===1) return Episode01({game,episodes:gameEpisodes});
    const previews={2:Episode02,3:Episode03,4:Episode04,5:Episode05};
    return previews[episode.id]({game,episode,episodes:gameEpisodes});
  }

  function render(){
    const shouldPreview = game.screen === 'challenge' && game.playerPreview;
    const nextPreviewKey = shouldPreview
      ? `${game.activePlayer}:${game.players[game.activePlayer]?.position}`
      : null;
    if (nextPreviewKey !== previewKey) {
      clearTimeout(previewTimer);
      previewTimer = null;
      previewKey = nextPreviewKey;
      if (nextPreviewKey) {
        const moving = Boolean(game.moveAnim || game.backAnim);
        const moveDuration = Math.max(
          game.moveAnim ? (game.moveAnim.to - game.moveAnim.from) * MOVE_MS : 0,
          game.backAnim ? BACK_MS : 0
        );
        const previewDuration = game.notice ? 3800 : 1600;
        previewTimer = setTimeout(() => {
          if (game.screen !== 'challenge' || !game.playerPreview) return;
          const currentKey = `${game.activePlayer}:${game.players[game.activePlayer]?.position}`;
          if (currentKey !== nextPreviewKey) return;
          if (game.moveAnim || game.backAnim) {
            game = { ...game, moveAnim: null, backAnim: null };
            previewKey = null;
            previewTimer = null;
            render();
            return;
          }
          const nextStop = Math.min(14, game.players[game.activePlayer].position);
          game = { ...game, playerPreview: false, moveAnim: null, backAnim: null, camera: `stop:${nextStop}` };
          previewKey = null;
          previewTimer = null;
          render();
          animateMapTo(game.camera);
        }, moving ? moveDuration + 500 : previewDuration);
      }
    }
    const gameScreen=['map','challenge','result','report'].includes(game.screen);
    const listeningOpen=game.screen==='challenge' && !game.playerPreview && currentChallenge(game)?.listening
      && game.listening?.status!=='correct' && game.listening?.status!=='incorrect';
    if(listeningOpen) pauseGameplay(); else resumeGameplay();
    root.innerHTML=`<div class="app">${navigation({screen:game.screen,gameScreen})}${screenMarkup()}</div>`;
  }

  // Two-player lobby: the host creates a room and shares the link; the guest's ENTER click joins it.
  const inviteCode = roomCodeFromUrl();
  let lobby = { mode: inviteCode ? 'invite' : 'choose' };
  let session = null;
  let closeRoom = null;
  let net = null;

  function setLobby(next){
    lobby={...lobby,...next};
    const slot=game.screen==='splash' ? root.querySelector('#lobby') : null;
    if(slot) slot.innerHTML=lobbyControls(lobby); else render();
  }

  function leaveRoom(){
    closeRoom?.(); closeRoom=null; session=null; net=null; clearSession();
  }

  function openRoom(next){
    session=next; saveSession(next);
    closeRoom?.();
    closeRoom=connectRoom(next,{
      onRoom:onRoomUpdate,
      onAct:onRemoteAct,
      onDenied:()=>{ leaveRoom(); setLobby({mode:'choose',error:'That room has closed.'}); }
    });
  }

  // Applies a server snapshot: the other seat's traveller, ready flags, and the shared game start.
  function onRoomUpdate(snapshot){
    if(!session) return;
    const mine=session.seat, other=mine==='student' ? 'guide' : 'student';
    net={seat:mine,meReady:snapshot.seats[mine].ready,otherReady:snapshot.seats[other].ready};
    const theirs=snapshot.seats[other];
    if(theirs.avatar || theirs.name){
      game=reduceAction(game,{type:'set-player',player:other,name:theirs.name || game.players[other].name,avatar:theirs.avatar || game.players[other].avatar});
    }
    if(game.screen==='splash' && snapshot.phase!=='lobby'){ lobby={mode:'choose'}; dispatch('next'); return; }
    if(snapshot.phase==='playing' && game.screen==='episode1Briefing'){ startEpisode(snapshot.seed); return; }
    if(game.screen==='setup'){
      const slot=root.querySelector('#other-seat');
      if(slot) slot.innerHTML=otherSeatMarkup({...game,net});
      root.querySelectorAll('.avatar-choice').forEach(choice=>{
        const taken=choice.dataset.avatar===game.players[other].avatar;
        choice.disabled=taken; choice.classList.toggle('taken',taken);
      });
    } else if(game.screen==='episode1Briefing') render();
  }

  function shareProfile(next){
    if(session) sendProfile(session,next);
  }

  function hostRoom(){
    setLobby({mode:'creating',error:null});
    createRoom().then(next=>{
      openRoom(next);
      shareProfile({name:game.players.student.name,avatar:game.players.student.avatar});
      const link=inviteLink(next.code);
      setLobby({mode:'waiting',link,copied:false});
      copyText(link).then(ok=>{ if(ok && lobby.mode==='waiting') setLobby({copied:true}); });
    }).catch(()=>setLobby({mode:'choose',error:'Could not create a room. Please try again.'}));
  }

  function joinInvite(){
    setLobby({mode:'joining',error:null});
    startAmbient();
    joinRoom(inviteCode).then(next=>{
      openRoom(next);
      shareProfile({name:game.players.guide.name,avatar:game.players.guide.avatar});
      history.replaceState(null,'',location.pathname);
      lobby={mode:'choose'};
      dispatch('next');
    }).catch(error=>setLobby({mode:'invite',error:error.reason==='full'
      ? 'This room already has two players.'
      : 'This invite link is not valid or has expired.'}));
  }

  function restoreRoom(){
    const saved=loadSession();
    if(saved && (!inviteCode || inviteCode===saved.code)){
      lobby=saved.seat==='student' ? {mode:'waiting',link:inviteLink(saved.code),copied:false} : {mode:'joining'};
      openRoom(saved);
      return;
    }
    if(saved) clearSession();
    if(inviteCode) roomStatus(inviteCode).then(status=>{
      if(!status.exists) setLobby({error:'This invite link is not valid or has expired.'});
      else if(status.full) setLobby({error:'This room already has two players.'});
    });
  }

  function startEpisode(seed){
    fadeAmbient(1200).then(()=>startGameplay());
    game=reduceAction(game,{type:'start-episode',episodeId:1,seed});
    startTimer(); render(); animateMapTo('london');
  }

  // In-game actions replayed on both browsers. The question owner answers; the other player judges.
  const SYNCED=new Set(['start-challenge','select-answer','check-reading','check-listening','quiz-punish','judge','submit-writing']);
  const JUDGE_ACTIONS=new Set(['judge']);

  function onRemoteAct(msg){
    if(!net || msg.from===net.seat) return;
    if(msg.a==='writing'){
      const value=String(msg.v ?? '');
      game={...game,writing:{...game.writing,value}};
      const field=root.querySelector('#writing-text');
      if(field) field.value=value;
      updateWritingCount(value);
      return;
    }
    if(SYNCED.has(msg.a)) dispatch(msg.a,msg.s ?? undefined,undefined,undefined,true,msg.v ?? undefined);
  }

  function updateWritingCount(value){
    const challenge=currentChallenge(game);
    if(challenge?.lane!=='Writing') return;
    const {words,ok}=checkWritingLength(challenge,value);
    const counter=root.querySelector('#writing-count');
    if(counter){counter.textContent=`${words} words · ${challenge.minWords}–${challenge.maxWords}`;counter.classList.toggle('ok',ok);}
  }

  function dispatch(actionName, stopId, player, avatar, remote=false, extra){
    if(actionName==='judge' && !remote && !game.verdict){
      const lane=currentChallenge(game)?.lane;
      const judging=!net || game.activePlayer!==net.seat;
      if(judging && stopId==='RETRY' && (lane==='Speaking' || lane==='Writing')){ game={...game,reasonPick:true}; render(); return; }
    }
    if(actionName==='judge-back'){ if(game.reasonPick && !game.verdict){ game={...game,reasonPick:false}; render(); } return; }
    if(net && SYNCED.has(actionName) && !remote){
      const owner=game.activePlayer===net.seat;
      if(JUDGE_ACTIONS.has(actionName)===owner) return;
      if(actionName==='check-listening') extra=root.querySelector('#listening-answer')?.value ?? '';
      if(actionName==='submit-writing') extra=root.querySelector('#writing-text')?.value ?? game.writing?.value ?? '';
      sendAct(session,{a:actionName,s:stopId ?? null,v:extra ?? null});
    }
    if(actionName==='host-room'){ hostRoom(); return; }
    if(actionName==='join-room'){ joinInvite(); return; }
    if(actionName==='cancel-room'){ leaveRoom(); setLobby({mode:'choose',error:null}); return; }
    if(actionName==='copy-link'){ copyText(lobby.link).then(ok=>setLobby({copied:ok})); return; }
    if(actionName==='episode'){
      game={...game,previewEpisode:Math.max(1,Math.min(5,Number(stopId)||1)),screen:'map'};
      if(game.previewEpisode===1) startTimer(); else stopTimer();
      render(); return;
    }
    if(actionName==='home-reset'){
      stopTimer(); stopGameplay(); stopAmbient(); leaveRoom(); lobby={mode:'choose'}; game=reduceAction(game,'home-reset'); render(); return;
    }
    if(actionName==='back'){
      if(['map','challenge','result','report'].includes(game.screen)) { stopGameplay(); startAmbient(); }
      game=reduceAction(game,'back');
      if(['map','challenge','result'].includes(game.screen)) startTimer(); else stopTimer();
      render(); return;
    }
    if(actionName==='toggle-sound'){
      toggleAmbient();
      render(); return;
    }
    if(actionName==='avatar'){
      if(net && player!==net.seat) return;
      if(net){
        sendProfile(session,{avatar}).then(result=>{
          if(!result) return;
          game=reduceAction(game,{type:'set-player',player,name:game.players[player].name,avatar});
          render();
        });
        return;
      }
      game=reduceAction(game,{type:'set-player',player,name:game.players[player].name,avatar});
      render(); return;
    }
    if(actionName==='next' && game.screen==='splash') startAmbient();
    if(actionName==='next' && game.screen==='setup'){
      game=reduceAction(game,{type:'navigate',screen:'episode1Briefing'}); stopTimer(); render(); return;
    }
    if(actionName==='episode-ready'){
      if(!net || net.meReady) return;
      net={...net,meReady:true};
      sendReady(session).then(result=>{ if(!result){ net={...net,meReady:false}; render(); } });
      render(); return;
    }
    if(actionName==='episode-start'){ startEpisode(); return; }
    if(actionName==='save-player'){
      const input=document.querySelector(`[data-name-for="${player}"]`);
      game=reduceAction(game,{type:'set-player',player,name:input?.value??game.players[player].name,avatar:game.players[player].avatar}); render(); return;
    }
    if(actionName==='stop'){
      const requested=Number(stopId);
      if(!Number.isFinite(requested) || requested<1 || requested>15) return;
      game={...game,activeStop:requested,selectedAnswer:null,screen:'map'};
      render();return;
    }
    if(actionName==='start-challenge'){
      game=reduceAction(game,'start-challenge');
      render(); animateMapTo('london'); return;
    }
    if(actionName==='map-zoom-in' || actionName==='map-zoom-out'){
      const current = game.mapView || mapCameraPose(game.camera);
      zoomMap(current.scale * (actionName==='map-zoom-in' ? 1.25 : 0.8));
      return;
    }
    if(actionName==='map-overview'){
      game.camera='overview';
      game.mapView=mapCameraPose('overview');
      render();
      return;
    }
    if(actionName==='select-answer'){
      if(game.screen!=='challenge' || isLocked(game.quiz)) return;
      game={...game,selectedAnswer:Number(stopId)}; render(); return;
    }
    if(actionName==='submit-writing'){
      if(currentChallenge(game)?.lane!=='Writing' || game.writing?.submitted || game.verdict) return;
      const value=String(extra ?? game.writing?.value ?? '');
      if(!value.trim()) return;
      game={...game,writing:{value,submitted:true}}; render(); return;
    }
    if(actionName==='check-reading'){
      const challenge=currentChallenge(game);
      const isQuiz=challenge?.lane==='Quiz';
      if((challenge?.lane!=='Reading' && !isQuiz) || isLocked(game.quiz) || game.selectedAnswer===null) return;
      const result=checkReadingAnswer({answer:isQuiz?challenge.correct:challenge.answer},game.selectedAnswer);
      const won=result.status==='correct';
      const choosing=isQuiz && won && punishOptions(game).length>0;
      game={...game,quiz:{status:result.status,message:result.message,choosing}};
      render();
      if(!choosing) finishTurn(won?POINTS.correct:0);
      return;
    }
    if(actionName==='quiz-punish'){
      const choice=String(stopId);
      if(currentChallenge(game)?.lane!=='Quiz' || !game.quiz?.choosing || !punishOptions(game).includes(choice)) return;
      game={...game,punish:{type:choice,by:game.activePlayer},quiz:{status:'correct',message:game.quiz.message,chosen:choice}};
      render();
      finishTurn(POINTS.correct);
      return;
    }    if(actionName==='judge'){
      const challenge=currentChallenge(game);
      const [verdict,reason]=String(stopId).split(':');
      if(game.verdict || !['GOOD','FAIR','RETRY'].includes(verdict)) return;
      if(verdict==='RETRY' && ['Speaking','Writing'].includes(challenge?.lane) && !RETRY_REASONS.includes(reason)) return;
      if(challenge?.lane==='Writing'){
        const value=net ? (game.writing?.value ?? '') : (root.querySelector('#writing-text')?.value ?? game.writing?.value ?? '');
        if(net && !game.writing?.submitted) return;
        if(!writingVerdicts(challenge,value).includes(verdict)) return;
        game={...game,writing:{value,submitted:true}};
      } else if(challenge?.lane!=='Speaking') return;
      game={...game,verdict,verdictReason:verdict==='RETRY'?(reason??null):null,reasonPick:false};
      render();
      finishTurn(POINTS[verdict]);
      return;
    }
    if(actionName==='play-listening'){
      const audio=root.querySelector('#listening-audio');
      if(!audio) return;
      audio.currentTime=0;
      audio.play().catch(()=>markListeningPlayed());
      return;
    }
    if(actionName==='check-listening'){
      const challenge=currentChallenge(game);
      const input=root.querySelector('#listening-answer');
      if(!challenge?.listening || (!input && extra===undefined) || game.listening?.status==='correct' || game.listening?.status==='incorrect') return;
      const value=extra ?? input.value;
      const result=checkListeningAnswer(challenge.listening,value);
      game={...game,listening:{played:true,value,status:result.status,message:result.message}};
      const finished=result.status==='correct' || result.status==='incorrect';
      render();
      if(!finished){root.querySelector('#listening-answer')?.focus();return;}
      finishTurn(result.status==='correct'?LISTENING_POINTS:0);
      return;
    }
    game=reduceAction(game,actionName);
    if(game.screen==='map') startTimer();
    if(game.screen==='splash') { stopTimer(); stopGameplay(); }
    render();
  }

  root.addEventListener('click', event => {
    if(event.target.matches?.('[data-select-all]')){ event.target.select(); return; }
    const target=event.target.closest('[data-action]');
    if(target){event.preventDefault();dispatch(target.dataset.action,target.dataset.stop ?? target.dataset.points,target.dataset.player,target.dataset.avatar);return;}
    const answer=event.target.closest('[data-answer]');
    if(answer){
      if(game.screen!=='challenge' || isLocked(game.quiz)) return;
      dispatch('select-answer',answer.dataset.answer);
    }
  });
  root.addEventListener('input', event => {
    if(event.target.id==='writing-text'){
      const challenge=currentChallenge(game);
      const value=event.target.value;
      game={...game,writing:{...game.writing,value}};
      if(challenge?.lane!=='Writing') return;
      updateWritingCount(value);
      if(net){
        if(game.activePlayer!==net.seat) return;
        const submit=root.querySelector('[data-action="submit-writing"]');
        if(submit) submit.disabled=!value.trim();
        clearTimeout(writingSync);
        writingSync=setTimeout(()=>sendAct(session,{a:'writing',v:game.writing?.value ?? ''}),150);
        return;
      }
      const allowed=writingVerdicts(challenge,value);
      root.querySelectorAll('[data-action="judge"]').forEach(b=>{b.disabled=!allowed.includes(b.dataset.points.split(':')[0]);});
    }
  });
  root.addEventListener('keydown', event => {
    if(event.key==='Enter' && event.target.id==='listening-answer'){event.preventDefault();dispatch('check-listening');return;}
    const target=event.target.closest('[data-action="stop"],[data-action="start-challenge"]');
    if(!target || !['Enter',' '].includes(event.key)) return;
    event.preventDefault(); dispatch(target.dataset.action,target.dataset.stop);
  });
  root.addEventListener('ended', event => { if(event.target.id==='listening-audio') markListeningPlayed(); }, true);
  root.addEventListener('error', event => { if(event.target.id==='listening-audio') markListeningPlayed(); }, true);
  root.addEventListener('pointerdown', event => {
    const svg = event.target.closest('.gameplay-map .map svg');
    if (!svg || event.target.closest('[data-action]')) return;
    mapDrag = { svg, pointerId: event.pointerId, last: mapPoint(svg,event) };
    svg.classList.add('dragging');
    root.setPointerCapture?.(event.pointerId);
  });
  root.addEventListener('pointermove', event => {
    if (!mapDrag || event.pointerId !== mapDrag.pointerId) return;
    const point = mapPoint(mapDrag.svg,event);
    const current = game.mapView || mapCameraPose(game.camera);
    game.mapView = {
      ...current,
      x: current.x + point.x - mapDrag.last.x,
      y: current.y + point.y - mapDrag.last.y
    };
    mapDrag.last = point;
    applyMapView(game.mapView);
  });
  const stopMapDrag = event => {
    if (!mapDrag || event.pointerId !== mapDrag.pointerId) return;
    mapDrag.svg.classList.remove('dragging');
    mapDrag = null;
  };
  root.addEventListener('pointerup', stopMapDrag);
  root.addEventListener('pointercancel', stopMapDrag);
  root.addEventListener('wheel', event => {
    const svg = event.target.closest('.gameplay-map .map svg');
    if (!svg) return;
    event.preventDefault();
    const point = mapPoint(svg,event);
    const current = game.mapView || mapCameraPose(game.camera);
    zoomMap(current.scale * (event.deltaY < 0 ? 1.12 : 0.89), point);
  }, { passive: false });
  root.addEventListener('change', event => {
    const input=event.target.closest('[data-name-for]');
    if(!input) return;
    game=reduceAction(game,{type:'set-player',player:input.dataset.nameFor,name:input.value,avatar:game.players[input.dataset.nameFor].avatar});
    if(net && input.dataset.nameFor===net.seat) shareProfile({name:game.players[net.seat].name});
        setTimeout(render,0);
  });

  restoreRoom();
  render();
  return { render, getState:()=>game, destroy:()=>{ stopTimer(); closeRoom?.(); } };
}

export default createApp;
