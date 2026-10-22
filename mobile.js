/* Menu não move os botões existentes nem substitui seus eventos. */
(() => {
 if(window.AJURA_MOBILE)return;
 const header=document.querySelector('header'),nav=header?.querySelector('nav');
 if(!header||!nav||!window.matchMedia)return;
 const media=window.matchMedia('(max-width:760px)'),button=document.createElement('button');
 nav.id=nav.id||'ajuraMainNavigation';nav.setAttribute('aria-label','Navegação principal');
 button.id='ajuraMobileMenu';button.type='button';button.className='ajura-mobile-menu-toggle';button.textContent='Menu';button.setAttribute('aria-controls',nav.id);button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Abrir menu de navegação');header.insertBefore(button,nav);
 document.body.classList.add('ajura-mobile-enhanced');
 const isOpen=()=>document.body.classList.contains('ajura-mobile-menu-open');
 function setOpen(open){document.body.classList.toggle('ajura-mobile-menu-open',Boolean(open&&media.matches));const active=isOpen();button.setAttribute('aria-expanded',String(active));button.setAttribute('aria-label',active?'Fechar menu de navegação':'Abrir menu de navegação');button.textContent=active?'Fechar':'Menu';}
 button.onclick=()=>setOpen(!isOpen());
 nav.addEventListener('click',e=>{if(media.matches&&e.target.closest('button,a'))setOpen(false);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isOpen()){setOpen(false);button.focus();}});
 document.addEventListener('click',e=>{if(isOpen()&&!header.contains(e.target))setOpen(false);});
 function layout(){if(!media.matches)setOpen(false);const viewport=window.visualViewport;document.documentElement.style.setProperty('--ajura-vv-height',`${viewport?.height||window.innerHeight}px`);document.documentElement.style.setProperty('--ajura-vv-top',`${viewport?.offsetTop||0}px`);}
 if(media.addEventListener)media.addEventListener('change',layout);else media.addListener?.(layout);
 window.addEventListener('resize',layout);window.visualViewport?.addEventListener('resize',layout);window.visualViewport?.addEventListener('scroll',layout);layout();
 window.AJURA_MOBILE=Object.freeze({close:()=>setOpen(false)});
})();
