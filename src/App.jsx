import React, { useState } from 'react';
import './App.css';

function App() {
  const [players, setPlayers] = useState({
    courtA: [[null, null], [null, null]],
    courtB: [[null, null], [null, null]],
    courtC: [[null, null], [null, null]],
    courtD: [[null, null], [null, null]],
    courtE: [[null, null], [null, null]],
    queue1: [[null, null], [null, null]],
    queue2: [[null, null], [null, null]],
    queue3: [[null, null], [null, null]],
    queue4: [[null, null], [null, null]],
    queue5: [[null, null], [null, null]],
    queue6: [[null, null], [null, null]],
    waiting: [] // 預設等候區為空
  });
  const [history, setHistory] = useState([]);
  const [redoHistory, setRedoHistory] = useState([]);
  const [inputName, setInputName] = useState('');
  const [inputScore, setInputScore] = useState(300);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [showNameExists, setShowNameExists] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const handleDragStart = (e, player, source) => {
    // player 可能是 name 或物件，需找到完整物件
    let dragPlayer = player;
    if (typeof player === 'string') {
      // 從所有區域找出完整物件
      dragPlayer = null;
      // 場地區
      for (const letter of ['A','B','C','D','E']) {
        for (const row of players[`court${letter}`]) {
          for (const p of row) if (p && p.name === player) dragPlayer = p;
        }
      }
      // 順位區
      for (let i=1; i<=6; i++) {
        for (const row of players[`queue${i}`]) {
          for (const p of row) if (p && p.name === player) dragPlayer = p;
        }
      }
      // 等候區
      for (const p of players.waiting) if (p && p.name === player) dragPlayer = p;
    }
    e.dataTransfer.setData('player', JSON.stringify(dragPlayer));
    e.dataTransfer.setData('source', source);
    e.target.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const isNameInCourts = (name) => {
    return ['A', 'B', 'C', 'D', 'E'].some(courtLetter =>
      players[`court${courtLetter}`].flat().some(p => p && p.name === name)
    );
  };
  const isNameInQueues = (name) => {
    return [1, 2, 3, 4, 5, 6].some(queueNum =>
      players[`queue${queueNum}`].some(p => p && p.name === name)
    );
  };

  const updatePlayers = (updater) => {
    setPlayers(prev => {
      // 深拷貝 courtX 和 queueX
      const deepCopy = obj => Object.fromEntries(
        Object.entries(obj).map(([k, v]) =>
          k.startsWith('court') || k.startsWith('queue')
            ? [k, v.map(row => row.map(p => p && { ...p }))]
            : [k, Array.isArray(v) ? [...v] : v]
        )
      );
      setHistory(his => [deepCopy(prev), ...his].slice(0, 10));
      setRedoHistory([]);
      return updater(deepCopy(prev));
    });
  };

  const handleDrop = (e, target) => {
    e.preventDefault();
    const player = JSON.parse(e.dataTransfer.getData('player'));
    const source = e.dataTransfer.getData('source');
    if (source === target) return;
    // 目標資訊
    let tgtType = '', tgtKey = '', tgtRow = null, tgtCol = null;
    if (target.startsWith('court')) {
      tgtType = 'court';
      [tgtKey, tgtRow, tgtCol] = target.split('-').slice(1);
    } else if (target.startsWith('queue')) {
      tgtType = 'queue';
      [tgtKey, tgtRow, tgtCol] = target.split('-').slice(1);
    }
    setLastAction(target); // 記錄最後一次操作的目標格
    updatePlayers(prev => {
      const newPlayers = { ...prev };
      let sourcePlayer = player;
      let srcType = '', srcKey = '', srcRow = null, srcCol = null, srcIdx = null;
      if (source.startsWith('court')) {
        srcType = 'court';
        [srcKey, srcRow, srcCol] = source.split('-').slice(1);
        sourcePlayer = newPlayers[`court${srcKey}`][Number(srcRow)][Number(srcCol)];
      } else if (source.startsWith('queue')) {
        srcType = 'queue';
        [srcKey, srcRow, srcCol] = source.split('-').slice(1);
        sourcePlayer = newPlayers[`queue${srcKey}`][Number(srcRow)][Number(srcCol)];
      } else if (source === 'waiting') {
        srcType = 'waiting';
        srcIdx = prev.waiting.findIndex(p => p.name === player.name);
      }
      // debug log
      console.log('拖移來源:', { srcType, srcKey, srcRow, srcCol, srcIdx, sourcePlayer });
      console.log('拖移目標:', { tgtType, tgtKey, tgtRow, tgtCol });
      // 拖到等候區
      if (target === 'waiting') {
        if (srcType === 'court') {
          newPlayers[`court${srcKey}`][Number(srcRow)][Number(srcCol)] = null;
          newPlayers.waiting = [...newPlayers.waiting, sourcePlayer];
        } else if (srcType === 'queue') {
          newPlayers[`queue${srcKey}`][Number(srcRow)][Number(srcCol)] = null;
          newPlayers.waiting = [...newPlayers.waiting, sourcePlayer];
        }
        // 來源是等候區不動作
        return newPlayers;
      }
      // 拖到場地或順位格子
      if ((tgtType === 'court' || tgtType === 'queue')) {
        // 來源和目標都是格子
        if (srcType === 'court' || srcType === 'queue') {
          // 拖到自己不動作
          if (srcType === tgtType && srcKey === tgtKey && srcRow === tgtRow && srcCol === tgtCol) return newPlayers;
          // 互換內容
          let temp;
          if (tgtType === 'court') {
            temp = newPlayers[`court${tgtKey}`][Number(tgtRow)][Number(tgtCol)];
            newPlayers[`court${tgtKey}`][Number(tgtRow)][Number(tgtCol)] = sourcePlayer;
          } else {
            temp = newPlayers[`queue${tgtKey}`][Number(tgtRow)][Number(tgtCol)];
            newPlayers[`queue${tgtKey}`][Number(tgtRow)][Number(tgtCol)] = sourcePlayer;
          }
          if (srcType === 'court') {
            newPlayers[`court${srcKey}`][Number(srcRow)][Number(srcCol)] = temp;
          } else {
            newPlayers[`queue${srcKey}`][Number(srcRow)][Number(srcCol)] = temp;
          }
        } else if (srcType === 'waiting') {
          // 來源是等候區，只能移動到空格
          const tgtVal = tgtType === 'court'
            ? newPlayers[`court${tgtKey}`][Number(tgtRow)][Number(tgtCol)]
            : newPlayers[`queue${tgtKey}`][Number(tgtRow)][Number(tgtCol)];
          if (!tgtVal) {
            if (tgtType === 'court') {
              newPlayers[`court${tgtKey}`][Number(tgtRow)][Number(tgtCol)] = player;
            } else {
              newPlayers[`queue${tgtKey}`][Number(tgtRow)][Number(tgtCol)] = player;
            }
            newPlayers.waiting = newPlayers.waiting.filter((p, i) => i !== srcIdx);
          }
        }
      }
      return newPlayers;
    });
  };

  const handleAddToWaiting = () => {
    if (inputName.trim() === '') return;
    if (players.waiting.some(p => p.name === inputName.trim())) {
      setShowNameExists(true);
      return;
    }
    updatePlayers(prev => ({
      ...prev,
      waiting: [...prev.waiting, { name: inputName.trim(), score: Number(inputScore) }]
    }));
    setInputName('');
    setInputScore(300);
  };

  const handleDeleteConfirm = (confirm) => {
    if (confirm && pendingDelete) {
      const { player, source } = pendingDelete;
      updatePlayers(prev => {
        const newPlayers = { ...prev };
        if (source.startsWith('court')) {
          const [courtLetter, row, col] = source.split('-').slice(1);
          newPlayers[`court${courtLetter}`][Number(row)][Number(col)] = null;
        } else if (source.startsWith('queue')) {
          const queueNum = source.split('-')[1];
          newPlayers[`queue${queueNum}`] = newPlayers[`queue${queueNum}`].filter(p => p && p.name !== player.name);
        } else if (source === 'waiting') {
          newPlayers.waiting = newPlayers.waiting.filter(p => p.name !== player.name);
        }
        return newPlayers;
      });
    }
    setShowDeleteConfirm(false);
    setPendingDelete(null);
  };

  const handleUndo = () => {
    if (history.length > 0) {
      setPlayers(prev => {
        setRedoHistory(rh => [JSON.parse(JSON.stringify(prev)), ...rh].slice(0, 10));
        return history[0];
      });
      setHistory(his => his.slice(1));
    }
  };

  const handleRedo = () => {
    if (redoHistory.length > 0) {
      setPlayers(prev => {
        setHistory(his => [JSON.parse(JSON.stringify(prev)), ...his].slice(0, 10));
        return redoHistory[0];
      });
      setRedoHistory(rh => rh.slice(1));
    }
  };

  // 場地區重置功能
  const handleCourtReset = (courtLetter) => {
    updatePlayers(prev => {
      const newPlayers = { ...prev };
      const toWaiting = [];
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          const p = newPlayers[`court${courtLetter}`][row][col];
          if (p) toWaiting.push(p);
          newPlayers[`court${courtLetter}`][row][col] = null;
        }
      }
      newPlayers.waiting = [...newPlayers.waiting, ...toWaiting];
      return newPlayers;
    });
  };

  // 順位區重置功能
  const handleQueueReset = (queueNum) => {
    updatePlayers(prev => {
      const newPlayers = { ...prev };
      const toWaiting = [];
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          const p = newPlayers[`queue${queueNum}`][row][col];
          if (p) toWaiting.push(p);
          newPlayers[`queue${queueNum}`][row][col] = null;
        }
      }
      newPlayers.waiting = [...newPlayers.waiting, ...toWaiting];
      return newPlayers;
    });
  };

  // 順位區上場功能
  const handleQueueUp = (queueNum) => {
    updatePlayers(prev => {
      const newPlayers = { ...prev };
      if (queueNum === 1) {
        // 1. 將順位1名條依序排到場地區空格（空的優先）
        let allPlayers = [];
        for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
          const p = newPlayers[`queue1`][row][col];
          if (p) allPlayers.push(p);
        }
        let idx = 0;
        for (const letter of ['A','B','C','D','E']) {
          for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
            if (!newPlayers[`court${letter}`][row][col] && idx < allPlayers.length) {
              newPlayers[`court${letter}`][row][col] = allPlayers[idx++];
            }
          }
        }
        // 2. 順位2~6依序往前推
        for (let q = 1; q <= 5; q++) {
          for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
            newPlayers[`queue${q}`][row][col] = newPlayers[`queue${q+1}`][row][col];
          }
        }
        // 3. 清空順位6
        for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
          newPlayers[`queue6`][row][col] = null;
        }
      } else {
        // 將順位N名條移到順位N-1（空的優先）
        let allPlayers = [];
        for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
          const p = newPlayers[`queue${queueNum}`][row][col];
          if (p) allPlayers.push(p);
        }
        let idx = 0;
        for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
          if (!newPlayers[`queue${queueNum-1}`][row][col] && idx < allPlayers.length) {
            newPlayers[`queue${queueNum-1}`][row][col] = allPlayers[idx++];
          }
        }
        // 清空順位N
        for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
          newPlayers[`queue${queueNum}`][row][col] = null;
        }
      }
      return newPlayers;
    });
  };

  // 新增：一鍵加入季繳常用名單
  const handleAddSeasonPlayers = () => {
    const seasonPlayers = [
      { name: 'Jerry', score: 300 },
      { name: 'steven', score: 300 },
      { name: 'denny', score: 300 },
      { name: '包恩', score: 300 },
      { name: '阿嘎', score: 300 },
      { name: '克萊門特', score: 300 }
    ];
    updatePlayers(prev => {
      // 避免重複加入
      const existNames = prev.waiting.map(p => p.name);
      const newList = [
        ...prev.waiting,
        ...seasonPlayers.filter(p => !existNames.includes(p.name))
      ];
      return { ...prev, waiting: newList };
    });
  };

  return (
    <div className="container" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      {/* 場地區 + 排隊區 */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 32 }}>
        {/* 場地區 */}
        <div className="court-section">
          {['A', 'B', 'C', 'D', 'E'].map(courtLetter => (
            <div key={`court${courtLetter}`} className="court">
              <div className="court-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>場地{courtLetter}</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button className="join-btn" style={{ padding: '2px 10px', fontSize: 13 }} onClick={() => alert('上方隊伍勝功能待補充')}>上方隊伍勝</button>
                  <button className="join-btn" style={{ padding: '2px 10px', fontSize: 13 }} onClick={() => alert('下方隊伍勝功能待補充')}>下方隊伍勝</button>
                  <button className="join-btn" style={{ padding: '2px 10px', fontSize: 13, background: '#e57373' }} onClick={() => handleCourtReset(courtLetter)}>重置</button>
                </span>
              </div>
              <div className="court-box">
                {[0, 1].map(rowIndex => (
                  <div key={`court${courtLetter}-row${rowIndex}`} className="court-row">
                    {[0, 1].map(colIndex => {
                      const player = players[`court${courtLetter}`][rowIndex][colIndex];
                      return (
                        <div
                          key={`court${courtLetter}-${rowIndex}-${colIndex}`}
                          className="court-player"
                          draggable={!!player}
                          onDragStart={player ? (e) => handleDragStart(e, player.name, `court-${courtLetter}-${rowIndex}-${colIndex}`) : undefined}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, `court-${courtLetter}-${rowIndex}-${colIndex}`)}
                          style={{ visibility: 'visible', minHeight: 36, background: player ? undefined : 'rgba(0,0,0,0.03)', border: player ? undefined : '1px dashed #b6e2b6', fontWeight: lastAction === `court-${courtLetter}-${rowIndex}-${colIndex}` ? 'bold' : undefined, color: lastAction === `court-${courtLetter}-${rowIndex}-${colIndex}` ? 'red' : undefined }}
                        >
                          {player ? (
                            <>
                              <div>{player.name}</div>
                              <div style={{ fontSize: 13, color: '#388e3c', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                                <span style={{ marginRight: 3, fontSize: 15 }}>⚔️</span>{player.score}
                              </div>
                            </>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* 排隊區 */}
        <div className="queue-section">
          {[1, 2, 3, 4, 5, 6].map(queueNum => (
            <div key={`queue${queueNum}`} className="queue-as-court">
              <div className="court-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>順位{queueNum}</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button className="join-btn" style={{ padding: '2px 10px', fontSize: 13 }} onClick={() => handleQueueUp(queueNum)}>上場</button>
                  <button className="join-btn" style={{ padding: '2px 10px', fontSize: 13, background: '#e57373' }} onClick={() => handleQueueReset(queueNum)}>重置</button>
                </span>
              </div>
              <div className="court-box">
                {[0, 1].map(rowIndex => (
                  <div key={`queue${queueNum}-row${rowIndex}`} className="court-row">
                    {[0, 1].map(colIndex => {
                      const player = players[`queue${queueNum}`][rowIndex][colIndex];
                      return (
                        <div
                          key={`queue${queueNum}-${rowIndex}-${colIndex}`}
                          className="court-player"
                          draggable={!!player}
                          onDragStart={player ? (e) => handleDragStart(e, player.name, `queue-${queueNum}-${rowIndex}-${colIndex}`) : undefined}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, `queue-${queueNum}-${rowIndex}-${colIndex}`)}
                          style={{ visibility: 'visible', minHeight: 36, background: player ? undefined : 'rgba(0,0,0,0.03)', border: player ? undefined : '1px dashed #b6e2b6', fontWeight: lastAction === `queue-${queueNum}-${rowIndex}-${colIndex}` ? 'bold' : undefined, color: lastAction === `queue-${queueNum}-${rowIndex}-${colIndex}` ? 'red' : undefined }}
                        >
                          {player ? (
                            <>
                              <div>{player.name}</div>
                              <div style={{ fontSize: 13, color: '#388e3c', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                                <span style={{ marginRight: 3, fontSize: 15 }}>⚔️</span>{player.score}
                              </div>
                            </>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 等候區（橫向，放在下方） */}
      <div className="waiting-section">
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div className="waiting-title">等候區</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="join-btn" style={{ padding: '6px 14px', fontSize: 15, marginRight: 0, display: 'flex', alignItems: 'center', gap: 4 }} onClick={handleUndo} disabled={history.length === 0}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 4L4 10L10 16" stroke="#388e3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              回溯
            </button>
            <button className="join-btn" style={{ padding: '6px 14px', fontSize: 15, marginRight: 0, display: 'flex', alignItems: 'center', gap: 4 }} onClick={handleRedo} disabled={redoHistory.length === 0}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 16L16 10L10 4" stroke="#388e3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              還原
            </button>
          </div>
        </div>
        <ul 
          className="waiting-list"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'waiting')}
        >
          {players.waiting.map((player, index) => (
            <li
              key={`waiting-${index}`}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, player.name, 'waiting')}
              onDragEnd={handleDragEnd}
            >
              {String(index + 1).padStart(2, '0')}・{player.name}
              <div style={{ fontSize: 13, color: '#388e3c', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                <span style={{ marginRight: 3, fontSize: 15 }}>⚔️</span>{player.score}
              </div>
            </li>
          ))}
        </ul>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 }}>
          <div style={{ width: '70%', minWidth: 320, maxWidth: 600, display: 'flex', gap: 8 }} className="waiting-user-input-row">
            <input
              type="text"
              placeholder="請輸入名字"
              value={inputName}
              onChange={e => setInputName(e.target.value)}
              style={{ flex: 1, borderRadius: 8, border: '1px solid #b6e2b6', padding: '6px 12px', fontSize: 16 }}
              onKeyDown={e => { if (e.key === 'Enter') handleAddToWaiting(); }}
            />
            <select
              value={inputScore}
              onChange={e => setInputScore(e.target.value)}
              style={{ borderRadius: 8, border: '1px solid #b6e2b6', padding: '6px 8px', fontSize: 16 }}
            >
              {[100,200,300,400,500,600,700].map(score => (
                <option key={score} value={score}>{score}</option>
              ))}
            </select>
            <button className="join-btn highlight" style={{ padding: '12px 28px', fontSize: 20, fontWeight: 'bold', boxShadow: '0 2px 12px #8fd19e', background: 'linear-gradient(90deg, #43a047 0%, #8fd19e 100%)', color: '#fff', border: 'none' }} onClick={handleAddToWaiting}>加入排隊</button>
            <button className="join-btn" style={{ padding: '12px 18px', fontSize: 18, fontWeight: 'bold', background: '#fffbe6', color: '#b8860b', border: '2px solid #ffe082', marginLeft: 4 }} onClick={handleAddSeasonPlayers}>季繳常用名單登記</button>
          </div>
          <div
            className="delete-area"
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, 'delete')}
            style={{
              width: '160px', height: '54px', background: '#ffeaea', border: '2px dashed #e57373', borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e57373', fontWeight: 'bold', margin: '0 0 0 16px', fontSize: 17
            }}
          >
            拖曳到這裡刪除
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 2px 16px #888', minWidth: 260 }}>
            <div style={{ fontSize: 18, marginBottom: 18 }}>確定要刪除「{pendingDelete?.player}」嗎？</div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button className="join-btn" style={{ background: '#e57373', color: '#fff' }} onClick={() => handleDeleteConfirm(true)}>確定刪除</button>
              <button className="join-btn" style={{ background: '#b6e2b6', color: '#388e3c' }} onClick={() => handleDeleteConfirm(false)}>取消</button>
            </div>
          </div>
        </div>
      )}
      {showNameExists && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 2px 16px #888', minWidth: 260 }}>
            <div style={{ fontSize: 18, marginBottom: 18 }}>「{inputName.trim()}」已經在等候區！</div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button className="join-btn" style={{ background: '#b6e2b6', color: '#388e3c' }} onClick={() => setShowNameExists(false)}>確定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
