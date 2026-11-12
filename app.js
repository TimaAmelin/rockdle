(() => {
  'use strict';
  const stones = window.STONES;
  const images = window.STONE_IMAGES || [];
  const $ = id => document.getElementById(id);
  const columns = [
    ['kind','Тип'],['chemistry','Состав'],['family','Семейство'],
    ['hardness','Твёрдость'],['colors','Цвет'],['transparency','Прозрачность'],['luster','Блеск']
  ];
  const simplify = value => value.toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[^а-яa-z0-9]+/g,' ').trim();
  const byName = new Map(stones.map(stone => [simplify(stone.name),stone]));
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const nowInMoscow = () => {
    const parts = new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const value = Object.fromEntries(parts.map(part => [part.type,part.value]));
    return `${value.year}-${value.month}-${value.day}`;
  };
  const day = nowInMoscow();
  const dayNumber = Math.floor((Date.parse(day+'T00:00:00Z') - Date.parse('2026-01-01T00:00:00Z')) / 86400000) + 1;
  const dailyIndex = ((dayNumber * 73 + 19) % stones.length + stones.length) % stones.length;
  const randomIndex = () => Math.floor(Math.random() * stones.length);
  const storageKey = mode => `rockdle-v1-${mode}-${mode==='daily'?day:'current'}`;
  let mode = 'daily';
  let state;
  let selected = null;

  function readState(nextMode) {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey(nextMode)) || 'null');
      if (stored && Number.isInteger(stored.answer) && stored.answer >= 0 && stored.answer < stones.length && Array.isArray(stored.guesses)) {
        const valid = stored.guesses.filter(id => Number.isInteger(id) && id >= 0 && id < stones.length);
        return {answer:nextMode==='daily'?dailyIndex:stored.answer,guesses:[...new Set(valid)]};
      }
    } catch (_) {}
    return {answer:nextMode==='daily'?dailyIndex:randomIndex(),guesses:[]};
  }
  function save() { try { localStorage.setItem(storageKey(mode),JSON.stringify(state)); } catch (_) {} }
  function status(key, guess, answer) {
    const a = guess[key], b = answer[key];
    if (key === 'hardness') return Math.abs(a-b) < .26 ? 'exact' : Math.abs(a-b) <= 1 ? 'near' : 'miss';
    if (key === 'colors') {
      if (a.length===b.length && a.every(color => b.includes(color))) return 'exact';
      return a.some(color => b.includes(color) || color==='многоцветный' || b.includes('многоцветный')) ? 'near' : 'miss';
    }
    if (a===b) return 'exact';
    if (key==='kind' && ['Минерал','Разновидность'].includes(a) && ['Минерал','Разновидность'].includes(b)) return 'near';
    if (key==='family' && guess.chemistry===answer.chemistry) return 'near';
    if (key==='transparency') {
      const order = ['Непрозрачный','Полупрозрачный','Переменная','Прозрачный'];
      return Math.abs(order.indexOf(a)-order.indexOf(b))<=1 ? 'near' : 'miss';
    }
    if (key==='luster') {
      const clear = ['Стеклянный','Алмазный','Смоляной'];
      const soft = ['Восковой','Перламутровый','Шелковистый','Землистый'];
      if ((clear.includes(a)&&clear.includes(b))||(soft.includes(a)&&soft.includes(b))) return 'near';
    }
    return 'miss';
  }
  function display(key, stone) {
    if (key==='hardness') return String(stone.hardness).replace('.',',');
    if (key==='colors') return stone.colors.join(', ');
    return stone[key];
  }
  function word(n) { const x=n%100, y=n%10; return x>=11&&x<=14?'попыток':y===1?'попытка':y>=2&&y<=4?'попытки':'попыток'; }
  function fallbackUrl(stone) {
    const palette = {красный:'#b63c42',синий:'#3975ad',голубой:'#61a9b4',зелёный:'#3d9367',фиолетовый:'#865eaa',жёлтый:'#c7a143',оранжевый:'#c46d37',розовый:'#bd7b94',чёрный:'#343a3e',белый:'#c9d4cd',бесцветный:'#c0d8d4',коричневый:'#7e5945',серый:'#777d80',золотистый:'#b99548',многоцветный:'#648da0'};
    const color = palette[stone.colors[0]] || '#728d7e';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#17251f"/><path d="M50 4 84 23 94 59 67 91 29 86 6 54 20 20Z" fill="${color}"/><path d="M50 4 50 85 6 54 84 23 29 86 94 59" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2"/><path d="M50 4 84 23 50 85" fill="#fff" opacity=".17"/><path d="M6 54 20 20 50 4 50 85" fill="#000" opacity=".2"/></svg>`;
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }
  function thumb(stone, linked=true) {
    const data = images[stone.id] || {};
    const url = data.url || fallbackUrl(stone);
    const credit = `Фото: ${data.credit || 'Wikimedia Commons'} · ${data.license || 'см. источник'}`;
    const image = `<img src="${escapeHtml(url)}" data-stone-id="${stone.id}" alt="${escapeHtml(stone.name)}" title="${escapeHtml(credit)}" loading="lazy" decoding="async">`;
    return linked ? `<a class="stone-thumb" href="${escapeHtml(data.source || '#')}" target="_blank" rel="noreferrer" title="${escapeHtml(credit)}. Открыть страницу файла">${image}</a>` : image;
  }
  function renderRow(id, number, answer) {
    const guess=stones[id];
    const cells=columns.map(([key,label]) => {
      const s=status(key,guess,answer);
      let arrow='';
      if (key==='hardness' && s!=='exact') arrow=guess.hardness<answer.hardness?' ↑':' ↓';
      const text=s==='exact'?'совпало':s==='near'?'близко':'не совпало';
      return `<div class="trait ${s}" title="${label}: ${escapeHtml(display(key,guess))} — ${text}" aria-label="${label}: ${escapeHtml(display(key,guess))}. ${text}"><span class="trait-label">${label}</span><span class="trait-value">${escapeHtml(display(key,guess))}${arrow}</span></div>`;
    }).join('');
    return `<article class="guess-row"><div class="guess-identity">${thumb(guess)}<div class="guess-name"><strong>${escapeHtml(guess.name)}</strong><small>ПОПЫТКА ${String(number).padStart(2,'0')}</small></div></div><div class="trait-grid">${cells}</div></article>`;
  }
  function renderClues(answer) {
    const n=state.guesses.length;
    const solved=state.guesses.includes(state.answer);
    const stoneClues=window.STONE_CLUES[answer.id];
    const clues=[
      {limit:5,title:'Первый факт',text:stoneClues[0]},
      {limit:10,title:'Следующий след',text:stoneClues[1]},
      {limit:15,title:'Почти разгадка',text:stoneClues[2]}
    ];
    clues.forEach(({limit,title,text:content}) => {
      const node=$('clue'+limit), open=solved || n>=limit;
      node.classList.toggle('unlocked',open);
      node.querySelector('strong').textContent=title;
      node.querySelector('p').textContent=open?content:`Ещё ${limit-n} ${word(limit-n)}`;
    });
  }
  function render() {
    const answer=stones[state.answer];
    const n=state.guesses.length;
    const won=state.guesses.includes(state.answer);
    $('attemptCount').textContent=n;
    $('attemptWord').textContent=word(n);
    $('edition').textContent=mode==='daily'?`КАМЕНЬ ДНЯ · № ${dayNumber}`:'РЕЖИМ ТРЕНИРОВКИ';
    $('dailyMode').classList.toggle('active',mode==='daily');
    $('practiceMode').classList.toggle('active',mode==='practice');
    $('dailyMode').setAttribute('aria-pressed',String(mode==='daily'));
    $('practiceMode').setAttribute('aria-pressed',String(mode==='practice'));
    $('emptyState').hidden=n>0;
    $('resultList').innerHTML=state.guesses.map((id,i)=>renderRow(id,i+1,answer)).join('');
    renderClues(answer);
    const existing=$('winBanner'); if(existing) existing.remove();
    if(won){
      const banner=document.createElement('div'); banner.id='winBanner';banner.className='result-banner';
      banner.innerHTML=`${thumb(answer,false)}<div><strong>Камень найден: ${escapeHtml(answer.name)} ✦</strong><p>За ${n} ${word(n)}. ${mode==='daily'?'Новый камень появится завтра по московскому времени.':'Попробуй следующий камень.'}</p></div>${mode==='practice'?'<button type="button" id="againButton">Играть ещё ↗</button>':''}`;
      $('resultList').before(banner);
      if(mode==='practice') $('againButton').addEventListener('click',newPractice);
    }
    $('guessInput').disabled=won; $('submitGuess').disabled=won;
    $('guessInput').placeholder=won?'Камень найден':'Аметист, малахит, обсидиан…';
    save();
  }
  function setMode(nextMode) {
    if (mode===nextMode) return;
    mode=nextMode;state=readState(mode);selected=null;$('guessInput').value='';$('formMessage').textContent='';hideSuggestions();render();
  }
  function newPractice() {mode='practice';state={answer:randomIndex(),guesses:[]};selected=null;$('guessInput').value='';$('formMessage').textContent='';hideSuggestions();render();$('guessInput').focus();}
  function hideSuggestions() {$('suggestions').hidden=true;$('guessInput').setAttribute('aria-expanded','false');}
  function showSuggestions() {
    if ($('guessInput').disabled) return;
    const term=simplify($('guessInput').value);
    if(!term) {hideSuggestions();return;}
    const matches=stones.filter(stone=>!state.guesses.includes(stone.id) && simplify(stone.name).startsWith(term));
    if(!matches.length){hideSuggestions();return;}
    $('suggestions').innerHTML=matches.map(stone=>`<button class="suggestion" type="button" role="option" data-id="${stone.id}">${thumb(stone,false)}<span>${escapeHtml(stone.name)}</span><small>${escapeHtml(stone.family)}</small></button>`).join('');
    $('suggestions').hidden=false;$('guessInput').setAttribute('aria-expanded','true');
  }
  function choose(id) {selected=stones[id];$('guessInput').value=selected.name;hideSuggestions();$('formMessage').textContent='';$('guessInput').focus();}
  function submit(event) {
    event.preventDefault();
    const input=simplify($('guessInput').value);
    const guess=(selected && simplify(selected.name)===input)?selected:byName.get(input);
    if(!guess){$('formMessage').textContent='Выбери название из каталога 200 камней.';showSuggestions();return;}
    if(state.guesses.includes(guess.id)){$('formMessage').textContent='Этот камень уже есть в истории.';return;}
    state.guesses.push(guess.id);selected=null;$('guessInput').value='';$('formMessage').textContent='';hideSuggestions();render();
  }
  $('guessForm').addEventListener('submit',submit);
  $('guessInput').addEventListener('input',()=>{selected=null;$('formMessage').textContent='';showSuggestions();});
  $('guessInput').addEventListener('focus',showSuggestions);
  $('guessInput').addEventListener('keydown',event=>{if(event.key==='Escape')hideSuggestions();if(event.key==='ArrowDown'&&!$('suggestions').hidden){event.preventDefault();$('suggestions').querySelector('button')?.focus();}});
  $('suggestions').addEventListener('click',event=>{const item=event.target.closest('[data-id]');if(item)choose(Number(item.dataset.id));});
  $('suggestions').addEventListener('keydown',event=>{if(event.key==='Escape'){hideSuggestions();$('guessInput').focus();}if(event.key==='Enter'){event.preventDefault();const item=event.target.closest('[data-id]');if(item)choose(Number(item.dataset.id));}});
  document.addEventListener('click',event=>{if(!event.target.closest('.guess-form'))hideSuggestions();});
  document.addEventListener('error',event=>{if(event.target instanceof HTMLImageElement && event.target.dataset.stoneId && !event.target.dataset.fallback){event.target.dataset.fallback='1';event.target.src=fallbackUrl(stones[Number(event.target.dataset.stoneId)]);}},true);
  $('dailyMode').addEventListener('click',()=>setMode('daily'));
  $('practiceMode').addEventListener('click',()=>setMode('practice'));
  $('helpButton').addEventListener('click',()=>$('helpDialog').showModal());
  $('howButton').addEventListener('click',()=>$('helpDialog').showModal());
  function renderCredits() {
    const term=simplify($('creditSearch').value);
    $('creditsList').innerHTML=stones.filter(stone=>simplify(stone.name).includes(term)).map(stone=>{
      const item=images[stone.id]||{};
      const license=item.licenseUrl?`<a href="${escapeHtml(item.licenseUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.license||'Лицензия')}</a>`:escapeHtml(item.license||'См. источник');
      return `<div class="credit-item"><a href="${escapeHtml(item.source||'#')}" target="_blank" rel="noreferrer">${escapeHtml(stone.name)} ↗</a><span>${escapeHtml(item.credit||'Wikimedia Commons')} · ${license}</span></div>`;
    }).join('');
  }
  $('creditsButton').addEventListener('click',()=>{$('creditSearch').value='';renderCredits();$('creditsDialog').showModal();});
  $('creditSearch').addEventListener('input',renderCredits);
  state=readState(mode);render();
})();
